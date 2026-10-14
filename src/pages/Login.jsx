import {
  useEffect,
  useState,
} from "react";

import {
  LockKeyhole,
  UserRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Store,
} from "lucide-react";

import useAuthStore
  from "../store/authStore";

import useSettingsStore
  from "../store/settingsStore";

function Login() {
  const login =
    useAuthStore(
      (state) =>
        state.login
    );

  const createOwner =
    useAuthStore(
      (state) =>
        state.createOwner
    );

  const checkSetup =
    useAuthStore(
      (state) =>
        state.checkSetup
    );

  const setupRequired =
    useAuthStore(
      (state) =>
        state.setupRequired
    );

  const setupLoading =
    useAuthStore(
      (state) =>
        state.setupLoading
    );

  const completePasswordChange =
    useAuthStore(
      (state) =>
        state
          .completeRequiredPasswordChange
    );

  const loading =
    useAuthStore(
      (state) =>
        state.loading
    );

  const business =
    useSettingsStore(
      (state) =>
        state.business
    );

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    savingPassword,
    setSavingPassword,
  ] = useState(false);

  const [
    ownerName,
    setOwnerName,
  ] = useState("");

  const [
    ownerUsername,
    setOwnerUsername,
  ] = useState("");

  const [
    ownerPassword,
    setOwnerPassword,
  ] = useState("");

  const [
    ownerConfirmPassword,
    setOwnerConfirmPassword,
  ] = useState("");

  useEffect(() => {
    checkSetup();
  }, [checkSetup]);

  const handleOwnerSetup =
    async (event) => {
      event.preventDefault();

      setError("");

      if (
        !ownerName.trim()
      ) {
        setError(
          "Enter the owner's name."
        );

        return;
      }

      if (
        ownerUsername
          .trim()
          .length < 3
      ) {
        setError(
          "Username must contain at least 3 characters."
        );

        return;
      }

      if (
        ownerPassword.length <
        8
      ) {
        setError(
          "Password must contain at least 8 characters."
        );

        return;
      }

      if (
        ownerPassword !==
        ownerConfirmPassword
      ) {
        setError(
          "Passwords do not match."
        );

        return;
      }

      const result =
        await createOwner({
          name:
            ownerName.trim(),

          username:
            ownerUsername
              .trim()
              .toLowerCase(),

          password:
            ownerPassword,
        });

      if (
        !result?.success
      ) {
        setError(
          result?.message ||
            "Could not create owner account."
        );
      }
    };

  const handleLogin =
    async (event) => {
      event.preventDefault();

      setError("");

      const result =
        await login(
          username.trim(),
          password
        );

      if (
        !result?.success
      ) {
        setError(
          result?.message ||
            "Login failed."
        );

        return;
      }

      if (
        result
          .mustChangePassword
      ) {
        setChangingPassword(
          true
        );

        setPassword("");

        setError("");
      }
    };

  const handleRequiredChange =
    async (event) => {
      event.preventDefault();

      setError("");

      if (
        newPassword.length <
        8
      ) {
        setError(
          "Password must contain at least 8 characters."
        );

        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setError(
          "Passwords do not match."
        );

        return;
      }

      setSavingPassword(
        true
      );

      const result =
        await completePasswordChange(
          newPassword
        );

      setSavingPassword(
        false
      );

      if (
        !result?.success
      ) {
        setError(
          result?.message ||
            "Could not change password."
        );
      }
    };

  if (setupLoading) {
    return (
      <div className="login-page">

        <div className="login-card">

          <ShieldCheck
            size={42}
          />

          <h2>
            Preparing GlamStock
          </h2>

          <p>
            Checking secure business
            setup...
          </p>

        </div>

      </div>
    );
  }

  if (setupRequired) {
    return (
      <div className="login-page">

        <div className="login-card">

          <div className="login-brand">

            <Store
              size={44}
            />

            <h1>
              Welcome to GlamStock
            </h1>

            <p>
              Create the first Owner
              account for this business.
            </p>

          </div>

          <div className="alert-card">

            <ShieldCheck
              size={18}
            />

            This account will have
            full Administrator access.

          </div>

          <form
            onSubmit={
              handleOwnerSetup
            }
          >

            <div className="form-group">

              <label>
                Owner Name
              </label>

              <input
                value={
                  ownerName
                }
                onChange={(
                  event
                ) =>
                  setOwnerName(
                    event.target
                      .value
                  )
                }
                placeholder="e.g. Jane Wanjiku"
                autoFocus
                required
              />

            </div>

            <div className="form-group">

              <label>
                Username
              </label>

              <input
                value={
                  ownerUsername
                }
                onChange={(
                  event
                ) =>
                  setOwnerUsername(
                    event.target
                      .value
                  )
                }
                placeholder="e.g. jane"
                autoComplete="username"
                required
              />

            </div>

            <div className="form-group">

              <label>
                Password
              </label>

              <input
                type="password"
                value={
                  ownerPassword
                }
                onChange={(
                  event
                ) =>
                  setOwnerPassword(
                    event.target
                      .value
                  )
                }
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                required
              />

            </div>

            <div className="form-group">

              <label>
                Confirm Password
              </label>

              <input
                type="password"
                value={
                  ownerConfirmPassword
                }
                onChange={(
                  event
                ) =>
                  setOwnerConfirmPassword(
                    event.target
                      .value
                  )
                }
                autoComplete="new-password"
                required
              />

            </div>

            {error && (
              <div className="alert-card warning">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={
                loading
              }
            >
              <ShieldCheck
                size={18}
              />

              {loading
                ? "Creating Owner..."
                : "Create Owner Account"}
            </button>

          </form>

        </div>

      </div>
    );
  }

  if (
    changingPassword
  ) {
    return (
      <div className="login-page">

        <div className="login-card">

          <div className="login-brand">

            <ShieldCheck
              size={42}
            />

            <h1>
              Secure Your Account
            </h1>

            <p>
              Replace your temporary
              password before
              continuing.
            </p>

          </div>

          <form
            onSubmit={
              handleRequiredChange
            }
          >

            <div className="form-group">

              <label>
                New Password
              </label>

              <input
                type="password"
                value={
                  newPassword
                }
                onChange={(
                  event
                ) =>
                  setNewPassword(
                    event.target
                      .value
                  )
                }
                placeholder="Minimum 8 characters"
                autoFocus
                required
              />

            </div>

            <div className="form-group">

              <label>
                Confirm Password
              </label>

              <input
                type="password"
                value={
                  confirmPassword
                }
                onChange={(
                  event
                ) =>
                  setConfirmPassword(
                    event.target
                      .value
                  )
                }
                required
              />

            </div>

            {error && (
              <div className="alert-card warning">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={
                savingPassword
              }
            >
              <ShieldCheck
                size={18}
              />

              {savingPassword
                ? "Securing Account..."
                : "Set Password & Continue"}
            </button>

          </form>

        </div>

      </div>
    );
  }

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-brand">

          {business?.logo ? (

            <img
              src={
                business.logo
              }
              alt=""
              className="business-logo-preview"
            />

          ) : (

            <LockKeyhole
              size={42}
            />

          )}

          <h1>
            {business?.name ||
              "GlamStock"}
          </h1>

          <p>
            Inventory & Point of Sale
          </p>

        </div>

        <form
          onSubmit={
            handleLogin
          }
        >

          <div className="form-group">

            <label>
              <UserRound
                size={16}
              />
              Username
            </label>

            <input
              value={
                username
              }
              onChange={(
                event
              ) =>
                setUsername(
                  event.target
                    .value
                )
              }
              autoComplete="username"
              autoFocus
              required
            />

          </div>

          <div className="form-group">

            <label>
              <LockKeyhole
                size={16}
              />
              Password
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  password
                }
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target
                      .value
                  )
                }
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="icon-button"
                style={{
                  position:
                    "absolute",

                  right:
                    "8px",

                  top:
                    "50%",

                  transform:
                    "translateY(-50%)",
                }}
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
              >
                {showPassword ? (
                  <EyeOff
                    size={17}
                  />
                ) : (
                  <Eye
                    size={17}
                  />
                )}
              </button>

            </div>

          </div>

          {error && (
            <div className="alert-card warning">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={
              loading
            }
          >
            <LockKeyhole
              size={18}
            />

            {loading
              ? "Signing In..."
              : "Sign In"}
          </button>

        </form>

      </div>

    </div>
  );
}

export default Login;