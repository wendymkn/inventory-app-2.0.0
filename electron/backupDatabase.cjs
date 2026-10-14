const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

function timestampForFile() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}

function createBackupDatabase(userDataPath) {
  const dataDirectory = path.join(
    userDataPath,
    "data"
  );

  const databasePath = path.join(
    dataDirectory,
    "glamstock.db"
  );

  const backupDirectory = path.join(
    userDataPath,
    "backups"
  );

  fs.mkdirSync(
    backupDirectory,
    {
      recursive: true,
    }
  );

  function ensureSourceExists() {
    if (
      !fs.existsSync(
        databasePath
      )
    ) {
      throw new Error(
        "GlamStock database was not found."
      );
    }
  }

  function verifyBackupFile(
    filePath
  ) {
    if (
      !filePath ||
      !fs.existsSync(
        filePath
      )
    ) {
      return {
        valid: false,
        message:
          "The selected backup file does not exist.",
      };
    }

    if (
      path.resolve(filePath) ===
      path.resolve(databasePath)
    ) {
      return {
        valid: false,
        message:
          "The live GlamStock database cannot be used as a restore backup.",
      };
    }

    let db = null;

    try {
      db = new Database(
        filePath,
        {
          readonly: true,
          fileMustExist: true,
        }
      );

      const integrity =
        db.pragma(
          "integrity_check",
          {
            simple: true,
          }
        );

      if (
        integrity !== "ok"
      ) {
        return {
          valid: false,
          message:
            "SQLite integrity check failed.",
        };
      }

      const tables =
        db.prepare(`
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
        `).all();

      const tableNames =
        new Set(
          tables.map(
            (table) =>
              table.name
          )
        );

      const hasGlamStockTables =
        [
          "products",
          "business_settings",
          "users",
          "transactions",
          "license_state",
        ].some(
          (tableName) =>
            tableNames.has(
              tableName
            )
        );

      if (
        !hasGlamStockTables
      ) {
        return {
          valid: false,
          message:
            "This SQLite file does not appear to be a GlamStock backup.",
        };
      }

      return {
        valid: true,
        message:
          "Backup verified successfully.",
      };
    } catch (error) {
      return {
        valid: false,
        message:
          error?.message ||
          "The selected file is not a valid SQLite backup.",
      };
    } finally {
      if (
        db &&
        db.open
      ) {
        db.close();
      }
    }
  }

  async function createBackup(
    destinationPath
  ) {
    ensureSourceExists();

    if (!destinationPath) {
      throw new Error(
        "Backup destination is required."
      );
    }

    fs.mkdirSync(
      path.dirname(
        destinationPath
      ),
      {
        recursive: true,
      }
    );

    const source =
      new Database(
        databasePath,
        {
          fileMustExist: true,
        }
      );

    try {
      source.pragma(
        "busy_timeout = 5000"
      );

      await source.backup(
        destinationPath
      );
    } finally {
      if (source.open) {
        source.close();
      }
    }

    const verification =
      verifyBackupFile(
        destinationPath
      );

    if (
      !verification.valid
    ) {
      try {
        fs.unlinkSync(
          destinationPath
        );
      } catch {
        // Best effort cleanup.
      }

      throw new Error(
        verification.message
      );
    }

    return {
      success: true,
      path: destinationPath,
      fileName:
        path.basename(
          destinationPath
        ),
      message:
        "GlamStock backup created successfully.",
    };
  }

  async function createAutomaticBackup() {
    const destinationPath =
      path.join(
        backupDirectory,
        `GlamStock-Backup-${timestampForFile()}.glamstock.db`
      );

    return createBackup(
      destinationPath
    );
  }

  function listAutomaticBackupPaths() {
    fs.mkdirSync(
      backupDirectory,
      {
        recursive: true,
      }
    );

    return fs
      .readdirSync(
        backupDirectory,
        {
          withFileTypes: true,
        }
      )
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name
            .startsWith(
              "GlamStock-Auto-Backup-"
            ) &&
          entry.name
            .toLowerCase()
            .endsWith(
              ".glamstock.db"
            )
      )
      .map(
        (entry) => {
          const fullPath =
            path.join(
              backupDirectory,
              entry.name
            );

          const stat =
            fs.statSync(
              fullPath
            );

          return {
            fullPath,
            name:
              entry.name,
            modifiedAt:
              stat.mtimeMs,
          };
        }
      )
      .sort(
        (a, b) =>
          b.modifiedAt -
          a.modifiedAt
      );
  }

  function pruneAutomaticBackups(
    keep = 30
  ) {
    const safeKeep =
      Math.max(
        7,
        Math.min(
          120,
          Number(keep) ||
            30
        )
      );

    const backups =
      listAutomaticBackupPaths();

    for (
      const backup
      of backups.slice(
        safeKeep
      )
    ) {
      try {
        fs.unlinkSync(
          backup.fullPath
        );
      } catch {
        // Best-effort cleanup only.
      }
    }

    return {
      kept:
        Math.min(
          backups.length,
          safeKeep
        ),
      removed:
        Math.max(
          0,
          backups.length -
            safeKeep
        ),
    };
  }

  async function createScheduledBackupIfDue(
    {
      minimumHours = 24,
      keep = 30,
    } = {}
  ) {
    ensureSourceExists();

    const backups =
      listAutomaticBackupPaths();

    const newest =
      backups[0];

    const minimumAgeMs =
      Math.max(
        1,
        Number(
          minimumHours
        ) || 24
      ) *
      60 *
      60 *
      1000;

    if (
      newest &&
      Date.now() -
        newest.modifiedAt <
        minimumAgeMs
    ) {
      pruneAutomaticBackups(
        keep
      );

      return {
        success: true,
        skipped: true,
        message:
          "Automatic backup is not due yet.",
      };
    }

    const destinationPath =
      path.join(
        backupDirectory,
        `GlamStock-Auto-Backup-${timestampForFile()}.glamstock.db`
      );

    const result =
      await createBackup(
        destinationPath
      );

    pruneAutomaticBackups(
      keep
    );

    return {
      ...result,
      automatic: true,
    };
  }

  async function createEmergencyBackup() {
    const destinationPath =
      path.join(
        backupDirectory,
        `before-restore-${timestampForFile()}.glamstock.db`
      );

    return createBackup(
      destinationPath
    );
  }

  function listBackups() {
    fs.mkdirSync(
      backupDirectory,
      {
        recursive: true,
      }
    );

    return fs
      .readdirSync(
        backupDirectory,
        {
          withFileTypes: true,
        }
      )
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name
            .toLowerCase()
            .endsWith(
              ".glamstock.db"
            )
      )
      .map(
        (entry) => {
          const fullPath =
            path.join(
              backupDirectory,
              entry.name
            );

          const stat =
            fs.statSync(
              fullPath
            );

          return {
            fileName:
              entry.name,

            kind:
              entry.name
                .startsWith(
                  "before-restore-"
                )
                ? "emergency"
                : entry.name
                    .startsWith(
                      "GlamStock-Auto-Backup-"
                    )
                  ? "automatic"
                  : "manual",

            sizeBytes:
              stat.size,

            modifiedAt:
              stat.mtime
                .toISOString(),

            createdAt:
              stat.birthtime
                .toISOString(),
          };
        }
      )
      .sort(
        (a, b) =>
          Date.parse(
            b.modifiedAt
          ) -
          Date.parse(
            a.modifiedAt
          )
      );
  }

  function resolveSavedBackup(
    fileName
  ) {
    const safeName =
      path.basename(
        String(
          fileName ||
          ""
        )
      );

    if (
      !safeName ||
      safeName !==
        String(
          fileName ||
          ""
        )
    ) {
      throw new Error(
        "Invalid backup file name."
      );
    }

    const resolved =
      path.resolve(
        backupDirectory,
        safeName
      );

    const backupRoot =
      path.resolve(
        backupDirectory
      );

    if (
      path.dirname(
        resolved
      ) !==
      backupRoot
    ) {
      throw new Error(
        "Invalid backup location."
      );
    }

    if (
      !fs.existsSync(
        resolved
      )
    ) {
      throw new Error(
        "The selected saved backup no longer exists."
      );
    }

    return resolved;
  }

  function captureLicenseState() {
    ensureSourceExists();

    const db =
      new Database(
        databasePath,
        {
          readonly: true,
          fileMustExist: true,
        }
      );

    try {
      const table =
        db.prepare(`
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name = 'license_state'
        `).get();

      if (!table) {
        return null;
      }

      return (
        db.prepare(`
          SELECT *
          FROM license_state
          WHERE id = 1
        `).get() ||
        null
      );
    } finally {
      if (db.open) {
        db.close();
      }
    }
  }

  function restoreLicenseState(
    preservedLicenseState
  ) {
    if (
      !preservedLicenseState
    ) {
      return;
    }

    const db =
      new Database(
        databasePath,
        {
          fileMustExist: true,
        }
      );

    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS license_state (
          id INTEGER PRIMARY KEY
            CHECK (id = 1),

          installation_id TEXT NOT NULL,

          trial_started_at TEXT NOT NULL,

          last_seen_at TEXT NOT NULL,

          license_json TEXT,

          activated_at TEXT,

          updated_at TEXT NOT NULL
            DEFAULT CURRENT_TIMESTAMP
        );
      `);

      db.prepare(`
        INSERT INTO license_state (
          id,
          installation_id,
          trial_started_at,
          last_seen_at,
          license_json,
          activated_at,
          updated_at
        )

        VALUES (
          1,
          ?,
          ?,
          ?,
          ?,
          ?,
          CURRENT_TIMESTAMP
        )

        ON CONFLICT(id)

        DO UPDATE SET
          installation_id =
            excluded.installation_id,

          trial_started_at =
            excluded.trial_started_at,

          last_seen_at =
            excluded.last_seen_at,

          license_json =
            excluded.license_json,

          activated_at =
            excluded.activated_at,

          updated_at =
            CURRENT_TIMESTAMP
      `).run(
        preservedLicenseState
          .installation_id,

        preservedLicenseState
          .trial_started_at,

        preservedLicenseState
          .last_seen_at,

        preservedLicenseState
          .license_json,

        preservedLicenseState
          .activated_at
      );
    } finally {
      if (db.open) {
        db.close();
      }
    }
  }

  function restoreBackup(
    sourcePath,
    preservedLicenseState = null
  ) {
    const verification =
      verifyBackupFile(
        sourcePath
      );

    if (
      !verification.valid
    ) {
      throw new Error(
        verification.message
      );
    }

    fs.mkdirSync(
      dataDirectory,
      {
        recursive: true,
      }
    );

    for (
      const suffix of
      ["-wal", "-shm"]
    ) {
      const companion =
        `${databasePath}${suffix}`;

      try {
        if (
          fs.existsSync(
            companion
          )
        ) {
          fs.unlinkSync(
            companion
          );
        }
      } catch {
        // Database services should already be closed.
      }
    }

    fs.copyFileSync(
      sourcePath,
      databasePath
    );

    restoreLicenseState(
      preservedLicenseState
    );

    const finalCheck =
      verifyLiveDatabase();

    if (
      !finalCheck.valid
    ) {
      throw new Error(
        "Restore completed, but the restored database failed verification."
      );
    }

    return {
      success: true,
      message:
        "Backup restored successfully. GlamStock will restart.",
    };
  }

  function verifyLiveDatabase() {
    let db = null;

    try {
      db = new Database(
        databasePath,
        {
          readonly: true,
          fileMustExist: true,
        }
      );

      const integrity =
        db.pragma(
          "integrity_check",
          {
            simple: true,
          }
        );

      return {
        valid:
          integrity === "ok",

        message:
          integrity === "ok"
            ? "Database verified successfully."
            : "Database integrity check failed.",
      };
    } catch (error) {
      return {
        valid: false,
        message:
          error?.message ||
          "Could not verify the restored database.",
      };
    } finally {
      if (
        db &&
        db.open
      ) {
        db.close();
      }
    }
  }

  function getInfo() {
    return {
      databasePath,
      backupDirectory,
    };
  }

  return {
    createBackup,
    createAutomaticBackup,
    createScheduledBackupIfDue,
    pruneAutomaticBackups,
    createEmergencyBackup,
    listBackups,
    resolveSavedBackup,
    captureLicenseState,
    restoreBackup,
    verifyBackupFile,
    getInfo,
  };
}

module.exports = {
  createBackupDatabase,
};
