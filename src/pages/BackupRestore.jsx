import {
  useEffect,
  useState,
} from "react";

import {
  DatabaseBackup,
  RotateCcw,
  ShieldCheck,
  FolderOpen,
  RefreshCw,
  HardDriveDownload,
  Clock3,
} from "lucide-react";

function formatBytes(
  bytes
) {
  const value =
    Number(bytes) || 0;

  if (value < 1024) {
    return `${value} B`;
  }

  if (
    value <
    1024 * 1024
  ) {
    return `${(
      value / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

function formatDate(
  value
) {
  if (!value) {
    return "Unknown date";
  }

  return new Date(
    value
  ).toLocaleString();
}

function BackupRestore() {
  const [info, setInfo] =
    useState(null);

  const [backups, setBackups] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [
    busyAction,
    setBusyAction,
  ] = useState("");

  async function refreshBackups() {
    if (
      !window.glamstock
        ?.backup
        ?.list
    ) {
      return;
    }

    try {
      const result =
        await window.glamstock
          .backup
          .list();

      setBackups(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (error) {
      setMessage(
        error?.message ||
        "Could not load backups."
      );
    }
  }

  useEffect(() => {
    async function load() {
      try {
        if (
          window.glamstock
            ?.backup
            ?.info
        ) {
          const result =
            await window.glamstock
              .backup
              .info();

          setInfo(result);
        }

        await refreshBackups();
      } catch (error) {
        console.error(
          "Could not load backup page:",
          error
        );
      }
    }

    load();
  }, []);

  async function handleBackup() {
    if (
      !window.glamstock
        ?.backup
        ?.create
    ) {
      setMessage(
        "Backup service is unavailable."
      );

      return;
    }

    setBusyAction(
      "create"
    );

    setMessage("");

    try {
      const result =
        await window.glamstock
          .backup
          .create();

      setMessage(
        result?.fileName
          ? `Backup created: ${result.fileName}`
          : result?.message ||
            "Backup created successfully."
      );

      await refreshBackups();
    } catch (error) {
      setMessage(
        error?.message ||
        "Backup failed."
      );
    } finally {
      setBusyAction("");
    }
  }

  async function restoreSavedBackup(
    backup
  ) {
    if (
      !window.glamstock
        ?.backup
        ?.restoreSaved
    ) {
      setMessage(
        "Restore service is unavailable."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Restore this GlamStock backup?\n\n` +
        `${backup.fileName}\n` +
        `${formatDate(backup.modifiedAt)}\n\n` +
        "GlamStock will automatically protect the current database first, then restart."
      );

    if (!confirmed) {
      return;
    }

    setBusyAction(
      backup.fileName
    );

    setMessage("");

    try {
      await window.glamstock
        .backup
        .restoreSaved(
          backup.fileName
        );
    } catch (error) {
      setMessage(
        error?.message ||
        "Restore failed."
      );

      setBusyAction("");
    }
  }

  async function handleExternalRestore() {
    if (
      !window.glamstock
        ?.backup
        ?.restoreExternal
    ) {
      setMessage(
        "External restore service is unavailable."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Choose a GlamStock backup from another folder?\n\n" +
        "The current database will be protected automatically before restore."
      );

    if (!confirmed) {
      return;
    }

    setBusyAction(
      "external"
    );

    setMessage("");

    try {
      const result =
        await window.glamstock
          .backup
          .restoreExternal();

      if (
        result?.cancelled
      ) {
        setMessage(
          "External restore cancelled."
        );

        setBusyAction("");
      }
    } catch (error) {
      setMessage(
        error?.message ||
        "External restore failed."
      );

      setBusyAction("");
    }
  }

  async function handleOpenFolder() {
    try {
      const result =
        await window.glamstock
          ?.backup
          ?.openFolder?.();

      if (
        result?.message
      ) {
        setMessage(
          result.message
        );
      }
    } catch (error) {
      setMessage(
        error?.message ||
        "Could not open the backup folder."
      );
    }
  }

  const isBusy =
    Boolean(
      busyAction
    );

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            DATA PROTECTION
          </p>

          <h1>
            Backup & Restore
          </h1>

          <p>
            Create backups and restore previous GlamStock data without browsing through system folders.
          </p>
        </div>
      </div>

      <div
        className="panel"
        style={{
          maxWidth: 900,
        }}
      >
        <div className="panel-header">
          <div>
            <h2>
              Database Protection
            </h2>

            <p>
              GlamStock verifies every backup and automatically protects the current database before a restore.
            </p>
          </div>

          <div className="panel-icon">
            <DatabaseBackup
              size={23}
            />
          </div>
        </div>

        <div
          className="inline-info"
          style={{
            marginBottom: 20,
          }}
        >
          <ShieldCheck
            size={18}
          />

          <span>
            Restoring business data will not roll back the current GlamStock activation or trial state.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            className="primary-button"
            disabled={isBusy}
            onClick={
              handleBackup
            }
          >
            <DatabaseBackup
              size={18}
            />

            {busyAction ===
            "create"
              ? "Creating..."
              : "Create Backup"}
          </button>

          <button
            type="button"
            className="secondary-button"
            disabled={isBusy}
            onClick={
              refreshBackups
            }
          >
            <RefreshCw
              size={18}
            />

            Refresh
          </button>

          <button
            type="button"
            className="secondary-button"
            disabled={isBusy}
            onClick={
              handleOpenFolder
            }
          >
            <FolderOpen
              size={18}
            />

            Open Backup Folder
          </button>

          <button
            type="button"
            className="secondary-button"
            disabled={isBusy}
            onClick={
              handleExternalRestore
            }
          >
            <HardDriveDownload
              size={18}
            />

            Restore External Backup
          </button>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                }}
              >
                Available Backups
              </h3>

              <p
                style={{
                  margin:
                    "5px 0 0",
                }}
              >
                Newest backups appear first.
              </p>
            </div>

            <strong>
              {backups.length}
            </strong>
          </div>

          {backups.length ===
          0 ? (
            <div className="empty-state">
              <DatabaseBackup
                size={28}
              />

              <h3>
                No backups yet
              </h3>

              <p>
                Click Create Backup to make the first protected copy of the GlamStock database.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {backups.map(
                (backup) => (
                  <div
                    key={
                      backup.fileName
                    }
                    className="panel"
                    style={{
                      display:
                        "flex",
                      gap: 16,
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 12,
                        minWidth: 0,
                      }}
                    >
                      <div className="panel-icon">
                        <Clock3
                          size={19}
                        />
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <strong
                          style={{
                            display:
                              "block",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            backup.fileName
                          }
                        </strong>

                        <div
                          style={{
                            marginTop: 4,
                            opacity: 0.75,
                            fontSize: 13,
                          }}
                        >
                          {formatDate(
                            backup.modifiedAt
                          )}
                          {" · "}
                          {formatBytes(
                            backup.sizeBytes
                          )}
                          {" · "}
                          {backup.kind ===
                          "emergency"
                            ? "Emergency backup"
                            : "Manual backup"}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      disabled={
                        isBusy
                      }
                      onClick={() =>
                        restoreSavedBackup(
                          backup
                        )
                      }
                    >
                      <RotateCcw
                        size={17}
                      />

                      {busyAction ===
                      backup.fileName
                        ? "Restoring..."
                        : "Restore"}
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {info?.backupDirectory && (
          <div
            className="inline-info"
            style={{
              marginTop: 20,
            }}
          >
            Backup location:{" "}
            <strong>
              {
                info.backupDirectory
              }
            </strong>
          </div>
        )}

        {message && (
          <div
            className="inline-info"
            style={{
              marginTop: 18,
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default BackupRestore;
