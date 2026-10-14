import {
  useState,
} from "react";

import {
  ArrowDownToLine,
  Save,
  PackagePlus,
} from "lucide-react";

import useInventoryStore
  from "../store/inventoryStore";

import useAuthStore
  from "../store/authStore";

import ProductSearchPicker
  from "../components/ProductSearchPicker";

const EMPTY_PRODUCTS =
  Object.freeze([]);

function StockIn() {
  const hasDesktopApi =
    typeof window !==
      "undefined" &&
    Boolean(
      window.glamstock
        ?.stock
        ?.in
    );

  const products =
    useInventoryStore(
      (state) =>
        hasDesktopApi
          ? EMPTY_PRODUCTS
          : state.products
    );

  const localStockIn =
    useInventoryStore(
      (state) =>
        state.stockIn
    );

  const currentUser =
    useAuthStore(
      (state) =>
        state.currentUser
    );

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);

  const [
    quantity,
    setQuantity,
  ] = useState("");

  const [
    reason,
    setReason,
  ] = useState(
    "Stock purchase"
  );

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const unitType =
    selectedProduct?.unitType ??
    selectedProduct?.unit_type ??
    "piece";

  const isMl =
    unitType === "ml";

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        !selectedProduct ||
        saving
      ) {
        if (
          !selectedProduct
        ) {
          alert(
            "Select a product."
          );
        }

        return;
      }

      const quantityNumber =
        Number(
          quantity
        );

      if (
        !Number.isFinite(
          quantityNumber
        ) ||
        quantityNumber <= 0
      ) {
        alert(
          "Enter a valid quantity greater than zero."
        );

        return;
      }

      if (
        unitType ===
          "piece" &&
        !Number.isInteger(
          quantityNumber
        )
      ) {
        alert(
          "Piece products must use whole numbers only."
        );

        return;
      }

      const finalQuantity =
        isMl
          ? Number(
              quantityNumber.toFixed(
                2
              )
            )
          : quantityNumber;

      setSaving(
        true
      );

      try {
        const metadata = {
          reason,

          notes:
            notes.trim(),

          userId:
            currentUser?.id ??
            null,

          userName:
            currentUser?.name ??
            currentUser?.username ??
            "Unknown",
        };

        const result =
          hasDesktopApi
            ? await window
                .glamstock
                .stock
                .in(
                  selectedProduct.id,
                  finalQuantity,
                  metadata
                )
            : localStockIn(
                selectedProduct.id,
                finalQuantity,
                metadata
              );

        if (
          !result?.success
        ) {
          alert(
            result?.message ||
              "Could not add stock."
          );

          return;
        }

        if (
          result?.product
        ) {
          setSelectedProduct(
            result.product
          );
        }

        setQuantity("");
        setNotes("");

        alert(
          `Stock added successfully: ${finalQuantity} ${unitType}`
        );
      } catch (error) {
        console.error(
          "Stock In failed:",
          error
        );

        alert(
          error?.message ||
            "Could not add stock."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            INVENTORY MOVEMENT
          </p>

          <h1>Stock In</h1>

          <p>
            Add newly received
            inventory without creating
            a customer sale.
          </p>
        </div>

        <div className="page-header-chip success">
          <PackagePlus size={16} />
          Receive inventory
        </div>
      </div>

      <div className="panel narrow-panel">
        <div className="panel-header">
          <div>
            <h2>Add Stock</h2>

            <p>
              Search the catalogue,
              choose a product and
              record the delivery.
            </p>
          </div>

          <div className="panel-icon">
            <ArrowDownToLine
              size={22}
            />
          </div>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
        >
          <div className="form-group">
            <label>
              Product
            </label>

            <ProductSearchPicker
              value={
                selectedProduct
              }
              onChange={(
                product
              ) => {
                setSelectedProduct(
                  product
                );

                setQuantity(
                  ""
                );
              }}
              fallbackProducts={
                products
              }
              disabled={
                saving
              }
              placeholder="Search product, brand or category..."
            />
          </div>

          {selectedProduct && (
            <div className="inline-info accent">
              Current stock:{" "}
              <strong>
                {
                  selectedProduct.stock
                }{" "}
                {unitType}
              </strong>
            </div>
          )}

          <div className="form-group">
            <label>
              Quantity
              {selectedProduct
                ? ` (${unitType})`
                : ""}
            </label>

            <input
              type="number"
              min={
                isMl
                  ? "0.01"
                  : "1"
              }
              step={
                isMl
                  ? "0.01"
                  : "1"
              }
              value={
                quantity
              }
              onChange={(
                event
              ) =>
                setQuantity(
                  event.target
                    .value
                )
              }
              placeholder={
                !selectedProduct
                  ? "Select product first"
                  : isMl
                  ? "e.g. 250.50"
                  : "e.g. 10"
              }
              disabled={
                !selectedProduct ||
                saving
              }
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>
                Reason
              </label>

              <select
                value={
                  reason
                }
                onChange={(
                  event
                ) =>
                  setReason(
                    event.target
                      .value
                  )
                }
                disabled={
                  saving
                }
              >
                <option>
                  Stock purchase
                </option>

                <option>
                  Supplier delivery
                </option>

                <option>
                  Stock correction
                </option>

                <option>
                  Return to stock
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Notes
              </label>

              <input
                value={
                  notes
                }
                onChange={(
                  event
                ) =>
                  setNotes(
                    event.target
                      .value
                  )
                }
                placeholder="Optional notes"
                disabled={
                  saving
                }
              />
            </div>
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={
              !selectedProduct ||
              saving
            }
          >
            <Save
              size={18}
            />

            {saving
              ? "Saving..."
              : "Add Stock"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default StockIn;
