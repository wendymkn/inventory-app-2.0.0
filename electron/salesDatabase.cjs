const path = require("path");
const Database = require("better-sqlite3");

const text = (value) =>
  String(value ?? "").trim();

const toNumber = (
  value,
  fallback = 0
) => {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
};

const roundMoney = (value) =>
  Number(
    toNumber(value).toFixed(2)
  );

const unitTypeOf = (value) =>
  String(
    value ?? "piece"
  ).toLowerCase() === "ml"
    ? "ml"
    : "piece";

const normalizeQuantity = (
  unitType,
  value
) => {
  const quantity =
    Number(value);

  if (
    !Number.isFinite(
      quantity
    )
  ) {
    return 0;
  }

  return unitType === "ml"
    ? Number(
        quantity.toFixed(2)
      )
    : quantity;
};

const safeJsonParse = (
  value,
  fallback = null
) => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const sanitizeBusinessSnapshot = (
  business
) => {
  if (
    !business ||
    typeof business !== "object"
  ) {
    return null;
  }

  return {
    name:
      text(business.name) ||
      "GlamStock Beauty Store",

    tagline:
      text(
        business.tagline
      ),

    phone:
      text(
        business.phone
      ),

    email:
      text(
        business.email
      ),

    address:
      text(
        business.address
      ),

    kraPin:
      text(
        business.kraPin
      ),

    registrationNumber:
      text(
        business.registrationNumber
      ),

    receiptFooter:
      text(
        business.receiptFooter
      ) ||
      "Thank you for shopping with us!",

    receiptSize:
      business.receiptSize ===
      "58mm"
        ? "58mm"
        : "80mm",
  };
};

function createSalesDatabase(
  userDataPath
) {
  const databasePath =
    path.join(
      userDataPath,
      "data",
      "glamstock.db"
    );

  const db =
    new Database(
      databasePath
    );

  db.pragma(
    "journal_mode = WAL"
  );

  db.pragma(
    "foreign_keys = ON"
  );

  db.pragma(
    "busy_timeout = 5000"
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );


    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      receipt_number TEXT NOT NULL UNIQUE,

      customer_id INTEGER,

      user_id INTEGER,

      customer_name TEXT,

      cashier_name TEXT,

      subtotal REAL NOT NULL
        DEFAULT 0,

      discount REAL NOT NULL
        DEFAULT 0,

      total REAL NOT NULL
        DEFAULT 0,

      payment_method TEXT NOT NULL,

      payment_reference TEXT,

      amount_paid REAL NOT NULL
        DEFAULT 0,

      change_amount REAL NOT NULL
        DEFAULT 0,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP
    );


    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      transaction_id INTEGER NOT NULL,

      product_id INTEGER,

      product_name TEXT NOT NULL,

      unit_type TEXT NOT NULL,

      quantity REAL NOT NULL
        CHECK (
          quantity > 0
        ),

      unit_price REAL NOT NULL
        CHECK (
          unit_price >= 0
        ),

      unit_cost REAL NOT NULL
        DEFAULT 0
        CHECK (
          unit_cost >= 0
        ),

      line_total REAL NOT NULL
        CHECK (
          line_total >= 0
        ),

      FOREIGN KEY (
        transaction_id
      )
      REFERENCES transactions(id)
      ON DELETE CASCADE,

      FOREIGN KEY (
        product_id
      )
      REFERENCES products(id)
      ON DELETE SET NULL
    );


    CREATE INDEX IF NOT EXISTS
      idx_transactions_created_at
    ON transactions(
      created_at
    );


    CREATE INDEX IF NOT EXISTS
      idx_transaction_items_transaction
    ON transaction_items(
      transaction_id
    );
  `);

  const ensureColumn = (
    tableName,
    columnName,
    definition
  ) => {
    const columns =
      db.prepare(
        `PRAGMA table_info(${tableName})`
      ).all();

    const exists =
      columns.some(
        (column) =>
          column.name ===
          columnName
      );

    if (!exists) {
      db.exec(
        `ALTER TABLE ${tableName}
         ADD COLUMN ${columnName}
         ${definition}`
      );
    }
  };

  ensureColumn(
    "transactions",
    "cost_total",
    "REAL NOT NULL DEFAULT 0"
  );

  ensureColumn(
    "transactions",
    "business_snapshot",
    "TEXT"
  );

  ensureColumn(
    "transactions",
    "currency_snapshot",
    "TEXT NOT NULL DEFAULT 'KSh'"
  );

  ensureColumn(
    "transaction_items",
    "brand",
    "TEXT"
  );

  ensureColumn(
    "transaction_items",
    "category",
    "TEXT"
  );

  ensureColumn(
    "stock_movements",
    "notes",
    "TEXT"
  );

  ensureColumn(
    "stock_movements",
    "user_name",
    "TEXT"
  );

  const getProduct = (
    id
  ) => {
    const row =
      db.prepare(`
        SELECT *
        FROM products

        WHERE id = ?
          AND is_active = 1
      `).get(id);

    if (!row) {
      return null;
    }

    const unitType =
      unitTypeOf(
        row.unit_type
      );

    return {
      id:
        row.id,

      name:
        row.name || "",

      brand:
        row.brand || "",

      category:
        row.category || "",

      unitType,

      buyingPrice:
        roundMoney(
          row.buying_price
        ),

      sellingPrice:
        roundMoney(
          row.selling_price
        ),

      stock:
        normalizeQuantity(
          unitType,
          row.stock
        ),
    };
  };

  const resolveExistingId = (
    tableName,
    id
  ) => {
    const numericId =
      Number(id);

    if (
      !Number.isSafeInteger(
        numericId
      ) ||
      numericId <= 0
    ) {
      return null;
    }

    const allowedTables =
      new Set([
        "customers",
        "users",
      ]);

    if (
      !allowedTables.has(
        tableName
      )
    ) {
      return null;
    }

    const row =
      db.prepare(
        `SELECT id
         FROM ${tableName}
         WHERE id = ?`
      ).get(
        numericId
      );

    return (
      row?.id ??
      null
    );
  };

  const mapTransactionItem = (
    row
  ) => ({
    id:
      row.id,

    transactionId:
      row.transaction_id,

    productId:
      row.product_id,

    productName:
      row.product_name ||
      "",

    brand:
      row.brand || "",

    category:
      row.category || "",

    unitType:
      unitTypeOf(
        row.unit_type
      ),

    quantity:
      toNumber(
        row.quantity
      ),

    buyingPrice:
      roundMoney(
        row.unit_cost
      ),

    sellingPrice:
      roundMoney(
        row.unit_price
      ),

    costTotal:
      roundMoney(
        toNumber(
          row.quantity
        ) *
        toNumber(
          row.unit_cost
        )
      ),

    total:
      roundMoney(
        row.line_total
      ),
  });

  const itemsForTransaction =
    db.prepare(`
      SELECT *
      FROM transaction_items

      WHERE transaction_id = ?

      ORDER BY id ASC
    `);

  const mapTransaction = (
    row
  ) => {
    if (!row) {
      return null;
    }

    return {
      id:
        row.id,

      receiptNumber:
        row.receipt_number,

      customerId:
        row.customer_id ??
        null,

      customerName:
        row.customer_name ||
        "Walk-in Customer",

      cashierId:
        row.user_id ??
        null,

      cashierName:
        row.cashier_name ||
        "Unknown Cashier",

      items:
        itemsForTransaction
          .all(row.id)
          .map(
            mapTransactionItem
          ),

      subtotal:
        roundMoney(
          row.subtotal
        ),

      discount:
        roundMoney(
          row.discount
        ),

      total:
        roundMoney(
          row.total
        ),

      costTotal:
        roundMoney(
          row.cost_total
        ),

      paymentMethod:
        row.payment_method ||
        "Cash",

      paymentReference:
        row.payment_reference ||
        "",

      amountPaid:
        roundMoney(
          row.amount_paid
        ),

      change:
        roundMoney(
          row.change_amount
        ),

      businessSnapshot:
        safeJsonParse(
          row.business_snapshot,
          null
        ),

      currencySnapshot:
        row.currency_snapshot ||
        "KSh",

      date:
        row.created_at,
    };
  };

  const getTransaction = (
    id
  ) => {
    const row =
      db.prepare(`
        SELECT *
        FROM transactions
        WHERE id = ?
      `).get(id);

    return mapTransaction(
      row
    );
  };

  const listTransactions =
    () =>
      db.prepare(`
        SELECT *
        FROM transactions

        ORDER BY id DESC

        LIMIT 5000
      `)
        .all()
        .map(
          mapTransaction
        );

  const readReceiptSequence =
    () => {
      const meta =
        db.prepare(`
          SELECT value
          FROM app_meta
          WHERE key =
            'receipt_sequence'
        `).get();

      const metaValue =
        toNumber(
          meta?.value,
          0
        );

      const row =
        db.prepare(`
          SELECT MAX(
            CASE
              WHEN receipt_number
                LIKE 'GS-%'
              THEN CAST(
                SUBSTR(
                  receipt_number,
                  4
                )
                AS INTEGER
              )
              ELSE 0
            END
          ) AS max_sequence

          FROM transactions
        `).get();

      return Math.max(
        metaValue,

        toNumber(
          row?.max_sequence,
          0
        )
      );
    };

  const writeReceiptSequence =
    (sequence) => {
      db.prepare(`
        INSERT INTO app_meta (
          key,
          value
        )

        VALUES (
          'receipt_sequence',
          ?
        )

        ON CONFLICT(key)

        DO UPDATE SET
          value =
            excluded.value
      `).run(
        String(sequence)
      );
    };

  const validateCheckoutQuantity =
    (
      product,
      value
    ) => {
      const quantity =
        Number(value);

      if (
        !Number.isFinite(
          quantity
        ) ||
        quantity <= 0
      ) {
        return {
          success: false,

          message:
            `Invalid quantity for ${product.name}.`,
        };
      }

      if (
        product.unitType ===
          "piece" &&
        !Number.isInteger(
          quantity
        )
      ) {
        return {
          success: false,

          message:
            `${product.name} is sold by piece. Use a whole number.`,
        };
      }

      return {
        success: true,

        quantity:
          normalizeQuantity(
            product.unitType,
            quantity
          ),
      };
    };

  const checkoutTransaction =
    db.transaction(
      (
        checkoutData = {}
      ) => {
        const cart =
          Array.isArray(
            checkoutData.items
          )
            ? checkoutData.items
            : [];

        if (
          cart.length === 0
        ) {
          return {
            success: false,

            message:
              "The cart is empty.",
          };
        }

        const resolvedItems =
          [];

        const requestedByProduct =
          new Map();

        for (
          const cartItem
          of cart
        ) {
          const product =
            getProduct(
              cartItem.productId
            );

          if (!product) {
            return {
              success: false,

              message:
                "One of the products no longer exists.",
            };
          }

          const quantityValidation =
            validateCheckoutQuantity(
              product,
              cartItem.quantity
            );

          if (
            !quantityValidation.success
          ) {
            return (
              quantityValidation
            );
          }

          const quantity =
            quantityValidation.quantity;

          const combined =
            normalizeQuantity(
              product.unitType,

              (
                requestedByProduct.get(
                  product.id
                ) || 0
              ) +
                quantity
            );

          requestedByProduct.set(
            product.id,
            combined
          );

          if (
            combined >
            product.stock
          ) {
            return {
              success: false,

              message:
                `Not enough stock for ${product.name}. Available: ${product.stock} ${product.unitType}.`,
            };
          }

          if (
            product.sellingPrice <=
            0
          ) {
            return {
              success: false,

              message:
                `${product.name} does not have a valid selling price.`,
            };
          }

          resolvedItems.push({
            product,

            quantity,

            buyingPrice:
              roundMoney(
                product.buyingPrice
              ),

            sellingPrice:
              roundMoney(
                product.sellingPrice
              ),

            costTotal:
              roundMoney(
                quantity *
                  product.buyingPrice
              ),

            total:
              roundMoney(
                quantity *
                  product.sellingPrice
              ),
          });
        }

        const subtotal =
          roundMoney(
            resolvedItems.reduce(
              (
                sum,
                item
              ) =>
                sum +
                item.total,
              0
            )
          );

        if (
          subtotal <= 0
        ) {
          return {
            success: false,

            message:
              "The sale subtotal is zero. Check product selling prices.",
          };
        }

        let discount =
          roundMoney(
            checkoutData.discount
          );

        discount =
          roundMoney(
            Math.min(
              Math.max(
                discount,
                0
              ),
              subtotal
            )
          );

        const total =
          roundMoney(
            subtotal -
              discount
          );

        if (
          total <= 0
        ) {
          return {
            success: false,

            message:
              "The final sale total must be greater than zero.",
          };
        }

        const allowedPaymentMethods =
          new Set([
            "Cash",
            "M-Pesa",
            "Card",
          ]);

        const paymentMethod =
          allowedPaymentMethods.has(
            checkoutData.paymentMethod
          )
            ? checkoutData.paymentMethod
            : "Cash";

        const paymentReference =
          text(
            checkoutData.paymentReference
          );

        if (
          paymentMethod ===
            "M-Pesa" &&
          !paymentReference
        ) {
          return {
            success: false,

            message:
              "Enter the M-Pesa transaction code.",
          };
        }

        const amountPaid =
          paymentMethod ===
          "Cash"
            ? roundMoney(
                checkoutData.amountPaid
              )
            : total;

        if (
          paymentMethod ===
            "Cash" &&
          amountPaid < total
        ) {
          return {
            success: false,

            message:
              "Amount paid is less than the sale total.",
          };
        }

        const change =
          paymentMethod ===
          "Cash"
            ? roundMoney(
                amountPaid -
                  total
              )
            : 0;

        const sequence =
          readReceiptSequence() +
          1;

        const receiptNumber =
          `GS-${String(
            sequence
          ).padStart(
            6,
            "0"
          )}`;

        const now =
          new Date()
            .toISOString();

        const customerId =
          resolveExistingId(
            "customers",
            checkoutData.customerId
          );

        const userId =
          resolveExistingId(
            "users",
            checkoutData.cashierId
          );

        const customerName =
          text(
            checkoutData.customerName
          ) ||
          "Walk-in Customer";

        const cashierName =
          text(
            checkoutData.cashierName
          ) ||
          "Unknown Cashier";

        const businessSnapshot =
          sanitizeBusinessSnapshot(
            checkoutData.businessSnapshot
          );

        const currencySnapshot =
          text(
            checkoutData.currencySnapshot
          ) ||
          "KSh";

        const costTotal =
          roundMoney(
            resolvedItems.reduce(
              (
                sum,
                item
              ) =>
                sum +
                item.costTotal,
              0
            )
          );

        const transactionResult =
          db.prepare(`
            INSERT INTO transactions (
              receipt_number,
              customer_id,
              user_id,
              customer_name,
              cashier_name,
              subtotal,
              discount,
              total,
              cost_total,
              payment_method,
              payment_reference,
              amount_paid,
              change_amount,
              business_snapshot,
              currency_snapshot,
              created_at
            )

            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
            )
          `).run(
            receiptNumber,
            customerId,
            userId,
            customerName,
            cashierName,
            subtotal,
            discount,
            total,
            costTotal,
            paymentMethod,
            paymentReference,
            amountPaid,
            change,

            businessSnapshot
              ? JSON.stringify(
                  businessSnapshot
                )
              : null,

            currencySnapshot,
            now
          );

        const transactionId =
          transactionResult
            .lastInsertRowid;

        const insertItem =
          db.prepare(`
            INSERT INTO transaction_items (
              transaction_id,
              product_id,
              product_name,
              brand,
              category,
              unit_type,
              quantity,
              unit_price,
              unit_cost,
              line_total
            )

            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
            )
          `);

        for (
          const item
          of resolvedItems
        ) {
          insertItem.run(
            transactionId,

            item.product.id,

            item.product.name,

            item.product.brand ||
              "",

            item.product.category ||
              "",

            item.product.unitType,

            item.quantity,

            item.sellingPrice,

            item.buyingPrice,

            item.total
          );
        }

        const updateStock =
          db.prepare(`
            UPDATE products

            SET
              stock = ?,

              updated_at = ?

            WHERE id = ?
              AND is_active = 1
          `);

        const insertSaleMovement =
          db.prepare(`
            INSERT INTO stock_movements (
              product_id,
              movement_type,
              quantity,
              unit_cost,
              reason,
              reference,
              user_id,
              notes,
              user_name,
              created_at
            )

            VALUES (
              ?,
              'sale',
              ?,
              ?,
              'POS sale',
              ?,
              ?,
              '',
              ?,
              ?
            )
          `);

        const updatedProducts =
          [];

        for (
          const [
            productId,
            requested,
          ]
          of requestedByProduct.entries()
        ) {
          const product =
            getProduct(
              productId
            );

          const newStock =
            normalizeQuantity(
              product.unitType,

              product.stock -
                requested
            );

          if (
            newStock < 0
          ) {
            throw new Error(
              `Negative stock prevented for ${product.name}.`
            );
          }

          updateStock.run(
            newStock,
            now,
            product.id
          );

          insertSaleMovement.run(
            product.id,

            requested,

            product.buyingPrice,

            receiptNumber,

            userId,

            cashierName,

            now
          );

          updatedProducts.push(
            getProduct(
              product.id
            )
          );
        }

        writeReceiptSequence(
          sequence
        );

        return {
          success: true,

          message:
            "Sale completed successfully.",

          transaction:
            getTransaction(
              transactionId
            ),

          products:
            updatedProducts,
        };
      }
    );

  const importLegacyTransactions =
    (items = []) => {
      const existingCount =
        db.prepare(`
          SELECT COUNT(*) AS count
          FROM transactions
        `).get().count;

      if (
        existingCount > 0 ||
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return {
          success: true,

          imported: 0,

          transactions:
            listTransactions(),
        };
      }

      let imported = 0;

      const migration =
        db.transaction(() => {
          for (
            const legacy
            of items
          ) {
            const legacyItems =
              Array.isArray(
                legacy?.items
              )
                ? legacy.items
                : [];

            if (
              legacyItems.length ===
              0
            ) {
              continue;
            }

            const receiptNumber =
              text(
                legacy.receiptNumber
              );

            if (
              !receiptNumber
            ) {
              continue;
            }

            const duplicate =
              db.prepare(`
                SELECT id
                FROM transactions
                WHERE receipt_number = ?
              `).get(
                receiptNumber
              );

            if (
              duplicate
            ) {
              continue;
            }

            const subtotal =
              roundMoney(
                legacy.subtotal
              );

            const discount =
              roundMoney(
                legacy.discount
              );

            const total =
              roundMoney(
                legacy.total
              );

            const costTotal =
              roundMoney(
                legacy.costTotal ??
                  legacyItems.reduce(
                    (
                      sum,
                      item
                    ) =>
                      sum +
                      toNumber(
                        item.costTotal
                      ),
                    0
                  )
              );

            if (
              subtotal <= 0 ||
              total <= 0
            ) {
              continue;
            }

            const paymentMethod =
              [
                "Cash",
                "M-Pesa",
                "Card",
              ].includes(
                legacy.paymentMethod
              )
                ? legacy.paymentMethod
                : "Cash";

            const customerId =
              resolveExistingId(
                "customers",
                legacy.customerId
              );

            const userId =
              resolveExistingId(
                "users",
                legacy.cashierId
              );

            const createdAt =
              text(
                legacy.date
              ) ||
              new Date()
                .toISOString();

            const businessSnapshot =
              sanitizeBusinessSnapshot(
                legacy.businessSnapshot
              );

            const tx =
              db.prepare(`
                INSERT INTO transactions (
                  receipt_number,
                  customer_id,
                  user_id,
                  customer_name,
                  cashier_name,
                  subtotal,
                  discount,
                  total,
                  cost_total,
                  payment_method,
                  payment_reference,
                  amount_paid,
                  change_amount,
                  business_snapshot,
                  currency_snapshot,
                  created_at
                )

                VALUES (
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?
                )
              `).run(
                receiptNumber,

                customerId,

                userId,

                text(
                  legacy.customerName
                ) ||
                  "Walk-in Customer",

                text(
                  legacy.cashierName
                ) ||
                  "Unknown Cashier",

                subtotal,

                discount,

                total,

                costTotal,

                paymentMethod,

                text(
                  legacy.paymentReference
                ),

                roundMoney(
                  legacy.amountPaid ??
                    total
                ),

                roundMoney(
                  legacy.change
                ),

                businessSnapshot
                  ? JSON.stringify(
                      businessSnapshot
                    )
                  : null,

                text(
                  legacy.currencySnapshot
                ) ||
                  "KSh",

                createdAt
              );

            const transactionId =
              tx.lastInsertRowid;

            const insertItem =
              db.prepare(`
                INSERT INTO transaction_items (
                  transaction_id,
                  product_id,
                  product_name,
                  brand,
                  category,
                  unit_type,
                  quantity,
                  unit_price,
                  unit_cost,
                  line_total
                )

                VALUES (
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?
                )
              `);

            for (
              const item
              of legacyItems
            ) {
              const productId =
                Number(
                  item.productId
                );

              const product =
                Number.isSafeInteger(
                  productId
                )
                  ? db.prepare(`
                      SELECT id
                      FROM products
                      WHERE id = ?
                    `).get(
                      productId
                    )
                  : null;

              const quantity =
                toNumber(
                  item.quantity
                );

              const unitPrice =
                roundMoney(
                  item.sellingPrice ??
                    item.unitPrice ??
                    0
                );

              const unitCost =
                roundMoney(
                  item.buyingPrice ??
                    item.unitCost ??
                    0
                );

              const lineTotal =
                roundMoney(
                  item.total ??
                    quantity *
                      unitPrice
                );

              if (
                quantity <= 0 ||
                unitPrice < 0 ||
                lineTotal < 0
              ) {
                continue;
              }

              insertItem.run(
                transactionId,

                product?.id ??
                  null,

                text(
                  item.productName
                ) ||
                  "Product",

                text(
                  item.brand
                ),

                text(
                  item.category
                ),

                unitTypeOf(
                  item.unitType
                ),

                quantity,

                unitPrice,

                unitCost,

                lineTotal
              );
            }

            imported += 1;
          }

          writeReceiptSequence(
            readReceiptSequence()
          );
        });

      migration();

      return {
        success: true,

        imported,

        transactions:
          listTransactions(),
      };
    };

  return {
    listTransactions,

    importLegacyTransactions,

    checkoutSale:
      (checkoutData) =>
        checkoutTransaction(
          checkoutData
        ),

    close() {
      if (db.open) {
        db.close();
      }
    },
  };
}

module.exports = {
  createSalesDatabase,
};