import {
  useDeferredValue,
  useMemo,
  useState,
} from "react";

import {
  WalletCards,
  Plus,
  Search,
  CalendarDays,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";

import useInventoryStore
  from "../store/inventoryStore";

import useAuthStore
  from "../store/authStore";

import useSettingsStore
  from "../store/settingsStore";

const categories = [
  "Rent",
  "Utilities",
  "Transport",
  "Salaries",
  "Marketing",
  "Supplies",
  "Maintenance",
  "Internet",
  "Other",
];

const today = () =>
  new Date()
    .toISOString()
    .split("T")[0];

const emptyForm = () => ({
  title: "",
  category: "Other",
  amount: "",
  date: today(),
  notes: "",
});

function Expenses() {
  const expenses =
    useInventoryStore(
      (state) =>
        state.expenses
    );

  const localAdd =
    useInventoryStore(
      (state) =>
        state.addExpense
    );

  const localUpdate =
    useInventoryStore(
      (state) =>
        state.updateExpense
    );

  const localDelete =
    useInventoryStore(
      (state) =>
        state.deleteExpense
    );

  const currentUser =
    useAuthStore(
      (state) =>
        state.currentUser
    );

  const currency =
    useSettingsStore(
      (state) =>
        state.currency
    );

  const isAdmin =
    currentUser?.role ===
    "admin";

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
    emptyForm()
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
        ?.expenses
    );

  const formatMoney = (
    amount
  ) =>
    `${currency || "KSh"} ${Number(
      amount || 0
    ).toLocaleString(
      undefined,
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2,
      }
    )}`;

  const filteredExpenses =
    useMemo(() => {
      const search =
        deferredSearchTerm
          .trim()
          .toLowerCase();

      return expenses.filter(
        (expense) =>
          expense.title
            ?.toLowerCase()
            .includes(
              search
            ) ||

          expense.category
            ?.toLowerCase()
            .includes(
              search
            ) ||

          expense.notes
            ?.toLowerCase()
            .includes(
              search
            )
      );
    }, [
      expenses,
      deferredSearchTerm,
    ]);

  const totalExpenses =
    useMemo(
      () =>
        expenses.reduce(
          (
            total,
            expense
          ) =>
            total +
            Number(
              expense.amount ||
                0
            ),

          0
        ),

      [expenses]
    );

  const refresh =
    async () => {
      if (
        !hasDesktopApi
      ) {
        return;
      }

      const fresh =
        await window.glamstock
          .expenses
          .getAll();

      useInventoryStore
        .setState({
          expenses:
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
        emptyForm()
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

      const title =
        form.title.trim();

      const amount =
        Number(
          form.amount
        );

      if (!title) {
        alert(
          "Enter an expense description."
        );

        return;
      }

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        alert(
          "Enter a valid expense amount."
        );

        return;
      }

      const data = {
        title,

        category:
          form.category ||
          "Other",

        amount:
          Number(
            amount.toFixed(
              2
            )
          ),

        date:
          form.date ||
          today(),

        notes:
          form.notes.trim(),

        userName:
          currentUser?.name ||
          currentUser?.username ||
          "Admin",
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
                  .expenses
                  .update(
                    editingId,
                    data
                  )
              : await window
                  .glamstock
                  .expenses
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
              "Could not save expense."
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
            ? "Expense updated successfully."
            : "Expense recorded successfully."
        );

        resetForm();
      } catch (error) {
        console.error(
          "Expense save failed:",
          error
        );

        alert(
          error?.message ||
            "Could not save expense."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  const handleEdit = (
    expense
  ) => {
    if (!isAdmin) {
      return;
    }

    setForm({
      title:
        expense.title ||
        "",

      category:
        expense.category ||
        "Other",

      amount:
        String(
          expense.amount ??
            ""
        ),

      date:
        expense.date ||
        today(),

      notes:
        expense.notes ||
        "",
    });

    setEditingId(
      expense.id
    );

    setShowForm(
      true
    );
  };

  const handleDelete =
    async (
      expense
    ) => {
      if (
        !isAdmin ||
        saving
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Remove the expense "${expense.title}"?`
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
                .expenses
                .remove(
                  expense.id
                )
            : localDelete(
                expense.id
              );

        if (
          !result?.success
        ) {
          alert(
            result?.message ||
              "Could not remove expense."
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
          "Expense removal failed:",
          error
        );

        alert(
          error?.message ||
            "Could not remove expense."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  /*
    Sidebar routing should already
    keep workers away from this
    page, but this is an extra
    renderer-side safeguard.

    Real backend authorization is
    coming with the Users migration.
  */

  if (!isAdmin) {
    return (
      <div className="page-shell">

        <div className="panel">

          <h2>
            Access restricted
          </h2>

          <p>
            Expenses are available
            to administrators only.
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
            BUSINESS EXPENSES
          </p>

          <h1>
            Expenses
          </h1>

          <p>
            Record operating costs
            used in GlamStock profit
            calculations.
          </p>

        </div>

        <div className="supplier-header-actions">

          <div className="page-title-icon supplier-page-icon">

            <WalletCards
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
                <Plus
                  size={18}
                />

                Add Expense
              </>
            )}

          </button>

        </div>

      </div>

      <div className="suppliers-card">

        <div className="suppliers-card-header">

          <div>

            <h2>
              Total Expenses
            </h2>

            <p>
              {expenses.length}{" "}
              expense
              {expenses.length ===
              1
                ? ""
                : "s"}{" "}
              recorded
            </p>

          </div>

          <strong>
            {formatMoney(
              totalExpenses
            )}
          </strong>

        </div>

      </div>

      {showForm && (

        <div className="supplier-form-card">

          <div className="supplier-form-heading">

            <div className="section-icon supplier-section-icon">

              <WalletCards
                size={20}
              />

            </div>

            <div>

              <h2>
                {editingId
                  ? "Edit Expense"
                  : "Add Expense"}
              </h2>

              <p>
                Record a business
                operating cost.
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
                  Description *
                </label>

                <input
                  name="title"
                  value={
                    form.title
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Shop rent"
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Category
                </label>

                <select
                  name="category"
                  value={
                    form.category
                  }
                  onChange={
                    handleChange
                  }
                >

                  {categories.map(
                    (
                      category
                    ) => (

                      <option
                        key={
                          category
                        }
                        value={
                          category
                        }
                      >
                        {
                          category
                        }
                      </option>

                    )
                  )}

                </select>

              </div>

              <div className="form-group">

                <label>
                  Amount (
                  {currency ||
                    "KSh"}) *
                </label>

                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={
                    form.amount
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="0.00"
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Expense Date *
                </label>

                <input
                  name="date"
                  type="date"
                  value={
                    form.date
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>

              <div className="form-group supplier-notes">

                <label>
                  Notes
                </label>

                <textarea
                  name="notes"
                  rows="3"
                  value={
                    form.notes
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Optional notes..."
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
                  ? "Update Expense"
                  : "Save Expense"}
              </button>

            </div>

          </form>

        </div>

      )}

      <div className="suppliers-card">

        <div className="suppliers-card-header">

          <div>

            <h2>
              Expense History
            </h2>

            <p>
              Business operating
              expenses.
            </p>

          </div>

          <div className="sales-search">

            <Search
              size={18}
            />

            <input
              placeholder="Search expenses..."
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

        {filteredExpenses
          .length ===
        0 ? (

          <div className="suppliers-empty-state">

            <WalletCards
              size={42}
            />

            <h3>
              {expenses.length ===
              0
                ? "No expenses yet"
                : "No matching expenses"}
            </h3>

            <p>
              {expenses.length ===
              0
                ? "Record your first business expense."
                : "Try another search."}
            </p>

          </div>

        ) : (

          <div className="supplier-list">

            {filteredExpenses.map(
              (
                expense
              ) => (

                <div
                  className="supplier-item"
                  key={
                    expense.id
                  }
                >

                  <div className="supplier-avatar">

                    <WalletCards
                      size={18}
                    />

                  </div>

                  <div className="supplier-main">

                    <h3>
                      {
                        expense.title
                      }
                    </h3>

                    <div className="supplier-details">

                      <span>
                        {
                          expense.category
                        }
                      </span>

                      <span>
                        <CalendarDays
                          size={14}
                        />

                        {
                          expense.date
                        }
                      </span>

                      {expense.userName && (

                        <span>
                          Recorded by{" "}
                          {
                            expense.userName
                          }
                        </span>

                      )}

                    </div>

                    {expense.notes && (

                      <p className="supplier-notes-text">
                        {
                          expense.notes
                        }
                      </p>

                    )}

                  </div>

                  <strong>
                    {formatMoney(
                      expense.amount
                    )}
                  </strong>

                  <div className="supplier-actions">

                    <button
                      type="button"
                      className="icon-button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        handleEdit(
                          expense
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
                          expense
                        )
                      }
                    >
                      <Trash2
                        size={17}
                      />
                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default Expenses;