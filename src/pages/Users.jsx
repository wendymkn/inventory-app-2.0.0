import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import useAuthStore
  from "../store/authStore";

const emptyForm = {
  name: "",
  username: "",
  password: "",
  role: "worker",
  active: true,
};

function Users() {
  const currentUser =
    useAuthStore(
      (state) =>
        state.currentUser
    );

  const users =
    useAuthStore(
      (state) =>
        state.users
    );

  const loadUsers =
    useAuthStore(
      (state) =>
        state.loadUsers
    );

  const addUser =
    useAuthStore(
      (state) =>
        state.addUser
    );

  const updateUser =
    useAuthStore(
      (state) =>
        state.updateUser
    );

  const deleteUser =
    useAuthStore(
      (state) =>
        state.deleteUser
    );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const deferredSearchTerm =
    useDeferredValue(searchTerm);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingId,
    setEditingId,
  ] = useState(null);

  const [
    form,
    setForm,
  ] = useState(
    emptyForm
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const isAdmin =
    currentUser?.role ===
    "admin";

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [
    isAdmin,
    loadUsers,
  ]);

  const filteredUsers =
    useMemo(() => {
      const search =
        deferredSearchTerm
          .trim()
          .toLowerCase();

      return users.filter(
        (user) =>
          user.name
            ?.toLowerCase()
            .includes(
              search
            ) ||

          user.username
            ?.toLowerCase()
            .includes(
              search
            ) ||

          user.role
            ?.toLowerCase()
            .includes(
              search
            )
      );
    }, [
      users,
      deferredSearchTerm,
    ]);

  const resetForm =
    () => {
      setForm(
        emptyForm
      );

      setEditingId(
        null
      );

      setShowForm(
        false
      );
    };

  const handleEdit = (
    user
  ) => {
    setForm({
      name:
        user.name,

      username:
        user.username,

      password: "",

      role:
        user.role,

      active:
        user.active !==
        false,
    });

    setEditingId(
      user.id
    );

    setShowForm(
      true
    );
  };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        !isAdmin ||
        saving
      ) {
        return;
      }

      if (
        !form.name.trim() ||
        !form.username.trim()
      ) {
        alert(
          "Enter the user's name and username."
        );

        return;
      }

      if (
        !editingId &&
        form.password.length <
          8
      ) {
        alert(
          "Initial passwords must contain at least 8 characters."
        );

        return;
      }

      const data = {
        name:
          form.name.trim(),

        username:
          form.username
            .trim()
            .toLowerCase(),

        role:
          form.role,

        active:
          form.active,
      };

      if (
        form.password
      ) {
        data.password =
          form.password;
      }

      setSaving(
        true
      );

      const result =
        editingId
          ? await updateUser(
              editingId,
              data
            )
          : await addUser(
              data
            );

      setSaving(
        false
      );

      if (
        !result?.success
      ) {
        alert(
          result?.message ||
            "Could not save user."
        );

        return;
      }

      alert(
        editingId
          ? "User updated."
          : "User created. Their first password is temporary and must be changed when they sign in."
      );

      resetForm();
    };

  const handleDelete =
    async (user) => {
      if (
        !isAdmin ||
        saving
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Deactivate "${user.name}"?`
        );

      if (!confirmed) {
        return;
      }

      const result =
        await deleteUser(
          user.id
        );

      if (
        !result?.success
      ) {
        alert(
          result?.message ||
            "Could not deactivate user."
        );
      }
    };

  if (!isAdmin) {
    return (
      <div className="page-shell">

        <div className="panel">

          <ShieldCheck
            size={32}
          />

          <h2>
            Administrator Access
          </h2>

          <p>
            Only administrators
            can manage GlamStock
            users.
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="suppliers-page">

      <div className="page-header">

        <div>

          <p className="dashboard-label">
            ACCESS CONTROL
          </p>

          <h1>
            Users
          </h1>

          <p>
            Manage administrators
            and workers who can
            access this installation.
          </p>

        </div>

        <div className="supplier-header-actions">

          <div className="page-title-icon supplier-page-icon">

            <UsersIcon
              size={25}
            />

          </div>

          <button
            type="button"
            className="primary-button"
            disabled={
              saving
            }
            onClick={() =>
              showForm
                ? resetForm()
                : setShowForm(
                    true
                  )
            }
          >

            {showForm ? (
              <>
                <X
                  size={18}
                />
                Close
              </>
            ) : (
              <>
                <UserPlus
                  size={18}
                />
                Add User
              </>
            )}

          </button>

        </div>

      </div>

      {showForm && (

        <div className="supplier-form-card">

          <div className="supplier-form-heading">

            <div className="section-icon supplier-section-icon">

              <UserRound
                size={20}
              />

            </div>

            <div>

              <h2>
                {editingId
                  ? "Edit User"
                  : "Add User"}
              </h2>

              <p>
                Passwords are securely
                hashed before being
                stored.
              </p>

            </div>

          </div>

          <form
            onSubmit={
              handleSubmit
            }
          >

            <div className="supplier-form-grid">

              <div className="form-group">

                <label>
                  Full Name *
                </label>

                <input
                  value={
                    form.name
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,

                      name:
                        event.target
                          .value,
                    })
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Username *
                </label>

                <input
                  value={
                    form.username
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,

                      username:
                        event.target
                          .value,
                    })
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Role
                </label>

                <select
                  value={
                    form.role
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,

                      role:
                        event.target
                          .value,
                    })
                  }
                >

                  <option value="worker">
                    Worker
                  </option>

                  <option value="admin">
                    Administrator
                  </option>

                </select>

              </div>

              <div className="form-group">

                <label>
                  {editingId
                    ? "New Password"
                    : "Temporary Password *"}
                </label>

                <input
                  type="password"
                  value={
                    form.password
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,

                      password:
                        event.target
                          .value,
                    })
                  }
                  placeholder={
                    editingId
                      ? "Leave blank to keep current password"
                      : "Minimum 8 characters"
                  }
                  required={
                    !editingId
                  }
                />

              </div>

              {editingId && (

                <label className="settings-toggle-row">

                  <div>

                    <strong>
                      Active Account
                    </strong>

                    <p>
                      Disabled users
                      cannot sign in.
                    </p>

                  </div>

                  <input
                    type="checkbox"
                    checked={
                      form.active
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,

                        active:
                          event.target
                            .checked,
                      })
                    }
                  />

                </label>

              )}

            </div>

            <div className="form-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={
                  resetForm
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={
                  saving
                }
              >
                <Save
                  size={18}
                />

                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update User"
                  : "Create User"}
              </button>

            </div>

          </form>

        </div>

      )}

      <div className="suppliers-card">

        <div className="suppliers-card-header">

          <div>

            <h2>
              User Accounts
            </h2>

            <p>
              {users.length}{" "}
              account
              {users.length ===
              1
                ? ""
                : "s"}
            </p>

          </div>

          <div className="sales-search">

            <Search
              size={18}
            />

            <input
              placeholder="Search users..."
              value={
                searchTerm
              }
              onChange={(
                event
              ) =>
                setSearchTerm(
                  event.target
                    .value
                )
              }
            />

          </div>

        </div>

        <div className="supplier-list">

          {filteredUsers.map(
            (user) => (

              <div
                className="supplier-item"
                key={
                  user.id
                }
              >

                <div className="supplier-avatar">

                  {user.role ===
                  "admin" ? (
                    <ShieldCheck
                      size={18}
                    />
                  ) : (
                    <UserRound
                      size={18}
                    />
                  )}

                </div>

                <div className="supplier-main">

                  <h3>
                    {user.name}
                  </h3>

                  <div className="supplier-details">

                    <span>
                      @{user.username}
                    </span>

                    <span>
                      {user.role ===
                      "admin"
                        ? "Administrator"
                        : "Worker"}
                    </span>

                    <span>
                      {user.active
                        ? "Active"
                        : "Disabled"}
                    </span>

                    {user.mustChangePassword && (
                      <span>
                        Password change required
                      </span>
                    )}

                  </div>

                </div>

                <div className="supplier-actions">

                  <button
                    type="button"
                    className="icon-button"
                    onClick={() =>
                      handleEdit(
                        user
                      )
                    }
                  >
                    <Pencil
                      size={17}
                    />
                  </button>

                  {user.id !==
                    currentUser.id && (

                    <button
                      type="button"
                      className="icon-button delete"
                      onClick={() =>
                        handleDelete(
                          user
                        )
                      }
                    >
                      <Trash2
                        size={17}
                      />
                    </button>

                  )}

                </div>

              </div>

            )
          )}

        </div>

      </div>

    </div>
  );
}

export default Users;