import {
  useEffect,
  useState,
} from "react";

import {
  ShieldCheck,
  KeyRound,
  Copy,
  Upload,
  LockKeyhole,
} from "lucide-react";

import useLicenseStore
  from "../store/licenseStore";

function LicenseGate({
  children,
}) {
  const status =
    useLicenseStore(
      (state) =>
        state.status
    );

  const loading =
    useLicenseStore(
      (state) =>
        state.loading
    );

  const error =
    useLicenseStore(
      (state) =>
        state.error
    );

  const refresh =
    useLicenseStore(
      (state) =>
        state.refresh
    );

  const activate =
    useLicenseStore(
      (state) =>
        state.activate
    );

  const [
    licenseText,
    setLicenseText,
  ] = useState("");

  const [
    activating,
    setActivating,
  ] = useState(false);

  const [
    activationError,
    setActivationError,
  ] = useState("");

  useEffect(() => {
    refresh();

    const interval =
      window.setInterval(
        () => {
          refresh();
        },

        5 * 60 * 1000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [refresh]);

  const copyInstallationId =
    async () => {
      if (
        !status
          ?.installationId
      ) {
        return;
      }

      try {
        await navigator
          .clipboard
          .writeText(
            status
              .installationId
          );

        alert(
          "Installation ID copied."
        );
      } catch {
        alert(
          status
            .installationId
        );
      }
    };

  const handleFile =
    (event) => {
      const file =
        event.target
          .files?.[0];

      if (!file) {
        return;
      }

      const reader =
        new FileReader();

      reader.onload = () => {
        setLicenseText(
          String(
            reader.result ||
              ""
          )
        );

        setActivationError(
          ""
        );
      };

      reader.readAsText(
        file
      );
    };

  const handleActivate =
    async () => {
      if (
        !licenseText.trim()
      ) {
        setActivationError(
          "Select a GlamStock license file first."
        );

        return;
      }

      setActivating(
        true
      );

      setActivationError(
        ""
      );

      const result =
        await activate(
          licenseText
        );

      setActivating(
        false
      );

      if (
        !result?.success
      ) {
        setActivationError(
          result?.message ||
            "Activation failed."
        );

        return;
      }

      alert(
        "GlamStock activated successfully."
      );

      setLicenseText(
        ""
      );
    };

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            "100vh",

          display:
            "grid",

          placeItems:
            "center",
        }}
      >
        <div>
          Verifying GlamStock...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight:
            "100vh",

          display:
            "grid",

          placeItems:
            "center",

          padding:
            "32px",
        }}
      >
        <div className="panel">
          <h2>
            GlamStock could not start
          </h2>

          <p>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (
    status?.operational
  ) {
    return (
      <>
        {children}

        {status.status ===
          "trial" && (

          <div
            style={{
              position:
                "fixed",

              right:
                "18px",

              bottom:
                "18px",

              zIndex:
                9999,

              padding:
                "10px 14px",

              borderRadius:
                "10px",

              background:
                "#111827",

              color:
                "#ffffff",

              boxShadow:
                "0 8px 30px rgba(0,0,0,.20)",

              fontSize:
                "13px",
            }}
          >
            GlamStock Trial ·{" "}
            <strong>
              {
                status.daysRemaining
              }{" "}
              day
              {status.daysRemaining ===
              1
                ? ""
                : "s"}{" "}
              remaining
            </strong>
          </div>

        )}
      </>
    );
  }

  return (
    <div
      style={{
        minHeight:
          "100vh",

        display:
          "grid",

        placeItems:
          "center",

        padding:
          "30px",
      }}
    >

      <div
        className="settings-card"
        style={{
          width:
            "min(620px, 100%)",
        }}
      >

        <div
          style={{
            textAlign:
              "center",

            marginBottom:
              "28px",
          }}
        >

          <LockKeyhole
            size={48}
          />

          <h1>
            Activate GlamStock
          </h1>

          <p>
            Your 14-day trial has
            ended.
          </p>

          <p>
            Your business data is
            safe. Activate GlamStock
            to continue business
            operations.
          </p>

        </div>

        {status
          ?.clockRollbackDetected && (

          <div className="alert-card warning">

            GlamStock detected a
            significant system-clock
            rollback.

          </div>

        )}

        <div className="form-group">

          <label>
            Installation ID
          </label>

          <div
            style={{
              display:
                "flex",

              gap:
                "10px",
            }}
          >

            <input
              readOnly
              value={
                status
                  ?.installationId ||
                ""
              }
            />

            <button
              type="button"
              className="secondary-button"
              onClick={
                copyInstallationId
              }
            >
              <Copy
                size={17}
              />

              Copy
            </button>

          </div>

          <small>
            Send this Installation
            ID to GlamStock support
            when purchasing a
            license.
          </small>

        </div>

        <div
          style={{
            margin:
              "24px 0",
          }}
        >

          <label
            className="secondary-button"
            style={{
              display:
                "inline-flex",

              cursor:
                "pointer",
            }}
          >
            <Upload
              size={17}
            />

            Select License File

            <input
              type="file"
              accept=".glamlicense,application/json"
              hidden
              onChange={
                handleFile
              }
            />
          </label>

        </div>

        {licenseText && (

          <div className="alert-card">

            <ShieldCheck
              size={18}
            />

            License file selected.

          </div>

        )}

        {activationError && (

          <div className="alert-card warning">

            {activationError}

          </div>

        )}

        <button
          type="button"
          className="primary-button"
          disabled={
            activating ||
            !licenseText
          }
          onClick={
            handleActivate
          }
        >
          <KeyRound
            size={18}
          />

          {activating
            ? "Activating..."
            : "Activate GlamStock"}
        </button>

      </div>

    </div>
  );
}

export default LicenseGate;
