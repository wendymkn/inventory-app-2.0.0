import {
  useEffect,
  useState,
} from "react";

function LicenseBanner() {
  const [licenseStatus, setLicenseStatus] =
    useState(null);

  async function loadLicenseStatus() {
    if (
      !window.glamstock
        ?.license
        ?.status
    ) {
      return;
    }

    try {
      const result =
        await window.glamstock
          .license
          .status();

      setLicenseStatus(
        result
      );
    } catch (error) {
      console.error(
        "Could not load license status:",
        error
      );
    }
  }

  useEffect(() => {
    loadLicenseStatus();

    const handleLicenseChanged = () => {
      loadLicenseStatus();
    };

    const handleWindowFocus = () => {
      loadLicenseStatus();
    };

    window.addEventListener(
      "glamstock:license-changed",
      handleLicenseChanged
    );

    window.addEventListener(
      "focus",
      handleWindowFocus
    );

    return () => {
      window.removeEventListener(
        "glamstock:license-changed",
        handleLicenseChanged
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus
      );
    };
  }, []);

  if (
    !licenseStatus ||
    licenseStatus.status ===
      "activated"
  ) {
    return null;
  }

  const isTrial =
    licenseStatus.status ===
    "trial";

  return (
    <div
      className={
        isTrial
          ? "license-banner license-banner-trial"
          : "license-banner license-banner-blocked"
      }
    >
      <strong>
        {isTrial
          ? `GlamStock Trial · ${licenseStatus.daysRemaining} day(s) remaining`
          : "GlamStock Trial Expired"}
      </strong>

      <span>
        {isTrial
          ? "Activate GlamStock before the trial ends to keep creating sales and changing business data."
          : licenseStatus.clockRollbackDetected
          ? "A system-clock rollback was detected. Activate GlamStock to continue making changes."
          : "Your records remain available, but new sales and other changes are blocked until GlamStock is activated."}
      </span>
    </div>
  );
}

export default LicenseBanner;
