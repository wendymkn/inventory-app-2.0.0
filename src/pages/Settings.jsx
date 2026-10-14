import {
  useEffect,
  useState,
} from "react";

import {
  Building2,
  Save,
  ImagePlus,
  Trash2,
  ReceiptText,
  Bell,
  RotateCcw,
} from "lucide-react";

import useSettingsStore from "../store/settingsStore";

function Settings() {
  const business =
    useSettingsStore(
      (state) =>
        state.business
    );

  const currency =
    useSettingsStore(
      (state) =>
        state.currency
    );

  const lowStockAlerts =
    useSettingsStore(
      (state) =>
        state.lowStockAlerts
    );

  const loaded =
    useSettingsStore(
      (state) =>
        state.loaded
    );

  const saveSettings =
    useSettingsStore(
      (state) =>
        state.saveSettings
    );

  const resetBusiness =
    useSettingsStore(
      (state) =>
        state.resetBusiness
    );

  const [form, setForm] =
    useState({
      name:
        business?.name || "",

      tagline:
        business?.tagline || "",

      phone:
        business?.phone || "",

      email:
        business?.email || "",

      address:
        business?.address || "",

      kraPin:
        business?.kraPin || "",

      registrationNumber:
        business?.registrationNumber ||
        "",

      receiptFooter:
        business?.receiptFooter ||
        "Thank you for shopping with us!",

      receiptSize:
        business?.receiptSize ||
        "80mm",

      logo:
        business?.logo || "",

      currency:
        currency || "KSh",

      lowStockAlerts:
        lowStockAlerts !== false,
    });

  useEffect(() => {
    if (!loaded) {
      return;
    }

    setForm({
      name:
        business?.name || "",

      tagline:
        business?.tagline || "",

      phone:
        business?.phone || "",

      email:
        business?.email || "",

      address:
        business?.address || "",

      kraPin:
        business?.kraPin || "",

      registrationNumber:
        business?.registrationNumber ||
        "",

      receiptFooter:
        business?.receiptFooter ||
        "Thank you for shopping with us!",

      receiptSize:
        business?.receiptSize ||
        "80mm",

      logo:
        business?.logo || "",

      currency:
        currency || "KSh",

      lowStockAlerts:
        lowStockAlerts !== false,
    });
  }, [
    loaded,
    business,
    currency,
    lowStockAlerts,
  ]);

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  };

  const handleLogoUpload = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      alert(
        "Please select a PNG, JPG or WEBP image."
      );

      event.target.value = "";

      return;
    }

    const maxSize =
      1.2 * 1024 * 1024;

    if (
      file.size > maxSize
    ) {
      alert(
        "Logo is too large. Please use an image smaller than 1.2 MB."
      );

      event.target.value = "";

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      setForm(
        (current) => ({
          ...current,
          logo:
            reader.result,
        })
      );
    };

    reader.readAsDataURL(
      file
    );
  };

  const removeLogo = () => {
    setForm(
      (current) => ({
        ...current,
        logo: "",
      })
    );
  };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        !form.name.trim()
      ) {
        alert(
          "Please enter the business name."
        );

        return;
      }

      const result =
        await saveSettings({
          business: {
            name:
              form.name.trim(),

            tagline:
              form.tagline.trim(),

            phone:
              form.phone.trim(),

            email:
              form.email.trim(),

            address:
              form.address.trim(),

            kraPin:
              form.kraPin.trim(),

            registrationNumber:
              form.registrationNumber.trim(),

            receiptFooter:
              form.receiptFooter.trim(),

            receiptSize:
              form.receiptSize,

            logo:
              form.logo,
          },

          currency:
            form.currency,

          lowStockAlerts:
            form.lowStockAlerts,
        });

      if (
        !result.success
      ) {
        alert(
          result.message ||
            "Could not save business settings."
        );

        return;
      }

      alert(
        "Business settings saved successfully."
      );
    };

  const handleReset =
    async () => {
      const confirmed =
        window.confirm(
          "Reset the business profile to default GlamStock settings?"
        );

      if (!confirmed) {
        return;
      }

      const result =
        await resetBusiness();

      if (
        !result.success
      ) {
        alert(
          result.message ||
            "Could not reset business settings."
        );

        return;
      }

      alert(
        "Business profile reset successfully."
      );
    };

  return (
    <div className="settings-page">

      <div className="page-header">

        <div>

          <p className="dashboard-label">
            BUSINESS CONFIGURATION
          </p>

          <h1>
            Business Profile
          </h1>

          <p>
            Customize GlamStock
            for this business.
          </p>

        </div>

      </div>

      <form
        onSubmit={
          handleSubmit
        }
      >

        {/* =========================
            BUSINESS BRANDING
        ========================== */}

        <div className="settings-card">

          <div className="settings-section-heading">

            <div className="section-icon">
              <Building2
                size={20}
              />
            </div>

            <div>

              <h2>
                Business Branding
              </h2>

              <p>
                This identity appears
                across GlamStock and
                on receipts.
              </p>

            </div>

          </div>

          <div className="business-branding-layout">

            <div className="business-logo-editor">

              <div className="business-logo-preview">

                {form.logo ? (
                  <img
                    src={
                      form.logo
                    }
                    alt="Business logo"
                  />
                ) : (
                  <Building2
                    size={46}
                  />
                )}

              </div>

              <label className="secondary-button logo-upload-button">

                <ImagePlus
                  size={17}
                />

                Upload Logo

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={
                    handleLogoUpload
                  }
                  hidden
                />

              </label>

              {form.logo && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={
                    removeLogo
                  }
                >
                  <Trash2
                    size={16}
                  />

                  Remove
                </button>
              )}

              <small>
                PNG, JPG or WEBP.
                Maximum 1.2 MB.
              </small>

            </div>

            <div className="settings-form-grid">

              <div className="form-group">

                <label>
                  Business Name *
                </label>

                <input
                  name="name"
                  value={
                    form.name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Bella Beauty House"
                />

              </div>

              <div className="form-group">

                <label>
                  Tagline
                </label>

                <input
                  name="tagline"
                  value={
                    form.tagline
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Beauty starts here"
                />

              </div>

              <div className="form-group">

                <label>
                  Phone / WhatsApp
                </label>

                <input
                  name="phone"
                  value={
                    form.phone
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. 0712 345 678"
                />

              </div>

              <div className="form-group">

                <label>
                  Email
                </label>

                <input
                  name="email"
                  type="email"
                  value={
                    form.email
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="business@example.com"
                />

              </div>

              <div className="form-group">

                <label>
                  Address
                </label>

                <input
                  name="address"
                  value={
                    form.address
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Meru Town"
                />

              </div>

              <div className="form-group">

                <label>
                  KRA PIN
                </label>

                <input
                  name="kraPin"
                  value={
                    form.kraPin
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Optional"
                />

              </div>

              <div className="form-group">

                <label>
                  Registration No.
                </label>

                <input
                  name="registrationNumber"
                  value={
                    form.registrationNumber
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Optional"
                />

              </div>

            </div>

          </div>

        </div>

        {/* =========================
            RECEIPT SETTINGS
        ========================== */}

        <div className="settings-card">

          <div className="settings-section-heading">

            <div className="section-icon">
              <ReceiptText
                size={20}
              />
            </div>

            <div>

              <h2>
                Receipt Settings
              </h2>

              <p>
                Configure printed
                sales receipts.
              </p>

            </div>

          </div>

          <div className="settings-form-grid">

            <div className="form-group">

              <label>
                Currency
              </label>

              <select
                name="currency"
                value={
                  form.currency
                }
                onChange={
                  handleChange
                }
              >

                <option value="KSh">
                  KSh
                </option>

                <option value="$">
                  USD ($)
                </option>

                <option value="€">
                  EUR (€)
                </option>

                <option value="£">
                  GBP (£)
                </option>

                <option value="TSh">
                  TSh
                </option>

                <option value="USh">
                  USh
                </option>

              </select>

            </div>

            <div className="form-group">

              <label>
                Receipt Printer Size
              </label>

              <select
                name="receiptSize"
                value={
                  form.receiptSize
                }
                onChange={
                  handleChange
                }
              >

                <option value="80mm">
                  80 mm Thermal
                </option>

                <option value="58mm">
                  58 mm Thermal
                </option>

              </select>

            </div>

            <div className="form-group settings-wide-field">

              <label>
                Receipt Footer
              </label>

              <textarea
                name="receiptFooter"
                rows="3"
                value={
                  form.receiptFooter
                }
                onChange={
                  handleChange
                }
                placeholder="Thank you for shopping with us!"
              />

            </div>

          </div>

        </div>

        {/* =========================
            INVENTORY ALERTS
        ========================== */}

        <div className="settings-card">

          <div className="settings-section-heading">

            <div className="section-icon">
              <Bell
                size={20}
              />
            </div>

            <div>

              <h2>
                Inventory Alerts
              </h2>

              <p>
                Control system
                stock notifications.
              </p>

            </div>

          </div>

          <label className="settings-toggle-row">

            <div>

              <strong>
                Low Stock Alerts
              </strong>

              <p>
                Show warnings when
                stock reaches its
                configured threshold.
              </p>

            </div>

            <input
              type="checkbox"
              checked={
                form.lowStockAlerts
              }
              onChange={(
                event
              ) =>
                setForm(
                  (current) => ({
                    ...current,

                    lowStockAlerts:
                      event.target
                        .checked,
                  })
                )
              }
            />

          </label>

        </div>

        {/* =========================
            ACTIONS
        ========================== */}

        <div className="settings-actions">

          <button
            type="button"
            className="secondary-button"
            onClick={
              handleReset
            }
          >
            <RotateCcw
              size={17}
            />

            Reset
          </button>

          <button
            type="submit"
            className="primary-button"
          >
            <Save
              size={18}
            />

            Save Business Profile
          </button>

        </div>

      </form>

    </div>
  );
}

export default Settings;