import {
  useEffect,
  useState,
} from "react";

import {
  KeyRound,
  Copy,
  CheckCircle2,
  Clock3,
} from "lucide-react";

function License() {
  const [licenseStatus, setLicenseStatus] =
    useState(null);

  const [licenseText, setLicenseText] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  async function refreshStatus() {
    if (
      !window.glamstock
        ?.license
        ?.status
    ) {
      setMessage(
        "License service is unavailable. Open GlamStock through the desktop application."
      );

      setLoading(false);
      return null;
    }

    try {
      const result =
        await window.glamstock
          .license
          .status();

      setLicenseStatus(
        result
      );

      return result;
    } catch (error) {
      setMessage(
        error?.message ||
          "Could not read the GlamStock license status."
      );

      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function handleActivate(
    event
  ) {
    event.preventDefault();

    setMessage("");

    if (
      !licenseText.trim()
    ) {
      setMessage(
        "Paste the GlamStock license text first."
      );

      return;
    }

    try {
      const result =
        await window.glamstock
          .license
          .activate(
            licenseText.trim()
          );

      setMessage(
        result?.message ||
          "Activation completed."
      );

      if (result?.success) {
        setLicenseText("");

        const updatedStatus =
          await refreshStatus();

        window.dispatchEvent(
          new CustomEvent(
            "glamstock:license-changed",
            {
              detail:
                updatedStatus ||
                result?.status ||
                null,
            }
          )
        );
      }
    } catch (error) {
      setMessage(
        error?.message ||
          "Activation failed."
      );
    }
  }

  async function copyInstallationId() {
    const installationId =
      licenseStatus
        ?.installationId;

    if (!installationId) {
      return;
    }

    try {
      await navigator
        .clipboard
        .writeText(
          installationId
        );

      setMessage(
        "Installation ID copied."
      );
    } catch {
      setMessage(
        "Could not copy automatically. Select and copy the Installation ID manually."
      );
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="panel narrow-panel">
          Checking GlamStock license...
        </div>
      </div>
    );
  }

  const activated =
    licenseStatus?.status ===
    "activated";

  const trial =
    licenseStatus?.status ===
    "trial";

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            COMMERCIAL LICENSE
          </p>

          <h1>
            GlamStock License
          </h1>

          <p>
            Check the trial and activate this installation.
          </p>
        </div>
      </div>

      <div className="panel narrow-panel">
        <div className="panel-header">
          <div>
            <h2>
              License Status
            </h2>

            <p>
              {activated
                ? "This installation is activated."
                : trial
                ? `${licenseStatus.daysRemaining} day(s) remaining in the free trial.`
                : "The trial has expired and GlamStock is in read-only mode."}
            </p>
          </div>

          <div className="panel-icon">
            {activated ? (
              <CheckCircle2
                size={22}
              />
            ) : trial ? (
              <Clock3
                size={22}
              />
            ) : (
              <KeyRound
                size={22}
              />
            )}
          </div>
        </div>

        <div className="form-group">
          <label>
            Installation ID
          </label>

          <div
            style={{
              display: "flex",
              gap: 10,
            }}
          >
            <input
              value={
                licenseStatus
                  ?.installationId ||
                ""
              }
              readOnly
            />

            <button
              type="button"
              className="secondary-button"
              onClick={
                copyInstallationId
              }
            >
              <Copy size={17} />
              Copy
            </button>
          </div>

          <small>
            Send this Installation ID to the GlamStock seller when purchasing a license.
          </small>
        </div>

        {trial && (
          <div className="inline-info">
            Trial started:{" "}
            <strong>
              {new Date(
                licenseStatus
                  .trialStartedAt
              ).toLocaleDateString()}
            </strong>
            {" · "}
            Expires:{" "}
            <strong>
              {new Date(
                licenseStatus
                  .trialExpiresAt
              ).toLocaleDateString()}
            </strong>
          </div>
        )}

        {activated &&
          licenseStatus
            ?.license && (
            <div
              className="inline-info"
              style={{
                marginTop: 16,
              }}
            >
              <div>
                Licensed to:{" "}
                <strong>
                  {
                    licenseStatus
                      .license
                      .businessName
                  }
                </strong>
              </div>

              <div>
                License type:{" "}
                <strong>
                  {
                    licenseStatus
                      .license
                      .licenseType
                  }
                </strong>
              </div>

              <div>
                Expires:{" "}
                <strong>
                  {licenseStatus
                    .license
                    .expiresAt
                    ? new Date(
                        licenseStatus
                          .license
                          .expiresAt
                      ).toLocaleDateString()
                    : "Never"}
                </strong>
              </div>
            </div>
          )}

        {!activated && (
          <form
            onSubmit={
              handleActivate
            }
            style={{
              marginTop: 22,
            }}
          >
            <div className="form-group">
              <label>
                GlamStock License
              </label>

              <textarea
                rows="8"
                value={
                  licenseText
                }
                onChange={(
                  event
                ) =>
                  setLicenseText(
                    event
                      .target
                      .value
                  )
                }
                placeholder='Paste the complete license JSON here'
              />
            </div>

            <button
              type="submit"
              className="primary-button"
            >
              <KeyRound
                size={18}
              />

              Activate GlamStock
            </button>
          </form>
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

export default License;
