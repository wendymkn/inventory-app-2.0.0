import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  Upload,
  Download,
} from "lucide-react";

import useInventoryStore
  from "../store/inventoryStore";

import useAuthStore
  from "../store/authStore";

import useSettingsStore
  from "../store/settingsStore";

import {
  PRODUCT_CSV_TEMPLATE,
  productsFromCsv,
} from "../utils/productCsv";

const DESKTOP_PAGE_SIZE =
  100;

const emptyForm = {
  name: "",
  brand: "",
  category: "",
  unitType: "piece",
  buyingPrice: "",
  sellingPrice: "",
  stock: "",
  lowStockLevel: "",
  supplier: "",
};

function Products() {
  const products =
    useInventoryStore(
      (state) =>
        state.products
    );

  const suppliers =
    useInventoryStore(
      (state) =>
        state.suppliers
    );

  /*
    Browser-only fallbacks.

    Electron will use SQLite.
  */

  const addLocalProduct =
    useInventoryStore(
      (state) =>
        state.addProduct
    );

  const updateLocalProduct =
    useInventoryStore(
      (state) =>
        state.updateProduct
    );

  const deleteLocalProduct =
    useInventoryStore(
      (state) =>
        state.deleteProduct
    );

  const hasPermission =
    useAuthStore(
      (state) =>
        state.hasPermission
    );

  const currency =
    useSettingsStore(
      (state) =>
        state.currency
    );

  const canManage =
    hasPermission(
      "manage_products"
    );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

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

  const [
    importing,
    setImporting,
  ] = useState(false);

  const importInputRef =
    useRef(null);

  const [
    pageProducts,
    setPageProducts,
  ] = useState([]);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    pageInfo,
    setPageInfo,
  ] = useState({
    total: 0,
    page: 1,
    limit:
      DESKTOP_PAGE_SIZE,
    totalPages: 1,
    search: "",
  });

  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState("");

  const [
    loadingProducts,
    setLoadingProducts,
  ] = useState(false);

  const [
    productLoadError,
    setProductLoadError,
  ] = useState("");

  const [
    refreshToken,
    setRefreshToken,
  ] = useState(0);

  const hasDesktopApi =
    typeof window !==
      "undefined" &&
    Boolean(
      window.glamstock
        ?.products
    );

  const formatMoney = (
    amount
  ) =>
    `${currency} ${Number(
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

  const filteredProducts =
    useMemo(() => {
      /*
        Browser fallback only.

        Electron uses SQLite-side
        searching and pagination.
      */

      if (
        hasDesktopApi
      ) {
        return products;
      }

      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return products.filter(
        (product) =>
          product.name
            ?.toLowerCase()
            .includes(
              search
            ) ||

          product.brand
            ?.toLowerCase()
            .includes(
              search
            ) ||

          product.category
            ?.toLowerCase()
            .includes(
              search
            )
      );
    }, [
      hasDesktopApi,
      products,
      searchTerm,
    ]);

  const displayedProducts =
    hasDesktopApi
      ? pageProducts
      : filteredProducts;

  const displayedTotal =
    hasDesktopApi
      ? pageInfo.total
      : filteredProducts.length;

  useEffect(() => {
    if (
      !hasDesktopApi
    ) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () => {
          setPage(1);

          setDebouncedSearch(
            searchTerm.trim()
          );
        },
        250
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    hasDesktopApi,
    searchTerm,
  ]);

  useEffect(() => {
    if (
      !hasDesktopApi
    ) {
      return undefined;
    }

    let cancelled =
      false;

    const loadPage =
      async () => {
        setLoadingProducts(
          true
        );

        setProductLoadError(
          ""
        );

        try {
          const result =
            await window
              .glamstock
              .products
              .getPage({
                page,

                limit:
                  DESKTOP_PAGE_SIZE,

                search:
                  debouncedSearch,
              });

          if (
            cancelled
          ) {
            return;
          }

          const nextProducts =
            Array.isArray(
              result?.products
            )
              ? result.products
              : [];

          const nextPage =
            Number(
              result?.page ||
                1
            );

          setPageProducts(
            nextProducts
          );

          setPageInfo({
            total:
              Number(
                result?.total ||
                  0
              ),

            page:
              nextPage,

            limit:
              Number(
                result?.limit ||
                  DESKTOP_PAGE_SIZE
              ),

            totalPages:
              Math.max(
                1,
                Number(
                  result?.totalPages ||
                    1
                )
              ),

            search:
              String(
                result?.search ||
                  ""
              ),
          });

          if (
            nextPage !== page
          ) {
            setPage(
              nextPage
            );
          }
        } catch (error) {
          if (
            cancelled
          ) {
            return;
          }

          console.error(
            "Product page load failed:",
            error
          );

          setPageProducts(
            []
          );

          setProductLoadError(
            error?.message ||
              "Could not load products."
          );
        } finally {
          if (
            !cancelled
          ) {
            setLoadingProducts(
              false
            );
          }
        }
      };

    loadPage();

    return () => {
      cancelled =
        true;
    };
  }, [
    hasDesktopApi,
    page,
    debouncedSearch,
    refreshToken,
  ]);

  const refreshProductsPage =
    () => {
      setRefreshToken(
        (current) =>
          current + 1
      );
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

      if (
        !canManage ||
        saving
      ) {
        return;
      }

      const data = {
        ...form,

        name:
          form.name.trim(),

        brand:
          form.brand.trim(),

        category:
          form.category.trim(),

        supplier:
          form.supplier.trim(),

        buyingPrice:
          Number(
            form.buyingPrice ||
              0
          ),

        sellingPrice:
          Number(
            form.sellingPrice ||
              0
          ),

        stock:
          Number(
            form.stock ||
              0
          ),

        lowStockLevel:
          Number(
            form.lowStockLevel ||
              0
          ),
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
                  .products
                  .update(
                    editingId,
                    data
                  )
              : await window
                  .glamstock
                  .products
                  .create(
                    data
                  );
        } else {
          result =
            editingId
              ? updateLocalProduct(
                  editingId,
                  data
                )
              : addLocalProduct(
                  data
                );
        }

        if (
          !result?.success
        ) {
          alert(
            result?.message ||
              "Could not save product."
          );

          return;
        }

        if (
          hasDesktopApi
        ) {
          const savedProduct =
            result?.product;

          if (
            savedProduct
          ) {
            useInventoryStore
              .setState(
                (state) => ({
                  products:
                    editingId
                      ? state.products.map(
                          (
                            product
                          ) =>
                            product.id ===
                            savedProduct.id
                              ? savedProduct
                              : product
                        )
                      : [
                          savedProduct,
                          ...state.products,
                        ],
                })
              );
          }

          if (
            !editingId
          ) {
            setPage(1);
          }

          refreshProductsPage();
        }

        resetForm();
      } catch (error) {
        console.error(
          "Product save failed:",
          error
        );

        alert(
          error?.message ||
            "Could not save product."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  const handleEdit =
    (product) => {
      if (
        !canManage
      ) {
        return;
      }

      setForm({
        name:
          product.name ||
          "",

        brand:
          product.brand ||
          "",

        category:
          product.category ||
          "",

        unitType:
          product.unitType ||
          product.unit_type ||
          "piece",

        buyingPrice:
          String(
            product.buyingPrice ??
              product.buying_price ??
              0
          ),

        sellingPrice:
          String(
            product.sellingPrice ??
              product.selling_price ??
              product.price ??
              0
          ),

        stock:
          String(
            product.stock ??
              0
          ),

        lowStockLevel:
          String(
            product.lowStockLevel ??
              product.low_stock_level ??
              0
          ),

        supplier:
          product.supplier ||
          "",
      });

      setEditingId(
        product.id
      );

      setShowForm(
        true
      );
    };

  const downloadCsvTemplate =
    () => {
      const blob =
        new Blob(
          [PRODUCT_CSV_TEMPLATE],
          {
            type:
              "text/csv;charset=utf-8",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;
      link.download =
        "GlamStock-Product-Import-Template.csv";

      document.body
        .appendChild(link);

      link.click();
      link.remove();

      URL.revokeObjectURL(
        url
      );
    };

  const handleCsvImport =
    async (event) => {
      const file =
        event.target
          .files?.[0];

      event.target.value =
        "";

      if (
        !file ||
        !canManage ||
        importing
      ) {
        return;
      }

      setImporting(true);

      try {
        const text =
          await file.text();

        const productsToImport =
          productsFromCsv(
            text
          );

        if (
          productsToImport
            .length === 0
        ) {
          alert(
            "No product rows were found in the CSV file."
          );

          return;
        }

        const confirmed =
          window.confirm(
            `Import ${productsToImport.length.toLocaleString()} product rows from "${file.name}"?\n\nExisting matching products will be skipped. Invalid rows will stop the import so you can correct the CSV.`
          );

        if (!confirmed) {
          return;
        }

        if (
          !window.glamstock
            ?.products
            ?.importBatch
        ) {
          alert(
            "Bulk import is only available in the GlamStock desktop application."
          );

          return;
        }

        const result =
          await window
            .glamstock
            .products
            .importBatch(
              productsToImport
            );

        if (
          !result?.success
        ) {
          const errors =
            Array.isArray(
              result?.errors
            )
              ? result.errors
              : [];

          const detail =
            errors
              .slice(0, 10)
              .map(
                (item) =>
                  `Row ${item.row}: ${item.message}`
              )
              .join("\n");

          alert(
            [
              result?.message ||
                "Import failed.",
              detail,
              Number(
                result?.errorCount ||
                  errors.length
              ) > 10
                ? `...and ${
                    Number(
                      result?.errorCount ||
                        errors.length
                    ) - 10
                  } more error(s).`
                : "",
            ]
              .filter(Boolean)
              .join("\n\n")
          );

          return;
        }

        alert(
          result.message ||
            `${result.imported || 0} products imported successfully.`
        );

        setPage(1);
        setSearchTerm("");
        setDebouncedSearch("");
        refreshProductsPage();
      } catch (error) {
        console.error(
          "CSV product import failed:",
          error
        );

        alert(
          error?.message ||
            "Could not import the CSV file."
        );
      } finally {
        setImporting(false);
      }
    };

  const handleDelete =
    async (
      product
    ) => {
      if (
        !canManage ||
        saving
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Remove "${product.name}" from the active product list?`
        );

      if (
        !confirmed
      ) {
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
                .products
                .remove(
                  product.id
                )
            : deleteLocalProduct(
                product.id
              );

        if (
          !result?.success
        ) {
          alert(
            result?.message ||
              "Could not remove product."
          );

          return;
        }

        if (
          hasDesktopApi
        ) {
          useInventoryStore
            .setState(
              (state) => ({
                products:
                  state.products
                    .filter(
                      (
                        item
                      ) =>
                        item.id !==
                        product.id
                    ),
              })
            );

          refreshProductsPage();
        }
      } catch (error) {
        console.error(
          "Product removal failed:",
          error
        );

        alert(
          error?.message ||
            "Could not remove product."
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
            INVENTORY CATALOGUE
          </p>

          <h1>
            Products
          </h1>

          <p>
            Manage products,
            prices, units and
            stock thresholds.
          </p>

        </div>

        {canManage && (
          <div className="header-actions">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={
                handleCsvImport
              }
            />

            <button
              type="button"
              className="secondary-button"
              disabled={
                saving ||
                importing
              }
              onClick={
                downloadCsvTemplate
              }
            >
              <Download
                size={18}
              />
              CSV Template
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={
                saving ||
                importing
              }
              onClick={() =>
                importInputRef
                  .current
                  ?.click()
              }
            >
              <Upload
                size={18}
              />
              {importing
                ? "Importing..."
                : "Import Products"}
            </button>

            <button
              type="button"
              className="primary-button"
              disabled={
                saving ||
                importing
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
                  Add Product
                </>
              )}
            </button>
          </div>
        )}

      </div>

      {showForm &&
        canManage && (

        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                {editingId
                  ? "Edit Product"
                  : "Add Product"}
              </h2>

              <p>
                Piece products use
                whole stock quantities.
                Perfume measured in ml
                can use decimals.
              </p>

            </div>

          </div>

          <form
            onSubmit={
              handleSubmit
            }
            className="form-grid"
          >

            <div className="form-group">

              <label>
                Product Name *
              </label>

              <input
                name="name"
                value={
                  form.name
                }
                onChange={
                  handleChange
                }
                placeholder="e.g. Vanilla Perfume"
                required
              />

            </div>

            <div className="form-group">

              <label>
                Brand
              </label>

              <input
                name="brand"
                value={
                  form.brand
                }
                onChange={
                  handleChange
                }
                placeholder="Optional"
              />

            </div>

            <div className="form-group">

              <label>
                Category
              </label>

              <input
                name="category"
                value={
                  form.category
                }
                onChange={
                  handleChange
                }
                placeholder="e.g. Perfume"
              />

            </div>

            <div className="form-group">

              <label>
                Unit
              </label>

              <select
                name="unitType"
                value={
                  form.unitType
                }
                onChange={
                  handleChange
                }
              >

                <option value="piece">
                  Piece
                </option>

                <option value="ml">
                  Millilitre (ml)
                </option>

              </select>

            </div>

            <div className="form-group">

              <label>
                Buying Price (
                {currency})
              </label>

              <input
                name="buyingPrice"
                type="number"
                min="0"
                step="0.01"
                value={
                  form.buyingPrice
                }
                onChange={
                  handleChange
                }
                placeholder="0.00"
              />

            </div>

            <div className="form-group">

              <label>
                Selling Price (
                {currency}) *
              </label>

              <input
                name="sellingPrice"
                type="number"
                min="0.01"
                step="0.01"
                value={
                  form.sellingPrice
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
                {editingId
                  ? "Current Stock"
                  : "Opening Stock"}
              </label>

              <input
                name="stock"
                type="number"
                min="0"
                step={
                  form.unitType ===
                  "ml"
                    ? "0.01"
                    : "1"
                }
                value={
                  form.stock
                }
                onChange={
                  handleChange
                }
                placeholder="0"
                disabled={
                  Boolean(
                    editingId
                  )
                }
              />

              {editingId && (
                <small>
                  Use Stock In or
                  Stock Out to change
                  the inventory
                  balance.
                </small>
              )}

            </div>

            <div className="form-group">

              <label>
                Low Stock Level
              </label>

              <input
                name="lowStockLevel"
                type="number"
                min="0"
                step={
                  form.unitType ===
                  "ml"
                    ? "0.01"
                    : "1"
                }
                value={
                  form.lowStockLevel
                }
                onChange={
                  handleChange
                }
                placeholder="0"
              />

            </div>

            <div className="form-group form-span-2">

              <label>
                Supplier
              </label>

              <select
                name="supplier"
                value={
                  form.supplier
                }
                onChange={
                  handleChange
                }
              >

                <option value="">
                  No supplier selected
                </option>

                {suppliers.map(
                  (
                    supplier
                  ) => (

                    <option
                      key={
                        supplier.id
                      }
                      value={
                        supplier.name
                      }
                    >
                      {
                        supplier.name
                      }
                    </option>

                  )
                )}

              </select>

            </div>

            <div className="form-actions form-span-2">

              <button
                type="button"
                className="secondary-button"
                onClick={
                  resetForm
                }
                disabled={
                  saving
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
                  ? "Update Product"
                  : "Save Product"}
              </button>

            </div>

          </form>

        </div>

      )}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Product List
            </h2>

            <p>
              {loadingProducts
                ? "Loading products..."
                : `${displayedTotal.toLocaleString()} product${
                    displayedTotal === 1
                      ? ""
                      : "s"
                  }${
                    searchTerm.trim()
                      ? " matching search"
                      : ""
                  }`}
            </p>

          </div>

          <div className="search-box">

            <Search
              size={18}
            />

            <input
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
              placeholder="Search products..."
            />

          </div>

        </div>

        {productLoadError ? (

          <div className="empty-state">

            <Package
              size={38}
            />

            <h3>
              Could not load products
            </h3>

            <p>
              {productLoadError}
            </p>

          </div>

        ) : displayedProducts.length ===
        0 ? (

          <div className="empty-state">

            <Package
              size={38}
            />

            <h3>
              No products found
            </h3>

            <p>
              Add a product or
              change your search.
            </p>

          </div>

        ) : (

          <div className="table-wrap">

            <table className="data-table">

              <thead>
                <tr>
                  <th>
                    Product
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Unit
                  </th>

                  <th>
                    Stock
                  </th>

                  <th>
                    Buy
                  </th>

                  <th>
                    Sell
                  </th>

                  <th>
                    Status
                  </th>

                  {canManage && (
                    <th>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>

                {displayedProducts.map(
                  (
                    product
                  ) => {
                    const stock =
                      Number(
                        product.stock ||
                          0
                      );

                    const lowLevel =
                      Number(
                        product.lowStockLevel ??
                          product.low_stock_level ??
                          0
                      );

                    const low =
                      stock <=
                      lowLevel;

                    return (
                      <tr
                        key={
                          product.id
                        }
                      >

                        <td>

                          <strong>
                            {
                              product.name
                            }
                          </strong>

                          <small className="cell-subtext">
                            {product.brand ||
                              "No brand"}
                          </small>

                        </td>

                        <td>
                          {product.category ||
                            "—"}
                        </td>

                        <td>
                          {product.unitType ||
                            product.unit_type ||
                            "piece"}
                        </td>

                        <td>
                          {stock}
                        </td>

                        <td>
                          {formatMoney(
                            product.buyingPrice ??
                              product.buying_price ??
                              0
                          )}
                        </td>

                        <td>
                          {formatMoney(
                            product.sellingPrice ??
                              product.selling_price ??
                              product.price ??
                              0
                          )}
                        </td>

                        <td>

                          <span
                            className={
                              low
                                ? "status-badge danger"
                                : "status-badge success"
                            }
                          >
                            {low
                              ? "Low stock"
                              : "In stock"}
                          </span>

                        </td>

                        {canManage && (

                          <td>

                            <div className="row-actions">

                              <button
                                type="button"
                                className="icon-button"
                                disabled={
                                  saving
                                }
                                onClick={() =>
                                  handleEdit(
                                    product
                                  )
                                }
                              >
                                <Pencil
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                className="icon-button danger"
                                disabled={
                                  saving
                                }
                                onClick={() =>
                                  handleDelete(
                                    product
                                  )
                                }
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>

                            </div>

                          </td>

                        )}

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

        {hasDesktopApi &&
          displayedTotal >
            0 && (

          <div
            className="form-actions"
            style={{
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "12px",
              marginTop:
                "16px",
              flexWrap:
                "wrap",
            }}
          >

            <small>
              Showing{" "}
              {(
                (pageInfo.page -
                  1) *
                  pageInfo.limit +
                1
              ).toLocaleString()}
              {" – "}
              {Math.min(
                pageInfo.page *
                  pageInfo.limit,
                pageInfo.total
              ).toLocaleString()}
              {" of "}
              {pageInfo.total.toLocaleString()}
            </small>

            <div className="row-actions">

              <button
                type="button"
                className="secondary-button"
                disabled={
                  loadingProducts ||
                  pageInfo.page <=
                    1
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        1,
                        current -
                          1
                      )
                  )
                }
              >
                Previous
              </button>

              <span>
                Page{" "}
                {pageInfo.page}{" "}
                of{" "}
                {
                  pageInfo.totalPages
                }
              </span>

              <button
                type="button"
                className="secondary-button"
                disabled={
                  loadingProducts ||
                  pageInfo.page >=
                    pageInfo.totalPages
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        pageInfo.totalPages,
                        current +
                          1
                      )
                  )
                }
              >
                Next
              </button>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

export default Products;