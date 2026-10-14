import {
  useDeferredValue,
  useMemo,
  useState,
} from "react";

import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";

import useInventoryStore
  from "../store/inventoryStore";

import useAuthStore
  from "../store/authStore";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

function Suppliers() {
  const currentUser =
    useAuthStore(
      (state) =>
        state.currentUser
    );

  const isAdmin =
    currentUser?.role ===
    "admin";

  const suppliers =
    useInventoryStore(
      (state) =>
        state.suppliers
    );

  const localAdd =
    useInventoryStore(
      (state) =>
        state.addSupplier
    );

  const localUpdate =
    useInventoryStore(
      (state) =>
        state.updateSupplier
    );

  const localDelete =
    useInventoryStore(
      (state) =>
        state.deleteSupplier
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

  const hasDesktopApi =
    typeof window !==
      "undefined" &&
    Boolean(
      window.glamstock
        ?.suppliers
    );

  const filteredSuppliers =
    useMemo(() => {
      const search =
        deferredSearchTerm
          .trim()
          .toLowerCase();

      return suppliers.filter(
        (supplier) =>
          supplier.name
            ?.toLowerCase()
            .includes(
              search
            ) ||

          supplier.phone
            ?.toLowerCase()
            .includes(
              search
            ) ||

          supplier.email
            ?.toLowerCase()
            .includes(
              search
            )
      );
    }, [
      suppliers,
      deferredSearchTerm,
    ]);

  const refresh = async () => {
    if (
      !hasDesktopApi
    ) {
      return;
    }

    const freshSuppliers =
      await window.glamstock
        .suppliers
        .getAll();

    useInventoryStore
      .setState({
        suppliers:
          Array.isArray(
            freshSuppliers
          )
            ? freshSuppliers
            : [],
      });
  };

  const resetForm = () => {
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
        [name]:
          value,
      })
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
        !form.name.trim()
      ) {
        alert(
          "Please enter the supplier name."
        );

        return;
      }

      const data = {
        name:
          form.name.trim(),

        phone:
          form.phone.trim(),

        email:
          form.email.trim(),

        address:
          form.address.trim(),

        notes:
          form.notes.trim(),
      };

      setSaving(
        true
      );

      try {
        let result;

        if (
          hasDesktopApi
        ) {
          result =
            editingId
              ? await window
                  .glamstock
                  .suppliers
                  .update(
                    editingId,
                    data
                  )
              : await window
                  .glamstock
                  .suppliers
                  .create(
                    data
                  );
        } else {
          result =
            editingId
              ? localUpdate(
                  editingId,
                  data
                )
              : localAdd(
                  data
                );
        }

        if (
          !result?.success
        ) {
          alert(
            result?.message ||
              "Could not save supplier."
          );

          return;
        }

        if (
          hasDesktopApi
        ) {
          await refresh();
        }

        alert(
          editingId
            ? "Supplier updated successfully."
            : "Supplier added successfully."
        );

        resetForm();
      } catch (error) {
        console.error(
          "Supplier save failed:",
          error
        );

        alert(
          error?.message ||
            "Could not save supplier."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  const handleEdit = (
    supplier
  ) => {
    if (!isAdmin) {
      return;
    }

    setForm({
      name:
        supplier.name ||
        "",

      phone:
        supplier.phone ||
        "",

      email:
        supplier.email ||
        "",

      address:
        supplier.address ||
        "",

      notes:
        supplier.notes ||
        "",
    });

    setEditingId(
      supplier.id
    );

    setShowForm(
      true
    );
  };

  const handleDelete =
    async (
      supplier
    ) => {
      if (
        !isAdmin ||
        saving
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Remove "${supplier.name}" from active suppliers?`
        );

      if (!confirmed) {
        return;
      }

      setSaving(
        true
      );

      try {
        const result =
          hasDesktopApi
            ? await window
                .glamstock
                .suppliers
                .remove(
                  supplier.id
                )
            : localDelete(
                supplier.id
              );

        if (
          !result?.success
        ) {
          alert(
            result?.message ||
              "Could not remove supplier."
          );

          return;
        }

        if (
          hasDesktopApi
        ) {
          await refresh();
        }
      } catch (error) {
        console.error(
          "Supplier removal failed:",
          error
        );

        alert(
          error?.message ||
            "Could not remove supplier."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  return (
    <div className="suppliers-page">

      <div className="page-header">

        <div>

          <p className="dashboard-label">
            SUPPLIER MANAGEMENT
          </p>

          <h1>
            Suppliers
          </h1>

          <p>
            Manage the businesses
            and people who supply
            your products.
          </p>

        </div>

        {isAdmin && (

          <div className="supplier-header-actions">

            <div className="page-title-icon supplier-page-icon">

              <Users
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

                  Add Supplier
                </>
              )}

            </button>

          </div>

        )}

      </div>

      {showForm &&
        isAdmin && (

        <div className="supplier-form-card">

          <div className="supplier-form-heading">

            <div className="section-icon supplier-section-icon">

              <UserPlus
                size={20}
              />

            </div>

            <div>

              <h2>
                {editingId
                  ? "Edit Supplier"
                  : "Add Supplier"}
              </h2>

              <p>
                Enter the supplier's
                contact information.
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
                  Supplier Name *
                </label>

                <input
                  name="name"
                  value={
                    form.name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Beauty World Ltd"
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Phone Number
                </label>

                <input
                  name="phone"
                  type="tel"
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
                  placeholder="supplier@example.com"
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

              <div className="form-group supplier-notes">

                <label>
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={
                    form.notes
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Additional information..."
                  rows="3"
                />

              </div>

            </div>

            <div className="form-actions">

              <button
                type="button"
                className="secondary-button"
                disabled={
                  saving
                }
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
                  ? "Update Supplier"
                  : "Save Supplier"}
              </button>

            </div>

          </form>

        </div>

      )}

      <div className="suppliers-card">

        <div className="suppliers-card-header">

          <div>

            <h2>
              Supplier List
            </h2>

            <p>
              {suppliers.length}{" "}
              supplier
              {suppliers.length ===
              1
                ? ""
                : "s"}{" "}
              registered
            </p>

          </div>

          <div className="sales-search">

            <Search
              size={18}
            />

            <input
              type="text"
              placeholder="Search suppliers..."
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

        {filteredSuppliers
          .length ===
        0 ? (

          <div className="suppliers-empty-state">

            <Users
              size={42}
            />

            <h3>
              {suppliers.length ===
              0
                ? "No suppliers yet"
                : "No matching suppliers"}
            </h3>

            <p>
              {suppliers.length ===
              0
                ? "Add your first supplier to get started."
                : "Try searching for another supplier."}
            </p>

          </div>

        ) : (

          <div className="supplier-list">

            {filteredSuppliers.map(
              (
                supplier
              ) => (

                <div
                  className="supplier-item"
                  key={
                    supplier.id
                  }
                >

                  <div className="supplier-avatar">

                    {supplier.name
                      ?.charAt(0)
                      .toUpperCase()}

                  </div>

                  <div className="supplier-main">

                    <h3>
                      {
                        supplier.name
                      }
                    </h3>

                    <div className="supplier-details">

                      {supplier.phone && (

                        <span>
                          <Phone
                            size={14}
                          />

                          {
                            supplier.phone
                          }
                        </span>

                      )}

                      {supplier.email && (

                        <span>
                          <Mail
                            size={14}
                          />

                          {
                            supplier.email
                          }
                        </span>

                      )}

                      {supplier.address && (

                        <span>
                          <MapPin
                            size={14}
                          />

                          {
                            supplier.address
                          }
                        </span>

                      )}

                    </div>

                    {supplier.notes && (

                      <p className="supplier-notes-text">
                        {
                          supplier.notes
                        }
                      </p>

                    )}

                  </div>

                  {isAdmin && (

                    <div className="supplier-actions">

                      <button
                        type="button"
                        className="icon-button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          handleEdit(
                            supplier
                          )
                        }
                      >
                        <Pencil
                          size={17}
                        />
                      </button>

                      <button
                        type="button"
                        className="icon-button delete"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          handleDelete(
                            supplier
                          )
                        }
                      >
                        <Trash2
                          size={17}
                        />
                      </button>

                    </div>

                  )}

                </div>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default Suppliers;