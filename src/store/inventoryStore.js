import { create } from "zustand";
import { persist } from "zustand/middleware";

const numberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolveSellingPrice = (product) =>
  numberOrZero(
    product?.sellingPrice ??
      product?.selling_price ??
      product?.price ??
      0
  );

const resolveBuyingPrice = (product) =>
  numberOrZero(
    product?.buyingPrice ??
      product?.buying_price ??
      0
  );

const resolveUnitType = (product) => {
  const raw =
    product?.unitType ??
    product?.unit_type ??
    "piece";

  return String(raw).toLowerCase() === "ml"
    ? "ml"
    : "piece";
};

const normalizeQuantity = (product, value) => {
  const quantity = Number(value);

  if (!Number.isFinite(quantity)) {
    return 0;
  }

  if (resolveUnitType(product) === "piece") {
    return quantity;
  }

  return Number(quantity.toFixed(2));
};

const validateQuantityForUnit = (
  product,
  value,
  { allowZero = false, label = "Quantity" } = {}
) => {
  const quantity = Number(value);

  if (!Number.isFinite(quantity)) {
    return {
      success: false,
      message: `${label} must be a valid number.`,
    };
  }

  if (allowZero ? quantity < 0 : quantity <= 0) {
    return {
      success: false,
      message: allowZero
        ? `${label} cannot be negative.`
        : `${label} must be greater than zero.`,
    };
  }

  if (
    resolveUnitType(product) === "piece" &&
    !Number.isInteger(quantity)
  ) {
    return {
      success: false,
      message:
        "Piece products require whole-number quantities.",
    };
  }

  return {
    success: true,
    quantity: normalizeQuantity(product, quantity),
  };
};

const normalizeProduct = (product) => ({
  ...product,

  name: String(
    product?.name || ""
  ).trim(),

  brand: String(
    product?.brand || ""
  ).trim(),

  category: String(
    product?.category || ""
  ).trim(),

  unitType:
    resolveUnitType(product),

  buyingPrice:
    resolveBuyingPrice(product),

  sellingPrice:
    resolveSellingPrice(product),

  stock:
    numberOrZero(
      product?.stock
    ),

  lowStockLevel:
    numberOrZero(
      product?.lowStockLevel ??
        product?.low_stock_level ??
        0
    ),

  supplier: String(
    product?.supplier || ""
  ).trim(),
});

const useInventoryStore = create(
  persist(
    (set, get) => ({
      products: [],
      sales: [],
      transactions: [],
      receiptSequence: 0,
      stockMovements: [],
      suppliers: [],
      customers: [],
      expenses: [],

      // ==========================================
      // PRODUCTS
      // ==========================================

      addProduct: (product) => {
        const normalized =
          normalizeProduct(product);

        if (!normalized.name) {
          return {
            success: false,
            message:
              "Product name is required.",
          };
        }

        if (
          normalized.sellingPrice <= 0
        ) {
          return {
            success: false,
            message:
              "Selling price must be greater than zero.",
          };
        }

        if (
          normalized.buyingPrice < 0
        ) {
          return {
            success: false,
            message:
              "Buying price cannot be negative.",
          };
        }

        const stockValidation =
          validateQuantityForUnit(
            normalized,
            normalized.stock,
            {
              allowZero: true,
              label:
                "Opening stock",
            }
          );

        if (
          !stockValidation.success
        ) {
          return stockValidation;
        }

        normalized.stock =
          stockValidation.quantity;

        const newProduct = {
          ...normalized,

          id: Date.now(),

          createdAt:
            new Date().toISOString(),

          updatedAt:
            new Date().toISOString(),
        };

        set((state) => ({
          products: [
            ...state.products,
            newProduct,
          ],
        }));

        return {
          success: true,
          product: newProduct,
        };
      },

      updateProduct: (
        id,
        updatedProduct
      ) => {
        const current =
          get().products.find(
            (item) =>
              item.id === id
          );

        if (!current) {
          return {
            success: false,
            message:
              "Product not found.",
          };
        }

        const normalized =
          normalizeProduct({
            ...current,
            ...updatedProduct,
          });

        if (!normalized.name) {
          return {
            success: false,
            message:
              "Product name is required.",
          };
        }

        if (
          normalized.sellingPrice <= 0
        ) {
          return {
            success: false,
            message:
              "Selling price must be greater than zero.",
          };
        }

        if (
          normalized.buyingPrice < 0
        ) {
          return {
            success: false,
            message:
              "Buying price cannot be negative.",
          };
        }

        const stockValidation =
          validateQuantityForUnit(
            normalized,
            normalized.stock,
            {
              allowZero: true,
              label: "Stock",
            }
          );

        if (
          !stockValidation.success
        ) {
          return stockValidation;
        }

        normalized.stock =
          stockValidation.quantity;

        set((state) => ({
          products:
            state.products.map(
              (product) =>
                product.id === id
                  ? {
                      ...normalized,

                      id,

                      createdAt:
                        current.createdAt,

                      updatedAt:
                        new Date().toISOString(),
                    }
                  : product
            ),
        }));

        return {
          success: true,
        };
      },

      deleteProduct: (id) => {
        set((state) => ({
          products:
            state.products.filter(
              (product) =>
                product.id !== id
            ),
        }));

        return {
          success: true,
        };
      },

      // ==========================================
      // STOCK IN
      // ==========================================

      stockIn: (
        id,
        quantity,
        metadata = {}
      ) => {
        let result = {
          success: false,
          message:
            "Stock in failed.",
        };

        set((state) => {
          const product =
            state.products.find(
              (item) =>
                item.id === id
            );

          if (!product) {
            result = {
              success: false,
              message:
                "Product not found.",
            };

            return state;
          }

          const validation =
            validateQuantityForUnit(
              product,
              quantity,
              {
                label:
                  "Quantity",
              }
            );

          if (
            !validation.success
          ) {
            result = validation;
            return state;
          }

          const qty =
            validation.quantity;

          const movement = {
            id: Date.now(),

            type: "in",

            productId:
              product.id,

            productName:
              product.name,

            quantity: qty,

            unitType:
              resolveUnitType(
                product
              ),

            reason:
              metadata.reason ||
              "Stock purchase",

            notes:
              metadata.notes ||
              "",

            userId:
              metadata.userId ||
              null,

            userName:
              metadata.userName ||
              "Unknown",

            date:
              new Date().toISOString(),
          };

          result = {
            success: true,
            movement,
          };

          return {
            products:
              state.products.map(
                (item) =>
                  item.id === id
                    ? {
                        ...normalizeProduct(
                          item
                        ),

                        stock:
                          normalizeQuantity(
                            item,
                            numberOrZero(
                              item.stock
                            ) + qty
                          ),

                        updatedAt:
                          new Date().toISOString(),
                      }
                    : item
              ),

            stockMovements: [
              movement,
              ...state.stockMovements,
            ],
          };
        });

        return result;
      },

      // ==========================================
      // STOCK OUT
      // ==========================================

      stockOut: (
        id,
        quantity,
        metadata = {}
      ) => {
        let result = {
          success: false,
          message:
            "Stock out failed.",
        };

        set((state) => {
          const product =
            state.products.find(
              (item) =>
                item.id === id
            );

          if (!product) {
            result = {
              success: false,
              message:
                "Product not found.",
            };

            return state;
          }

          const validation =
            validateQuantityForUnit(
              product,
              quantity,
              {
                label:
                  "Quantity",
              }
            );

          if (
            !validation.success
          ) {
            result = validation;
            return state;
          }

          const qty =
            validation.quantity;

          const stock =
            normalizeQuantity(
              product,
              product.stock
            );

          if (qty > stock) {
            result = {
              success: false,

              message:
                `Only ${stock} ${resolveUnitType(
                  product
                )} available.`,
            };

            return state;
          }

          const movement = {
            id: Date.now(),

            type: "out",

            productId:
              product.id,

            productName:
              product.name,

            quantity: qty,

            unitType:
              resolveUnitType(
                product
              ),

            reason:
              metadata.reason ||
              "Adjustment",

            notes:
              metadata.notes ||
              "",

            userId:
              metadata.userId ||
              null,

            userName:
              metadata.userName ||
              "Unknown",

            date:
              new Date().toISOString(),
          };

          result = {
            success: true,
            movement,
          };

          return {
            products:
              state.products.map(
                (item) =>
                  item.id === id
                    ? {
                        ...normalizeProduct(
                          item
                        ),

                        stock:
                          normalizeQuantity(
                            item,
                            numberOrZero(
                              item.stock
                            ) - qty
                          ),

                        updatedAt:
                          new Date().toISOString(),
                      }
                    : item
              ),

            stockMovements: [
              movement,
              ...state.stockMovements,
            ],
          };
        });

        return result;
      },

      // ==========================================
      // POS CHECKOUT
      // ==========================================

      checkoutSale: (
        checkoutData
      ) => {
        let result = {
          success: false,
          message:
            "Checkout failed.",
        };

        set((state) => {
          const cart =
            Array.isArray(
              checkoutData.items
            )
              ? checkoutData.items
              : [];

          if (
            cart.length === 0
          ) {
            result = {
              success: false,
              message:
                "The cart is empty.",
            };

            return state;
          }

          const requestedByProduct =
            new Map();

          for (
            const cartItem of cart
          ) {
            const product =
              state.products.find(
                (item) =>
                  String(
                    item.id
                  ) ===
                  String(
                    cartItem.productId
                  )
              );

            if (!product) {
              result = {
                success: false,

                message:
                  "One of the products no longer exists.",
              };

              return state;
            }

            const validation =
              validateQuantityForUnit(
                product,
                cartItem.quantity,
                {
                  label:
                    `Quantity for ${product.name}`,
                }
              );

            if (
              !validation.success
            ) {
              result =
                validation;

              return state;
            }

            const quantity =
              validation.quantity;

            const combined =
              normalizeQuantity(
                product,

                (
                  requestedByProduct.get(
                    product.id
                  ) || 0
                ) + quantity
              );

            requestedByProduct.set(
              product.id,
              combined
            );

            if (
              combined >
              numberOrZero(
                product.stock
              )
            ) {
              result = {
                success: false,

                message:
                  `Not enough stock for ${product.name}. Available: ${product.stock} ${resolveUnitType(
                    product
                  )}.`,
              };

              return state;
            }

            const sellingPrice =
              resolveSellingPrice(
                product
              );

            if (
              sellingPrice <= 0
            ) {
              result = {
                success: false,

                message:
                  `${product.name} does not have a valid selling price.`,
              };

              return state;
            }
          }

          const transactionItems =
            cart.map(
              (cartItem) => {
                const product =
                  state.products.find(
                    (item) =>
                      String(
                        item.id
                      ) ===
                      String(
                        cartItem.productId
                      )
                  );

                const quantity =
                  normalizeQuantity(
                    product,
                    cartItem.quantity
                  );

                const buyingPrice =
                  resolveBuyingPrice(
                    product
                  );

                const sellingPrice =
                  resolveSellingPrice(
                    product
                  );

                return {
                  productId:
                    product.id,

                  productName:
                    product.name,

                  brand:
                    product.brand ||
                    "",

                  category:
                    product.category ||
                    "",

                  quantity,

                  unitType:
                    resolveUnitType(
                      product
                    ),

                  buyingPrice,

                  sellingPrice,

                  costTotal:
                    quantity *
                    buyingPrice,

                  total:
                    quantity *
                    sellingPrice,
                };
              }
            );

          const subtotal =
            transactionItems.reduce(
              (sum, item) =>
                sum +
                numberOrZero(
                  item.total
                ),
              0
            );

          if (
            subtotal <= 0
          ) {
            result = {
              success: false,

              message:
                "The sale subtotal is zero. Check product selling prices.",
            };

            return state;
          }

          let discount =
            numberOrZero(
              checkoutData.discount
            );

          discount =
            Math.min(
              Math.max(
                discount,
                0
              ),
              subtotal
            );

          const total =
            subtotal -
            discount;

          if (total <= 0) {
            result = {
              success: false,

              message:
                "The final sale total must be greater than zero.",
            };

            return state;
          }

          const paymentMethod =
            checkoutData.paymentMethod ||
            "Cash";

          const amountPaid =
            paymentMethod ===
            "Cash"
              ? numberOrZero(
                  checkoutData.amountPaid
                )
              : total;

          if (
            paymentMethod ===
              "Cash" &&
            amountPaid < total
          ) {
            result = {
              success: false,

              message:
                "Amount paid is less than the sale total.",
            };

            return state;
          }

          const change =
            paymentMethod ===
            "Cash"
              ? Math.max(
                  amountPaid -
                    total,
                  0
                )
              : 0;

          const currentSequence =
            Math.max(
              numberOrZero(
                state.receiptSequence
              ),

              state.transactions
                .length
            );

          const nextSequence =
            currentSequence + 1;

          const receiptNumber =
            `GS-${String(
              nextSequence
            ).padStart(
              6,
              "0"
            )}`;

          const transactionId =
            Date.now();

          const now =
            new Date().toISOString();

          const transaction = {
            id:
              transactionId,

            receiptNumber,

            customerId:
              checkoutData.customerId ||
              null,

            customerName:
              checkoutData.customerName ||
              "Walk-in Customer",

            cashierId:
              checkoutData.cashierId ||
              null,

            cashierName:
              checkoutData.cashierName ||
              "Unknown Cashier",

            items:
              transactionItems,

            subtotal,

            discount,

            total,

            costTotal:
              transactionItems.reduce(
                (sum, item) =>
                  sum +
                  numberOrZero(
                    item.costTotal
                  ),
                0
              ),

            paymentMethod,

            paymentReference:
              checkoutData.paymentReference ||
              "",

            amountPaid,

            change,

            businessSnapshot:
              checkoutData.businessSnapshot ||
              null,

            currencySnapshot:
              checkoutData.currencySnapshot ||
              "KSh",

            date: now,
          };

          const updatedProducts =
            state.products.map(
              (product) => {
                const requested =
                  requestedByProduct.get(
                    product.id
                  );

                if (!requested) {
                  return product;
                }

                return {
                  ...normalizeProduct(
                    product
                  ),

                  stock:
                    normalizeQuantity(
                      product,

                      numberOrZero(
                        product.stock
                      ) -
                        requested
                    ),

                  updatedAt:
                    now,
                };
              }
            );

          result = {
            success: true,

            message:
              "Sale completed successfully.",

            transaction,
          };

          return {
            products:
              updatedProducts,

            transactions: [
              transaction,
              ...state.transactions,
            ],

            receiptSequence:
              nextSequence,
          };
        });

        return result;
      },

      // ==========================================
      // SUPPLIERS
      // ==========================================

      setSuppliers: (
        suppliers
      ) =>
        set({
          suppliers:
            Array.isArray(
              suppliers
            )
              ? suppliers
              : [],
        }),

      addSupplier: (
        supplier
      ) => {
        const name =
          String(
            supplier.name ||
              ""
          ).trim();

        if (!name) {
          return {
            success: false,

            message:
              "Supplier name is required.",
          };
        }

        const newSupplier = {
          ...supplier,

          id:
            Date.now(),

          name,

          createdAt:
            new Date().toISOString(),
        };

        set((state) => ({
          suppliers: [
            newSupplier,
            ...state.suppliers,
          ],
        }));

        return {
          success: true,
          supplier:
            newSupplier,
        };
      },

      updateSupplier: (
        id,
        updatedSupplier
      ) => {
        const name =
          String(
            updatedSupplier.name ||
              ""
          ).trim();

        if (!name) {
          return {
            success: false,

            message:
              "Supplier name is required.",
          };
        }

        set((state) => ({
          suppliers:
            state.suppliers.map(
              (supplier) =>
                supplier.id === id
                  ? {
                      ...supplier,
                      ...updatedSupplier,
                      name,
                    }
                  : supplier
            ),
        }));

        return {
          success: true,
        };
      },

      deleteSupplier: (
        id
      ) => {
        set((state) => ({
          suppliers:
            state.suppliers.filter(
              (supplier) =>
                supplier.id !==
                id
            ),
        }));

        return {
          success: true,
        };
      },

      // ==========================================
      // CUSTOMERS
      // ==========================================

      addCustomer: (
        customer
      ) => {
        const name =
          String(
            customer.name ||
              ""
          ).trim();

        if (!name) {
          return {
            success: false,

            message:
              "Customer name is required.",
          };
        }

        const newCustomer = {
          ...customer,

          id:
            Date.now(),

          name,

          createdAt:
            new Date().toISOString(),
        };

        set((state) => ({
          customers: [
            newCustomer,
            ...state.customers,
          ],
        }));

        return {
          success: true,

          customer:
            newCustomer,
        };
      },

      updateCustomer: (
        id,
        updatedCustomer
      ) => {
        const name =
          String(
            updatedCustomer.name ||
              ""
          ).trim();

        if (!name) {
          return {
            success: false,

            message:
              "Customer name is required.",
          };
        }

        set((state) => ({
          customers:
            state.customers.map(
              (customer) =>
                customer.id === id
                  ? {
                      ...customer,

                      ...updatedCustomer,

                      name,
                    }
                  : customer
            ),
        }));

        return {
          success: true,
        };
      },

      deleteCustomer: (
        id
      ) => {
        set((state) => ({
          customers:
            state.customers.filter(
              (customer) =>
                customer.id !==
                id
            ),
        }));

        return {
          success: true,
        };
      },

      // ==========================================
      // EXPENSES
      // ==========================================

      addExpense: (
        expense
      ) => {
        const amount =
          numberOrZero(
            expense.amount
          );

        if (
          !String(
            expense.title ||
              ""
          ).trim() ||
          amount <= 0
        ) {
          return {
            success: false,

            message:
              "Enter an expense description and a valid amount.",
          };
        }

        const newExpense = {
          ...expense,

          id:
            Date.now(),

          title:
            String(
              expense.title
            ).trim(),

          amount,

          date:
            expense.date ||
            new Date()
              .toISOString()
              .split(
                "T"
              )[0],

          createdAt:
            new Date().toISOString(),
        };

        set((state) => ({
          expenses: [
            newExpense,
            ...state.expenses,
          ],
        }));

        return {
          success: true,

          expense:
            newExpense,
        };
      },

      updateExpense: (
        id,
        updatedExpense
      ) => {
        const amount =
          numberOrZero(
            updatedExpense.amount
          );

        if (
          !String(
            updatedExpense.title ||
              ""
          ).trim() ||
          amount <= 0
        ) {
          return {
            success: false,

            message:
              "Enter an expense description and a valid amount.",
          };
        }

        set((state) => ({
          expenses:
            state.expenses.map(
              (expense) =>
                expense.id === id
                  ? {
                      ...expense,

                      ...updatedExpense,

                      title:
                        String(
                          updatedExpense.title
                        ).trim(),

                      amount,
                    }
                  : expense
            ),
        }));

        return {
          success: true,
        };
      },

      deleteExpense: (
        id
      ) => {
        set((state) => ({
          expenses:
            state.expenses.filter(
              (expense) =>
                expense.id !==
                id
            ),
        }));

        return {
          success: true,
        };
      },
    }),

    {
      name:
        "glamstock-storage",

      version: 2,

      /*
        Electron stores the catalogue in SQLite.
        Keeping tens of thousands of products in
        localStorage duplicates data and slows
        future startup/hydration.

        We still allow an existing persisted
        catalogue to hydrate once so the legacy
        migration path in main.jsx can import it
        if SQLite is empty. After desktop
        hydration runs, products are persisted
        as an empty array.
      */
      partialize:
        (state) => {
          const isDesktop =
            typeof window !==
              "undefined" &&
            Boolean(
              window.glamstock
            );

          if (!isDesktop) {
            return state;
          }

          return {
            ...state,
            products: [],
          };
        },
    }

  )
);

export default useInventoryStore;