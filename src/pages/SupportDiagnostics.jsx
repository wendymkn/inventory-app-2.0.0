import {
  useEffect,
  useState,
} from "react";

import {
  LifeBuoy,
  FileDown,
  FolderOpen,
  RefreshCw,
  ShieldCheck,
  Database,
} from "lucide-react";

function SupportDiagnostics() {
  const [summary, setSummary] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  async function refresh() {
    if (
      !window.glamstock
        ?.diagnostics
        ?.summary
    ) {
      setMessage(
        "Diagnostics service is unavailable."
      );

      return;
    }

    try {
      const result =
        await window.glamstock
          .diagnostics
          .summary();

      setSummary(result);
    } catch (error) {
      setMessage(
        error?.message ||
        "Could not load diagnostics."
      );
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function exportReport() {
    setBusy(true);
    setMessage("");

    try {
      const result =
        await window.glamstock
          ?.diagnostics
          ?.exportReport?.();

      if (
        result?.cancelled
      ) {
        setMessage(
          "Support report export cancelled."
        );

        return;
      }

      setMessage(
        result?.message ||
        "Support report exported."
      );
    } catch (error) {
      setMessage(
        error?.message ||
        "Could not export the support report."
      );
    } finally {
      setBusy(false);
    }
  }

  async function checkDatabase() {
    setBusy(true);
    setMessage("");

    try {
      const result =
        await window.glamstock
          ?.diagnostics
          ?.databaseHealth?.();

      setMessage(
        result?.success
          ? "Database health check passed."
          : `Database health check failed: ${
              result?.integrity ||
              result?.quickCheck ||
              "unknown result"
            }`
      );

      await refresh();
    } catch (error) {
      setMessage(
        error?.message ||
        "Could not check database health."
      );
    } finally {
      setBusy(false);
    }
  }

  async function optimizeDatabase() {
    const confirmed =
      window.confirm(
        "Optimize the GlamStock database now? This is safe, but avoid doing it while a sale is being completed."
      );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const result =
        await window.glamstock
          ?.diagnostics
          ?.optimizeDatabase?.();

      setMessage(
        result?.message ||
        "Database optimization completed."
      );

      await refresh();
    } catch (error) {
      setMessage(
        error?.message ||
        "Could not optimize the database."
      );
    } finally {
      setBusy(false);
    }
  }

  async function openLogs() {
    try {
      const result =
        await window.glamstock
          ?.diagnostics
          ?.openLogs?.();

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
        "Could not open the log folder."
      );
    }
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            SUPPORT
          </p>

          <h1>
            Support & Diagnostics
          </h1>

          <p>
            Technical information for troubleshooting GlamStock without exposing customer records or passwords.
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
              System Health
            </h2>

            <p>
              Use this page when a client reports a crash, startup problem, or unexpected behavior.
            </p>
          </div>

          <div className="panel-icon">
            <LifeBuoy
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
            Support reports exclude customer lists, passwords, receipt contents, and private license keys.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 22,
          }}
        >
          <button
            type="button"
            className="primary-button"
            disabled={busy}
            onClick={
              exportReport
            }
          >
            <FileDown
              size={18}
            />

            {busy
              ? "Exporting..."
              : "Export Support Report"}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={
              refresh
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
            disabled={busy}
            onClick={
              checkDatabase
            }
          >
            <Database
              size={18}
            />

            Database Check
          </button>

          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={
              optimizeDatabase
            }
          >
            <RefreshCw
              size={18}
            />

            Optimize Database
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={
              openLogs
            }
          >
            <FolderOpen
              size={18}
            />

            Open Log Folder
          </button>
        </div>

        {summary && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <InfoCard
              label="GlamStock Version"
              value={
                summary.app?.version ||
                "Unknown"
              }
            />

            <InfoCard
              label="Environment"
              value={
                summary.app
                  ?.packaged
                  ? "Installed build"
                  : "Development"
              }
            />

            <InfoCard
              label="Windows / OS"
              value={
                summary.system?.os ||
                "Unknown"
              }
            />

            <InfoCard
              label="Architecture"
              value={
                summary.system?.arch ||
                "Unknown"
              }
            />

            <InfoCard
              label="License Status"
              value={
                summary.license
                  ?.status ||
                "Unknown"
              }
            />

            <InfoCard
              label="Database Health"
              value={
                summary.database
                  ?.healthy
                  ? "Healthy"
                  : "Needs attention"
              }
            />

            <InfoCard
              label="Database Size"
              value={
                formatBytes(
                  summary.database
                    ?.sizeBytes
                )
              }
            />

            <InfoCard
              label="Backups Found"
              value={String(
                summary.backup
                  ?.count ??
                0
              )}
            />
          </div>
        )}

        {summary?.recentErrors
          ?.length > 0 && (
          <div
            style={{
              marginTop: 22,
            }}
          >
            <h3>
              Recent Errors
            </h3>

            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {summary.recentErrors
                .slice(-8)
                .reverse()
                .map(
                  (
                    entry,
                    index
                  ) => (
                    <pre
                      key={
                        index
                      }
                      style={{
                        margin: 0,
                        padding: 12,
                        borderRadius: 10,
                        overflow:
                          "auto",
                        whiteSpace:
                          "pre-wrap",
                        wordBreak:
                          "break-word",
                        fontSize: 12,
                      }}
                    >
                      {entry}
                    </pre>
                  )
                )}
            </div>
          </div>
        )}

        {summary?.recentErrors
          ?.length === 0 && (
          <div
            className="inline-info"
            style={{
              marginTop: 22,
            }}
          >
            No recent application errors have been recorded.
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

function formatBytes(value) {
  const bytes =
    Number(value || 0);

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  if (
    bytes <
    1024 * 1024 * 1024
  ) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(2)} GB`;
}

function InfoCard({
  label,
  value,
}) {
  return (
    <div
      className="panel"
      style={{
        padding: 15,
      }}
    >
      <div
        style={{
          fontSize: 12,
          opacity: 0.7,
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      <strong>
        {value}
      </strong>
    </div>
  );
}

export default SupportDiagnostics;
