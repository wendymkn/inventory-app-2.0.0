import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  UserRound,
  CreditCard,
  Banknote,
  Smartphone,
  ReceiptText,
  X,
  Printer,
} from "lucide-react";

import useInventoryStore from "../store/inventoryStore";
import useAuthStore from "../store/authStore";
import useSettingsStore from "../store/settingsStore";

const POS_RESULT_LIMIT = 30;
const EMPTY_PRODUCTS = Object.freeze([]);

const isMlProduct = (unitType) =>
  String(unitType || "").toLowerCase() === "ml";

const formatPosMoney = (currency, amount) =>
  `${currency || "KSh"} ${Number(
    amount || 0
  ).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const ProductBrowser = memo(function ProductBrowser({
  searchTerm,
  setSearchTerm,
  products,
  loadingProducts,
  productLoadError,
  currency,
  onAddToCart,
}) {
  return (
    <section className="pos-catalogue-panel">
      <div className="pos-catalogue-toolbar">
        <div>
          <p className="pos-section-kicker">PRODUCT CATALOGUE</p>
          <h2>Find & add items</h2>
          <span>
            {loadingProducts
              ? "Searching catalogue..."
              : `${products.length} matching item${products.length === 1 ? "" : "s"}`}
          </span>
        </div>

        <div className="pos-search-hero">
          <Search size={19} />
          <input
            type="text"
            placeholder="Search name, brand or category..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />
        </div>
      </div>

      {productLoadError ? (
        <div className="pos-catalogue-state error">
          <ShoppingCart size={38} />
          <h3>Could not load products</h3>
          <p>{productLoadError}</p>
        </div>
      ) : loadingProducts ? (
        <div className="pos-catalogue-state">
          <ShoppingCart size={38} />
          <h3>Loading products...</h3>
          <p>Fetching matching stock from GlamStock.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="pos-catalogue-state">
          <ShoppingCart size={38} />
          <h3>No products found</h3>
          <p>Try another name, brand or category.</p>
        </div>
      ) : (
        <div className="pos-product-grid">
          {products.map((product) => (
            <article
              key={product.id}
              className="pos-product-card"
            >
              <div className="pos-product-card-top">
                <div className="pos-product-avatar">
                  {String(product.name || "P")
                    .trim()
                    .charAt(0)
                    .toUpperCase() || "P"}
                </div>

                <div className="pos-product-copy">
                  <h3>{product.name}</h3>
                  <p>
                    {[product.brand, product.category]
                      .filter(Boolean)
                      .join(" · ") || "General product"}
                  </p>
                </div>

                <span className="pos-stock-pill">
                  {product.stock} {product.unitType}
                </span>
              </div>

              <div className="pos-product-card-bottom">
                <div>
                  <small>Selling price</small>
                  <strong>
                    {formatPosMoney(
                      currency,
                      product.sellingPrice
                    )}
                  </strong>
                </div>

                <button
                  type="button"
                  className="pos-add-button"
                  onClick={() => onAddToCart(product)}
                >
                  <Plus size={17} />
                  Add
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
});

function POS() {
  // ==========================================
  // STORES
  // ==========================================

  const hasDesktopPagedProducts =
    typeof window !== "undefined" &&
    Boolean(window.glamstock?.products?.getPage);

  const products = useInventoryStore(
    (state) =>
      hasDesktopPagedProducts
        ? EMPTY_PRODUCTS
        : state.products
  );

  const customers = useInventoryStore(
    (state) => state.customers
  );

  const localCheckoutSale = useInventoryStore(
    (state) => state.checkoutSale
  );

  const hasDesktopCheckout =
    typeof window !== "undefined" &&
    Boolean(
      window.glamstock
        ?.sales
        ?.checkout
    );

  const currentUser = useAuthStore(
    (state) => state.currentUser
  );

  const business = useSettingsStore(
    (state) => state.business
  );

  const currency = useSettingsStore(
    (state) => state.currency
  );

  // ==========================================
  // STATE
  // ==========================================

  const [searchTerm, setSearchTerm] =
    useState("");

  const [cart, setCart] = useState([]);

  const [customerId, setCustomerId] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("Cash");

  const [discount, setDiscount] =
    useState("");

  const [amountPaid, setAmountPaid] =
    useState("");

  const [receipt, setReceipt] =
    useState(null);

  const [posProducts, setPosProducts] =
    useState([]);

  const [debouncedSearch, setDebouncedSearch] =
    useState("");

  const [loadingProducts, setLoadingProducts] =
    useState(false);

  const [productLoadError, setProductLoadError] =
    useState("");

  const [refreshToken, setRefreshToken] =
    useState(0);

  // ==========================================
  // HELPERS
  // ==========================================

  const formatMoney = (amount) => {
    return `${currency || "KSh"} ${Number(
      amount || 0
    ).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };


  // ==========================================
  // PRODUCT SEARCH
  // ==========================================

  useEffect(() => {
    if (!hasDesktopPagedProducts) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setDebouncedSearch(
        searchTerm.trim()
      );
    }, 250);

    return () =>
      window.clearTimeout(timer);
  }, [searchTerm, hasDesktopPagedProducts]);

  useEffect(() => {
    if (!hasDesktopPagedProducts) {
      return undefined;
    }

    let cancelled = false;

    const loadProducts = async () => {
      setLoadingProducts(true);
      setProductLoadError("");

      try {
        const result =
          await window.glamstock.products.getPage({
            page: 1,
            limit: POS_RESULT_LIMIT,
            search: debouncedSearch,
            inStockOnly: true,
          });

        if (!cancelled) {
          setPosProducts(
            Array.isArray(result?.products)
              ? result.products
              : []
          );
        }
      } catch (error) {
        if (!cancelled) {
          setPosProducts([]);
          setProductLoadError(
            error?.message ||
              "Could not load products."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    hasDesktopPagedProducts,
    refreshToken,
  ]);

  const fallbackProducts = useMemo(() => {
    const search =
      searchTerm.trim().toLowerCase();

    return products
      .filter((product) => {
        const matchesSearch =
          product.name
            ?.toLowerCase()
            .includes(search) ||
          product.brand
            ?.toLowerCase()
            .includes(search) ||
          product.category
            ?.toLowerCase()
            .includes(search);

        const hasStock =
          Number(product.stock || 0) > 0;

        return matchesSearch && hasStock;
      })
      .slice(0, POS_RESULT_LIMIT);
  }, [products, searchTerm]);

  const availableProducts =
    hasDesktopPagedProducts
      ? posProducts
      : fallbackProducts;

  // ==========================================
  // ADD TO CART
  // ==========================================

  const addToCart = useCallback((product) => {
    setCart((current) => {
      const existing = current.find(
        (item) =>
          item.productId === product.id
      );

      if (existing) {
        const newQuantity =
          Number(existing.quantity) + 1;

        if (
          newQuantity >
          Number(product.stock || 0)
        ) {
          alert(
            `Only ${product.stock} ${product.unitType} available.`
          );
          return current;
        }

        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: newQuantity,
              }
            : item
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          productName: product.name,
          brand: product.brand || "",
          unitType: product.unitType,
          sellingPrice: Number(
            product.sellingPrice || 0
          ),
          quantity: 1,
          stock: Number(
            product.stock || 0
          ),
        },
      ];
    });
  }, []);

  // ==========================================
  // UPDATE QUANTITY
  // ==========================================

  const updateQuantity = (
    productId,
    newQuantity
  ) => {
    const product = cart.find(
      (item) => item.productId === productId
    );

    if (!product) {
      return;
    }

    let qty = Number(newQuantity);

    if (!Number.isFinite(qty)) {
      return;
    }

    if (!isMlProduct(product.unitType)) {
      qty = Math.floor(qty);
    }

    if (qty <= 0) {
      qty = 1;
    }

    if (
      qty >
      Number(product.stock || 0)
    ) {
      alert(
        `Only ${product.stock} ${product.unitType} available.`
      );

      qty = Number(product.stock || 0);
    }

    setCart((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: qty,
            }
          : item
      )
    );
  };

  const updateQuantityDraft = (
    productId,
    value
  ) => {
    setCart((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: value,
            }
          : item
      )
    );
  };

  const commitQuantity = (productId) => {
    const product = cart.find(
      (item) => item.productId === productId
    );

    if (!product) {
      return;
    }

    const raw = String(
      product.quantity ?? ""
    ).trim();

    if (!raw) {
      alert(
        `Enter a valid quantity for ${product.productName}.`
      );

      updateQuantity(
        productId,
        1
      );

      return;
    }

    let qty = Number(raw);

    if (
      !Number.isFinite(qty) ||
      qty <= 0
    ) {
      alert(
        `Enter a valid quantity for ${product.productName}.`
      );

      updateQuantity(
        productId,
        1
      );

      return;
    }

    if (
      !isMlProduct(product.unitType) &&
      !Number.isInteger(qty)
    ) {
      alert(
        `${product.productName} is sold by piece. Use a whole number.`
      );

      qty = Math.max(
        1,
        Math.floor(qty)
      );
    }

    if (
      qty >
      Number(product.stock || 0)
    ) {
      alert(
        `Only ${product.stock} ${product.unitType} available.`
      );

      qty = Number(product.stock || 0);
    }

    updateQuantity(
      productId,
      isMlProduct(product.unitType)
        ? Number(qty.toFixed(2))
        : qty
    );
  };

  const increaseQuantity = (item) => {
    updateQuantity(
      item.productId,
      Number(item.quantity) + 1
    );
  };

  const decreaseQuantity = (item) => {
    const amount =
      isMlProduct(item.unitType)
        ? 1
        : 1;

    updateQuantity(
      item.productId,
      Number(item.quantity) - amount
    );
  };

  // ==========================================
  // REMOVE FROM CART
  // ==========================================

  const removeFromCart = (productId) => {
    setCart((current) =>
      current.filter(
        (item) =>
          item.productId !== productId
      )
    );
  };

  const clearCart = () => {
    if (cart.length === 0) {
      return;
    }

    const confirmed =
      window.confirm(
        "Remove all products from the cart?"
      );

    if (!confirmed) {
      return;
    }

    setCart([]);
    setDiscount("");
    setAmountPaid("");
  };

  // ==========================================
  // TOTALS
  // ==========================================

  const subtotal = cart.reduce(
    (total, item) => {
      return (
        total +
        Number(item.quantity || 0) *
          Number(
            item.sellingPrice || 0
          )
      );
    },
    0
  );

  const discountAmount = Math.min(
    Math.max(
      Number(discount || 0),
      0
    ),
    subtotal
  );

  const grandTotal =
    subtotal - discountAmount;

  const paidAmount =
    paymentMethod === "Cash"
      ? Number(amountPaid || 0)
      : grandTotal;

  const change =
    paymentMethod === "Cash"
      ? Math.max(
          paidAmount - grandTotal,
          0
        )
      : 0;

  const cashValue =
    String(amountPaid ?? "").trim();

  const hasCashValue =
    cashValue !== "";

  const cashIsInvalid =
    paymentMethod === "Cash" &&
    hasCashValue &&
    (
      !Number.isFinite(Number(cashValue)) ||
      Number(cashValue) < 0
    );

  const cashIsShort =
    paymentMethod === "Cash" &&
    hasCashValue &&
    !cashIsInvalid &&
    paidAmount < grandTotal;

  const cashShortfall =
    cashIsShort
      ? Math.max(grandTotal - paidAmount, 0)
      : 0;

  const quickCashOptions = useMemo(() => {
    if (grandTotal <= 0) {
      return [];
    }

    const candidates = [
      grandTotal,
      Math.ceil(grandTotal / 50) * 50,
      Math.ceil(grandTotal / 100) * 100,
      Math.ceil(grandTotal / 500) * 500,
      Math.ceil(grandTotal / 1000) * 1000,
    ];

    return Array.from(
      new Set(
        candidates
          .map((value) =>
            Number(value.toFixed(2))
          )
          .filter((value) =>
            value >= grandTotal
          )
      )
    ).slice(0, 4);
  }, [grandTotal]);

  // ==========================================
  // CUSTOMER
  // ==========================================

  const selectedCustomer =
    customers.find(
      (customer) =>
        String(customer.id) ===
        String(customerId)
    ) || null;

  // ==========================================
  // CHECKOUT
  // ==========================================

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert(
        "Add at least one product to the cart."
      );
      return;
    }

    const invalidItem = cart.find(
      (item) =>
        !Number(item.quantity) ||
        Number(item.quantity) <= 0
    );

    if (invalidItem) {
      alert(
        `Please enter a valid quantity for ${invalidItem.productName}.`
      );
      return;
    }

    if (
      paymentMethod === "Cash" &&
      !hasCashValue
    ) {
      alert(
        "Enter the cash amount received before completing the sale."
      );
      return;
    }

    if (cashIsInvalid) {
      alert(
        "Enter a valid cash amount."
      );
      return;
    }

    if (cashIsShort) {
      alert(
        `Cash received is short by ${formatMoney(cashShortfall)}.`
      );
      return;
    }

    const checkoutData = {
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: Number(
          item.quantity
        ),
      })),

      customerId:
        selectedCustomer?.id || null,

      customerName:
        selectedCustomer?.name ||
        "Walk-in Customer",

      cashierId:
        currentUser?.id || null,

      cashierName:
        currentUser?.name ||
        currentUser?.username ||
        "Unknown Cashier",

      discount:
        discountAmount,

      paymentMethod,

      amountPaid:
        paymentMethod === "Cash"
          ? paidAmount
          : grandTotal,

      businessSnapshot:
        business || null,

      currencySnapshot:
        currency || "KSh",
    };

    let result;

    try {
      result =
        hasDesktopCheckout
          ? await window.glamstock
              .sales
              .checkout(
                checkoutData
              )
          : localCheckoutSale(
              checkoutData
            );
    } catch (error) {
      console.error(
        "POS checkout failed:",
        error
      );

      alert(
        error?.message ||
          "Could not complete the sale."
      );

      return;
    }

    if (!result?.success) {
      alert(
        result?.message ||
          "Could not complete the sale."
      );
      return;
    }

    if (
      hasDesktopCheckout &&
      result?.transaction
    ) {
      useInventoryStore
        .setState(
          (state) => ({
            transactions: [
              result.transaction,
              ...state.transactions,
            ],
          })
        );
    }

    setReceipt(
      result.transaction
    );

    // Reset POS after successful sale
    setCart([]);
    setCustomerId("");
    setDiscount("");
    setAmountPaid("");
    setPaymentMethod("Cash");
    setSearchTerm("");
    setRefreshToken(
      (value) => value + 1
    );
  };

  // ==========================================
  // PRINT RECEIPT
  // ==========================================

  const printReceipt = () => {
    if (!receipt) {
      return;
    }

    window.print();
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="pos-page">

      {/* ======================================
          PRINT CSS

          This makes ONLY the receipt print.
          Sidebar, dashboard, POS and buttons
          are completely hidden.
         ====================================== */}

      <style>
        {`
          .pos-sticky-checkout {
            position: sticky;
            top: 16px;
            align-self: start;
          }

          @media print {

            @page {
              margin: 0;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            body * {
              visibility: hidden !important;
            }

            .receipt-overlay,
            .receipt-modal,
            .receipt-print-area,
            .receipt-print-area * {
              visibility: visible !important;
            }

            .receipt-overlay {
              position: static !important;
              inset: auto !important;
              display: block !important;
              width: auto !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            .receipt-modal {
              position: static !important;
              width: auto !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: white !important;
              overflow: visible !important;
            }

            .receipt-actions,
            .no-print {
              display: none !important;
            }

            .receipt-print-area {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;

              width: 80mm !important;
              max-width: 80mm !important;

              margin: 0 !important;
              padding: 5mm 4mm !important;

              box-sizing: border-box !important;

              background: white !important;
              color: black !important;

              font-family:
                Arial,
                Helvetica,
                sans-serif !important;

              font-size: 11px !important;
            }

            .receipt-header {
              text-align: center !important;
              margin-bottom: 10px !important;
            }

            .receipt-header svg {
              display: none !important;
            }

            .receipt-header h2 {
              margin: 0 0 4px !important;
              font-size: 17px !important;
              font-weight: 700 !important;
            }

            .receipt-header p {
              margin: 2px 0 !important;
              font-size: 10px !important;
            }

            .receipt-title {
              margin-top: 8px !important;
              font-weight: bold !important;
              letter-spacing: 1px !important;
            }

            .receipt-info {
              margin: 10px 0 !important;
            }

            .receipt-info p {
              margin: 3px 0 !important;
              font-size: 10px !important;
            }

            .receipt-item {
              display: flex !important;
              justify-content: space-between !important;
              align-items: flex-start !important;
              gap: 8px !important;
              margin: 7px 0 !important;

              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .receipt-item p {
              margin: 2px 0 0 !important;
              font-size: 9px !important;
            }

            .receipt-item > strong {
              white-space: nowrap !important;
            }

            .receipt-total-row {
              display: flex !important;
              justify-content: space-between !important;
              gap: 10px !important;
              margin: 4px 0 !important;

              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .receipt-grand-total {
              font-size: 13px !important;
              font-weight: bold !important;
              margin-top: 7px !important;
              margin-bottom: 7px !important;
            }

            .receipt-footer {
              text-align: center !important;
              margin-top: 14px !important;
            }

            .receipt-footer p {
              margin: 3px 0 !important;
              font-size: 10px !important;
            }

            .receipt-footer small {
              font-size: 8px !important;
            }

            .receipt-print-area hr {
              border: none !important;
              border-top: 1px dashed black !important;
              margin: 8px 0 !important;
            }
          }
        `}
      </style>

      {/* ======================================
          PAGE HEADER
         ====================================== */}

      <div className="page-header">
        <div>
          <p className="dashboard-label">
            POINT OF SALE
          </p>

          <h1>Checkout</h1>

          <p>
            Add products, select a customer and
            complete the sale.
          </p>
        </div>
      </div>

      <div className="pos-terminal-layout">
        <ProductBrowser
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          products={availableProducts}
          loadingProducts={loadingProducts}
          productLoadError={productLoadError}
          currency={currency}
          onAddToCart={addToCart}
        />

        <aside className="pos-checkout-panel pos-sticky-checkout">
          <div className="pos-checkout-header">
            <div className="pos-checkout-title">
              <div className="pos-checkout-icon">
                <ShoppingCart size={20} />
              </div>

              <div>
                <p>ACTIVE SALE</p>
                <h2>Cart</h2>
                <span>
                  {cart.length} item{cart.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                className="pos-clear-button"
                onClick={clearCart}
              >
                <Trash2 size={15} />
                Clear
              </button>
            )}
          </div>

          <div className="pos-cart-body">
            {cart.length === 0 ? (
              <div className="pos-cart-empty">
                <div className="pos-cart-empty-icon">
                  <ShoppingCart size={27} />
                </div>
                <h3>Your cart is empty</h3>
                <p>Add a product from the catalogue to start a sale.</p>
              </div>
            ) : (
              <div className="pos-cart-list">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="pos-cart-row"
                  >
                    <div className="pos-cart-row-copy">
                      <strong>{item.productName}</strong>
                      <span>
                        {formatMoney(item.sellingPrice)} / {item.unitType}
                      </span>
                    </div>

                    <div className="pos-quantity-controls pos-quantity-compact">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => decreaseQuantity(item)}
                      >
                        <Minus size={14} />
                      </button>

                      <input
                        type="number"
                        min={isMlProduct(item.unitType) ? "0.01" : "1"}
                        step={isMlProduct(item.unitType) ? "0.01" : "1"}
                        value={item.quantity}
                        onChange={(event) =>
                          updateQuantityDraft(
                            item.productId,
                            event.target.value
                          )
                        }
                        onBlur={() =>
                          commitQuantity(item.productId)
                        }
                      />

                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => increaseQuantity(item)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="pos-cart-row-total">
                      <strong>
                        {formatMoney(
                          Number(item.quantity || 0) *
                            Number(item.sellingPrice || 0)
                        )}
                      </strong>

                      <button
                        type="button"
                        className="pos-remove-line"
                        title="Remove from cart"
                        onClick={() =>
                          removeFromCart(item.productId)
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pos-checkout-form">
            <div className="pos-field-grid">
              <div className="form-group pos-field-full">
                <label>
                  <UserRound size={15} />
                  Customer
                </label>

                <select
                  value={customerId}
                  onChange={(event) =>
                    setCustomerId(event.target.value)
                  }
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Discount</label>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  step="0.01"
                  value={discount}
                  onChange={(event) =>
                    setDiscount(event.target.value)
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Payment</label>
                <div className="pos-payment-tabs">
                  {[
                    ["Cash", Banknote],
                    ["M-Pesa", Smartphone],
                    ["Card", CreditCard],
                  ].map(([method, Icon]) => (
                    <button
                      key={method}
                      type="button"
                      className={
                        paymentMethod === method
                          ? "pos-payment-tab active"
                          : "pos-payment-tab"
                      }
                      onClick={() => {
                        setPaymentMethod(method);
                        setAmountPaid("");
                      }}
                    >
                      <Icon size={15} />
                      <span>{method}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {paymentMethod === "Cash" && (
              <div className="pos-cash-block">
                <div className="form-group">
                  <label>Cash received</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountPaid}
                    onChange={(event) =>
                      setAmountPaid(event.target.value)
                    }
                    className={
                      cashIsInvalid || cashIsShort
                        ? "field-invalid"
                        : undefined
                    }
                    aria-invalid={
                      cashIsInvalid || cashIsShort
                        ? "true"
                        : "false"
                    }
                    placeholder="Enter amount"
                  />

                  {cashIsInvalid && (
                    <div
                      className="pos-payment-warning"
                      role="alert"
                    >
                      Enter a valid cash amount.
                    </div>
                  )}

                  {cashIsShort && (
                    <div
                      className="pos-payment-warning"
                      role="alert"
                    >
                      Short by {formatMoney(cashShortfall)}.
                      Add more cash before completing the sale.
                    </div>
                  )}
                </div>

                {quickCashOptions.length > 0 && (
                  <div className="pos-quick-cash">
                    {quickCashOptions.map((value, index) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setAmountPaid(String(value))
                        }
                      >
                        {index === 0
                          ? "Exact"
                          : Number(value).toLocaleString()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pos-total-card">
            <div className="pos-total-row subtle">
              <span>Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>

            <div className="pos-total-row subtle">
              <span>Discount</span>
              <strong>- {formatMoney(discountAmount)}</strong>
            </div>

            <div className="pos-grand-total">
              <span>Total due</span>
              <strong>{formatMoney(grandTotal)}</strong>
            </div>

            {paymentMethod === "Cash" && (
              <div className="pos-change-strip">
                <span>Change</span>
                <strong>{formatMoney(change)}</strong>
              </div>
            )}
          </div>

          <button
            type="button"
            className="primary-button pos-complete-sale"
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            {paymentMethod === "Cash" && <Banknote size={18} />}
            {paymentMethod === "M-Pesa" && <Smartphone size={18} />}
            {paymentMethod === "Card" && <CreditCard size={18} />}
            Complete Sale
          </button>
        </aside>
      </div>

      {/* ========================================
          RECEIPT MODAL
         ======================================== */}

      {receipt && (
        <div className="receipt-overlay">

          <div className="receipt-modal">

            {/* BUTTONS - WILL NOT PRINT */}

            <div className="receipt-actions no-print">

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setReceipt(null)
                }
              >
                <X size={17} />
                Close
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={printReceipt}
              >
                <Printer size={17} />
                Print Receipt
              </button>

            </div>

            {/* ==================================
                PRINTABLE RECEIPT
               ================================== */}

            <div className="receipt-print-area">

              {/* BUSINESS */}

              <div className="receipt-header">

                <ReceiptText size={30} />

                <h2>
                  {business?.name ||
                    "GlamStock Beauty Store"}
                </h2>

                {business?.address && (
                  <p>
                    {business.address}
                  </p>
                )}

                {business?.phone && (
                  <p>
                    Tel:{" "}
                    {business.phone}
                  </p>
                )}

                {business?.email && (
                  <p>
                    {business.email}
                  </p>
                )}

                <p className="receipt-title">
                  SALES RECEIPT
                </p>

              </div>

              <hr />

              {/* SALE INFO */}

              <div className="receipt-info">

                <p>
                  <strong>
                    Receipt:
                  </strong>{" "}
                  {receipt.receiptNumber}
                </p>

                <p>
                  <strong>
                    Date:
                  </strong>{" "}
                  {new Date(
                    receipt.date
                  ).toLocaleString()}
                </p>

                <p>
                  <strong>
                    Cashier:
                  </strong>{" "}
                  {receipt.cashierName}
                </p>

                <p>
                  <strong>
                    Customer:
                  </strong>{" "}
                  {receipt.customerName}
                </p>

              </div>

              <hr />

              {/* ITEMS */}

              {receipt.items.map(
                (item) => (
                  <div
                    key={item.productId}
                    className="receipt-item"
                  >

                    <div>

                      <strong>
                        {item.productName}
                      </strong>

                      {item.brand && (
                        <p>
                          {item.brand}
                        </p>
                      )}

                      <p>
                        {item.quantity}{" "}
                        {item.unitType} ×{" "}
                        {formatMoney(
                          item.sellingPrice
                        )}
                      </p>

                    </div>

                    <strong>
                      {formatMoney(
                        item.total
                      )}
                    </strong>

                  </div>
                )
              )}

              <hr />

              {/* TOTALS */}

              <div className="receipt-total-row">

                <span>
                  Subtotal
                </span>

                <strong>
                  {formatMoney(
                    receipt.subtotal
                  )}
                </strong>

              </div>

              {Number(
                receipt.discount || 0
              ) > 0 && (
                <div className="receipt-total-row">

                  <span>
                    Discount
                  </span>

                  <strong>
                    -{" "}
                    {formatMoney(
                      receipt.discount
                    )}
                  </strong>

                </div>
              )}

              <div className="receipt-total-row receipt-grand-total">

                <span>
                  TOTAL
                </span>

                <strong>
                  {formatMoney(
                    receipt.total
                  )}
                </strong>

              </div>

              <hr />

              {/* PAYMENT */}

              <div className="receipt-total-row">

                <span>
                  Payment
                </span>

                <strong>
                  {receipt.paymentMethod}
                </strong>

              </div>

              <div className="receipt-total-row">

                <span>
                  Amount Paid
                </span>

                <strong>
                  {formatMoney(
                    receipt.amountPaid
                  )}
                </strong>

              </div>

              {receipt.paymentMethod ===
                "Cash" && (
                <div className="receipt-total-row">

                  <span>
                    Change
                  </span>

                  <strong>
                    {formatMoney(
                      receipt.change
                    )}
                  </strong>

                </div>
              )}

              <hr />

              {/* FOOTER */}

              <div className="receipt-footer">

                <p>
                  {business?.receiptFooter ||
                    "Thank you for shopping with us!"}
                </p>

                <small>
                  Powered by GlamStock
                </small>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default POS;