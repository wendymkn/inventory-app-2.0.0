import {
  useState,
} from "react";

import {
  ArrowUpFromLine,
  Save,
  TriangleAlert,
  PackageMinus,
} from "lucide-react";

import useInventoryStore
  from "../store/inventoryStore";

import useAuthStore
  from "../store/authStore";

import ProductSearchPicker
  from "../components/ProductSearchPicker";

const EMPTY_PRODUCTS =
  Object.freeze([]);

function StockOut() {
  const hasDesktopApi =
    typeof window !==
      "undefined" &&
    Boolean(
      window.glamstock
        ?.stock
        ?.out
    );

  const products =
    useInventoryStore(
      (state) =>
        hasDesktopApi
          ? EMPTY_PRODUCTS
          : state.products
    );

  const localStockOut =
    useInventoryStore(
      (state) =>
        state.stockOut
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
    "Damaged"
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

      if (
        quantityNumber >
        Number(
          selectedProduct.stock ||
            0
        )
      ) {
        alert(
          `Only ${selectedProduct.stock} ${unitType} available.`
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
                .out(
                  selectedProduct.id,
                  finalQuantity,
                  metadata
                )
            : localStockOut(
                selectedProduct.id,
                finalQuantity,
                metadata
              );

        if (
          !result?.success
        ) {
          alert(
            result?.message ||
              "Could not record Stock Out."
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
          "Stock adjustment recorded."
        );
      } catch (error) {
        console.error(
          "Stock Out failed:",
          error
        );

        alert(
          error?.message ||
            "Could not record Stock Out."
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
            INVENTORY ADJUSTMENT
          </p>

          <h1>Stock Out</h1>

          <p>
            Remove damaged, expired,
            lost or otherwise adjusted
            stock.
          </p>
        </div>

        <div className="page-header-chip danger">
          <PackageMinus size={16} />
          Non-sale adjustment
        </div>
      </div>

      <div className="alert-card warning">
        <TriangleAlert
          size={21}
        />

        <div>
          <strong>
            Stock Out is not a sale.
          </strong>

          <p>
            Use POS for customer
            sales so revenue and
            profit stay accurate.
          </p>
        </div>
      </div>

      <div className="panel narrow-panel">
        <div className="panel-header">
          <div>
            <h2>
              Remove Stock
            </h2>

            <p>
              Search the catalogue
              and record a non-sales
              reduction.
            </p>
          </div>

          <div className="panel-icon danger">
            <ArrowUpFromLine
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
              inStockOnly
              disabled={
                saving
              }
              placeholder="Search in-stock products..."
            />
          </div>

          {selectedProduct && (
            <div className="inline-info accent">
              Available:{" "}
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
              max={
                selectedProduct
                  ?.stock ??
                undefined
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
                  ? "e.g. 10.25"
                  : "e.g. 2"
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
                  Damaged
                </option>

                <option>
                  Expired
                </option>

                <option>
                  Lost
                </option>

                <option>
                  Sample / Tester
                </option>

                <option>
                  Stock correction
                </option>

                <option>
                  Other
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
            className="danger-button"
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
              : "Record Stock Out"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default StockOut;
