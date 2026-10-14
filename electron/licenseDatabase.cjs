const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const {
  execFileSync,
} = require("child_process");

const Database =
  require("better-sqlite3");

const TRIAL_DAYS = 14;

const DAY =
  24 * 60 * 60 * 1000;

const CLOCK_ROLLBACK_TOLERANCE =
  6 * 60 * 60 * 1000;

const REGISTRY_PATH =
  "HKCU\\Software\\GlamStock";

const text = (value) =>
  String(value ?? "").trim();

const canonicalize = (
  value
) => {
  if (Array.isArray(value)) {
    return value.map(
      canonicalize
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.keys(value)
      .sort()
      .reduce(
        (result, key) => {
          result[key] =
            canonicalize(
              value[key]
            );

          return result;
        },
        {}
      );
  }

  return value;
};

const stableStringify = (
  value
) =>
  JSON.stringify(
    canonicalize(value)
  );

const validDate = (
  value
) => {
  const parsed =
    Date.parse(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
};

const readRegistryValue = (
  registryPath,
  name
) => {
  if (
    process.platform !==
    "win32"
  ) {
    return null;
  }

  try {
    const output =
      execFileSync(
        "reg.exe",
        [
          "query",
          registryPath,
          "/v",
          name,
        ],
        {
          encoding: "utf8",
          windowsHide: true,
        }
      );

    const line =
      output
        .split(/\r?\n/)
        .find(
          (entry) =>
            entry
              .toLowerCase()
              .includes(
                name.toLowerCase()
              )
        );

    if (!line) {
      return null;
    }

    const parts =
      line
        .trim()
        .split(/\s{2,}/);

    return (
      parts[2] ||
      null
    );
  } catch {
    return null;
  }
};

const writeRegistryValue = (
  name,
  value
) => {
  if (
    process.platform !==
    "win32"
  ) {
    return;
  }

  try {
    execFileSync(
      "reg.exe",
      [
        "add",
        REGISTRY_PATH,
        "/v",
        name,
        "/t",
        "REG_SZ",
        "/d",
        String(value),
        "/f",
      ],
      {
        windowsHide: true,
        stdio: "ignore",
      }
    );
  } catch {
    // Registry copy is best effort.
  }
};

const readMachineGuid = () => {
  if (
    process.platform ===
    "win32"
  ) {
    const guid =
      readRegistryValue(
        "HKLM\\SOFTWARE\\Microsoft\\Cryptography",
        "MachineGuid"
      );

    if (guid) {
      return guid;
    }
  }

  return [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.homedir(),
  ].join("|");
};

const createInstallationId =
  () => {
    const machineGuid =
      readMachineGuid();

    const hash =
      crypto
        .createHash("sha256")
        .update(
          `GlamStock-v1|${machineGuid}`
        )
        .digest("hex")
        .toUpperCase();

    return (
      "GS-PC-" +
      hash.slice(0, 16)
    );
  };

function createLicenseDatabase(
  userDataPath
) {
  const databasePath =
    path.join(
      userDataPath,
      "data",
      "glamstock.db"
    );

  const publicKeyPath =
    path.join(
      __dirname,
      "license-public.pem"
    );

  if (
    !fs.existsSync(
      publicKeyPath
    )
  ) {
    throw new Error(
      "GlamStock license public key is missing."
    );
  }

  const publicKey =
    fs.readFileSync(
      publicKeyPath,
      "utf8"
    );

  const installationId =
    createInstallationId();

  const db =
    new Database(
      databasePath
    );

  db.pragma(
    "journal_mode = WAL"
  );

  db.pragma(
    "busy_timeout = 5000"
  );

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

  const programDataDirectory =
    path.join(
      process.env.ProgramData ||
        userDataPath,
      "GlamStock"
    );

  const markerPath =
    path.join(
      programDataDirectory,
      "trial-state.json"
    );

  const readProgramDataMarker =
    () => {
      try {
        if (
          !fs.existsSync(
            markerPath
          )
        ) {
          return null;
        }

        return JSON.parse(
          fs.readFileSync(
            markerPath,
            "utf8"
          )
        );
      } catch {
        return null;
      }
    };

  const writeProgramDataMarker =
    (data) => {
      try {
        fs.mkdirSync(
          programDataDirectory,
          {
            recursive: true,
          }
        );

        fs.writeFileSync(
          markerPath,

          JSON.stringify(
            data,
            null,
            2
          ),

          "utf8"
        );
      } catch {
        // Best effort.
      }
    };

  const readState = () =>
    db.prepare(`
      SELECT *
      FROM license_state

      WHERE id = 1
    `).get();

  const writeState = ({
    trialStartedAt,
    lastSeenAt,
    licenseJson = null,
    activatedAt = null,
  }) => {
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
      installationId,
      trialStartedAt,
      lastSeenAt,
      licenseJson,
      activatedAt
    );
  };

  const verifyLicenseObject =
    (licenseObject) => {
      try {
        if (
          !licenseObject ||
          typeof licenseObject !==
            "object"
        ) {
          return {
            valid: false,
            reason:
              "Invalid license file.",
          };
        }

        const payload =
          licenseObject.payload;

        const signature =
          text(
            licenseObject.signature
          );

        if (
          !payload ||
          !signature
        ) {
          return {
            valid: false,
            reason:
              "License file is incomplete.",
          };
        }

        const signatureValid =
          crypto.verify(
            null,

            Buffer.from(
              stableStringify(
                payload
              )
            ),

            publicKey,

            Buffer.from(
              signature,
              "base64"
            )
          );

        if (
          !signatureValid
        ) {
          return {
            valid: false,
            reason:
              "License signature is invalid.",
          };
        }

        if (
          payload.product !==
          "GlamStock"
        ) {
          return {
            valid: false,
            reason:
              "This license is not for GlamStock.",
          };
        }

        if (
          Number(
            payload.licenseVersion
          ) !== 1
        ) {
          return {
            valid: false,
            reason:
              "Unsupported license version.",
          };
        }

        if (
          payload.installationId !==
          installationId
        ) {
          return {
            valid: false,
            reason:
              "This license belongs to another computer.",
          };
        }

        if (
          payload.expiresAt
        ) {
          const expiresAt =
            validDate(
              payload.expiresAt
            );

          if (!expiresAt) {
            return {
              valid: false,
              reason:
                "License expiry date is invalid.",
            };
          }

          if (
            Date.now() >
            expiresAt
          ) {
            return {
              valid: false,
              reason:
                "This GlamStock license has expired.",
            };
          }
        }

        return {
          valid: true,
          payload,
        };
      } catch {
        return {
          valid: false,
          reason:
            "Could not verify license.",
        };
      }
    };

  const readStoredLicense =
    (state) => {
      if (
        !state ||
        state.installation_id !==
          installationId ||
        !state.license_json
      ) {
        return null;
      }

      try {
        return JSON.parse(
          state.license_json
        );
      } catch {
        return null;
      }
    };

  const reconcileTrial =
    () => {
      const now =
        Date.now();

      const dbState =
        readState();

      const marker =
        readProgramDataMarker();

      const registryInstallation =
        readRegistryValue(
          REGISTRY_PATH,
          "InstallationId"
        );

      const registryStart =
        readRegistryValue(
          REGISTRY_PATH,
          "TrialStartedAt"
        );

      const registryLastSeen =
        readRegistryValue(
          REGISTRY_PATH,
          "LastSeenAt"
        );

      const starts = [];
      const lastSeenValues = [];

      if (
        dbState?.installation_id ===
        installationId
      ) {
        const start =
          validDate(
            dbState
              .trial_started_at
          );

        const last =
          validDate(
            dbState
              .last_seen_at
          );

        if (start) {
          starts.push(start);
        }

        if (last) {
          lastSeenValues.push(
            last
          );
        }
      }

      if (
        !registryInstallation ||
        registryInstallation ===
          installationId
      ) {
        const start =
          validDate(
            registryStart
          );

        const last =
          validDate(
            registryLastSeen
          );

        if (start) {
          starts.push(start);
        }

        if (last) {
          lastSeenValues.push(
            last
          );
        }
      }

      if (
        marker?.installationId ===
        installationId
      ) {
        const start =
          validDate(
            marker
              .trialStartedAt
          );

        const last =
          validDate(
            marker
              .lastSeenAt
          );

        if (start) {
          starts.push(start);
        }

        if (last) {
          lastSeenValues.push(
            last
          );
        }
      }

      const trialStartedMs =
        starts.length
          ? Math.min(
              ...starts
            )
          : now;

      const previousLastSeen =
        lastSeenValues.length
          ? Math.max(
              ...lastSeenValues
            )
          : now;

      const clockRollbackDetected =
        now +
          CLOCK_ROLLBACK_TOLERANCE <
        previousLastSeen;

      const savedLastSeen =
        clockRollbackDetected
          ? previousLastSeen
          : Math.max(
              now,
              previousLastSeen
            );

      const trialStartedAt =
        new Date(
          trialStartedMs
        ).toISOString();

      const lastSeenAt =
        new Date(
          savedLastSeen
        ).toISOString();

      const existingLicense =
        dbState?.installation_id ===
          installationId
          ? dbState.license_json
          : null;

      const activatedAt =
        dbState?.installation_id ===
          installationId
          ? dbState.activated_at
          : null;

      writeState({
        trialStartedAt,
        lastSeenAt,
        licenseJson:
          existingLicense,
        activatedAt,
      });

      writeRegistryValue(
        "InstallationId",
        installationId
      );

      writeRegistryValue(
        "TrialStartedAt",
        trialStartedAt
      );

      writeRegistryValue(
        "LastSeenAt",
        lastSeenAt
      );

      writeProgramDataMarker({
        installationId,
        trialStartedAt,
        lastSeenAt,
      });

      return {
        trialStartedAt,
        lastSeenAt,
        clockRollbackDetected,
      };
    };

  const getStatus = () => {
    const trial =
      reconcileTrial();

    const state =
      readState();

    const storedLicense =
      readStoredLicense(
        state
      );

    if (storedLicense) {
      const verification =
        verifyLicenseObject(
          storedLicense
        );

      if (
        verification.valid
      ) {
        const payload =
          verification.payload;

        return {
          status:
            "activated",

          operational:
            true,

          installationId,

          license: {
            licenseId:
              payload.licenseId,

            businessName:
              payload.businessName,

            licenseType:
              payload.licenseType,

            issuedAt:
              payload.issuedAt,

            expiresAt:
              payload.expiresAt ||
              null,
          },

          daysRemaining:
            null,

          trialStartedAt:
            trial.trialStartedAt,

          trialExpiresAt:
            new Date(
              Date.parse(
                trial.trialStartedAt
              ) +
                TRIAL_DAYS *
                  DAY
            ).toISOString(),

          clockRollbackDetected:
            false,
        };
      }
    }

    const trialStartedMs =
      Date.parse(
        trial.trialStartedAt
      );

    const trialExpiresMs =
      trialStartedMs +
      TRIAL_DAYS *
        DAY;

    const remaining =
      trialExpiresMs -
      Date.now();

    const daysRemaining =
      Math.max(
        0,

        Math.ceil(
          remaining /
            DAY
        )
      );

    const expired =
      remaining <= 0 ||
      trial
        .clockRollbackDetected;

    return {
      status:
        expired
          ? "expired"
          : "trial",

      operational:
        !expired,

      installationId,

      trialStartedAt:
        trial.trialStartedAt,

      trialExpiresAt:
        new Date(
          trialExpiresMs
        ).toISOString(),

      daysRemaining,

      clockRollbackDetected:
        trial
          .clockRollbackDetected,

      license:
        null,
    };
  };

  const activate = (
    rawLicense
  ) => {
    let licenseObject;

    try {
      if (
        typeof rawLicense ===
        "string"
      ) {
        const cleaned =
          rawLicense
            .replace(
              /^\uFEFF/,
              ""
            )
            .trim();

        licenseObject =
          JSON.parse(
            cleaned
          );
      } else {
        licenseObject =
          rawLicense;
      }
    } catch {
      return {
        success: false,
        message:
          "The selected license file is not valid.",
      };
    }

    const verification =
      verifyLicenseObject(
        licenseObject
      );

    if (
      !verification.valid
    ) {
      return {
        success: false,
        message:
          verification.reason,
      };
    }

    const trial =
      reconcileTrial();

    const now =
      new Date()
        .toISOString();

    writeState({
      trialStartedAt:
        trial.trialStartedAt,

      lastSeenAt:
        now,

      licenseJson:
        JSON.stringify(
          licenseObject
        ),

      activatedAt:
        now,
    });

    return {
      success: true,

      message:
        "GlamStock activated successfully.",

      status:
        getStatus(),
    };
  };

  const assertOperational =
    () => {
      const status =
        getStatus();

      if (
        !status.operational
      ) {
        throw new Error(
          "GlamStock trial has expired. Activate this installation to continue."
        );
      }

      return status;
    };

  reconcileTrial();

  return {
    getStatus,
    activate,
    assertOperational,

    close() {
      if (db.open) {
        db.close();
      }
    },
  };
}

module.exports = {
  createLicenseDatabase,
};