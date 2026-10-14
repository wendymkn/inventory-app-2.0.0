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

function Customers() {
  const currentUser =
    useAuthStore(
      (state) =>
        state.currentUser
    );

  const isAdmin =
    currentUser?.role ===
    "admin";

  const customers =
    useInventoryStore(
      (state) =>
        state.customers
    );

  const localAdd =
    useInventoryStore(
      (state) =>
        state.addCustomer
    );

  const localUpdate =
    useInventoryStore(
      (state) =>
        state.updateCustomer
    );

  const localDelete =
    useInventoryStore(
      (state) =>
        state.deleteCustomer
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
        ?.customers
    );

  const filteredCustomers =
    useMemo(() => {
      const search =
        deferredSearchTerm
          .trim()
          .toLowerCase();

      return customers.filter(
        (customer) =>
          customer.name
            ?.toLowerCase()
            .includes(
              search
            ) ||

          customer.phone
            ?.toLowerCase()
            .includes(
              search
            ) ||

          customer.email
            ?.toLowerCase()
            .includes(
              search
            )
      );
    }, [
      customers,
      deferredSearchTerm,
    ]);

  const refresh =
    async () => {
      if (
        !hasDesktopApi
      ) {
        return;
      }

      const fresh =
        await window.glamstock
          .customers
          .getAll();

      useInventoryStore
        .setState({
          customers:
            Array.isArray(
              fresh
            )
              ? fresh
              : [],
        });
    };

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

  const handleChange =
    (event) => {
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

      if (saving) {
        return;
      }

      /*
        Workers may add customers,
        but only admins may edit.
      */

      if (
        editingId &&
        !isAdmin
      ) {
        return;
      }

      if (
        !form.name.trim()
      ) {
        alert(
          "Please enter the customer name."
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
                  .customers
                  .update(
                    editingId,
                    data
                  )
              : await window
                  .glamstock
                  .customers
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
              "Could not save customer."
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
            ? "Customer updated successfully."
            : "Customer added successfully."
        );

        resetForm();
      } catch (error) {
        console.error(
          "Customer save failed:",
          error
        );

        alert(
          error?.message ||
            "Could not save customer."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  const handleEdit = (
    customer
  ) => {
    if (!isAdmin) {
      return;
    }

    setForm({
      name:
        customer.name ||
        "",

      phone:
        customer.phone ||
        "",

      email:
        customer.email ||
        "",

      address:
        customer.address ||
        "",

      notes:
        customer.notes ||
        "",
    });

    setEditingId(
      customer.id
    );

    setShowForm(
      true
    );
  };

  const handleDelete =
    async (
      customer
    ) => {
      if (
        !isAdmin ||
        saving
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Remove "${customer.name}" from active customers?`
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
                .customers
                .remove(
                  customer.id
                )
            : localDelete(
                customer.id
              );

        if (
          !result?.success
        ) {
          alert(
            result?.message ||
              "Could not remove customer."
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
          "Customer removal failed:",
          error
        );

        alert(
          error?.message ||
            "Could not remove customer."
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
            CUSTOMER MANAGEMENT
          </p>

          <h1>
            Customers
          </h1>

          <p>
            Keep customer contact
            details available for
            sales and receipts.
          </p>

        </div>

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

                Add Customer
              </>
            )}

          </button>

        </div>

      </div>

      {showForm && (

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
                  ? "Edit Customer"
                  : "Add Customer"}
              </h2>

              <p>
                Enter customer
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
                  Customer Name *
                </label>

                <input
                  name="name"
                  value={
                    form.name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Jane Mwangi"
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
                  placeholder="customer@example.com"
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
                  placeholder="Optional notes..."
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
                  ? "Update Customer"
                  : "Save Customer"}
              </button>

            </div>

          </form>

        </div>

      )}

      <div className="suppliers-card">

        <div className="suppliers-card-header">

          <div>

            <h2>
              Customer List
            </h2>

            <p>
              {customers.length}{" "}
              customer
              {customers.length ===
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
              placeholder="Search customers..."
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

        {filteredCustomers
          .length ===
        0 ? (

          <div className="suppliers-empty-state">

            <Users
              size={42}
            />

            <h3>
              {customers.length ===
              0
                ? "No customers yet"
                : "No matching customers"}
            </h3>

            <p>
              {customers.length ===
              0
                ? "Add your first customer to get started."
                : "Try another search."}
            </p>

          </div>

        ) : (

          <div className="supplier-list">

            {filteredCustomers.map(
              (
                customer
              ) => (

                <div
                  className="supplier-item"
                  key={
                    customer.id
                  }
                >

                  <div className="supplier-avatar">

                    {customer.name
                      ?.charAt(0)
                      .toUpperCase()}

                  </div>

                  <div className="supplier-main">

                    <h3>
                      {
                        customer.name
                      }
                    </h3>

                    <div className="supplier-details">

                      {customer.phone && (

                        <span>
                          <Phone
                            size={14}
                          />

                          {
                            customer.phone
                          }
                        </span>

                      )}

                      {customer.email && (

                        <span>
                          <Mail
                            size={14}
                          />

                          {
                            customer.email
                          }
                        </span>

                      )}

                      {customer.address && (

                        <span>
                          <MapPin
                            size={14}
                          />

                          {
                            customer.address
                          }
                        </span>

                      )}

                    </div>

                    {customer.notes && (

                      <p className="supplier-notes-text">
                        {
                          customer.notes
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
                            customer
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
                            customer
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

export default Customers;