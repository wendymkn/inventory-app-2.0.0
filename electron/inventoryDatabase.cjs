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
    !Number.isFinite(quantity)
  ) {
    return 0;
  }

  return unitType === "ml"
    ? Number(
        quantity.toFixed(2)
      )
    : quantity;
};

function createInventoryDatabase(
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
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      name TEXT NOT NULL,

      brand TEXT,

      category TEXT NOT NULL
        DEFAULT '',

      unit_type TEXT NOT NULL
        CHECK (
          unit_type IN (
            'piece',
            'ml'
          )
        ),

      buying_price REAL NOT NULL
        DEFAULT 0
        CHECK (
          buying_price >= 0
        ),

      selling_price REAL NOT NULL
        DEFAULT 0
        CHECK (
          selling_price >= 0
        ),

      stock REAL NOT NULL
        DEFAULT 0
        CHECK (
          stock >= 0
        ),

      low_stock_level REAL NOT NULL
        DEFAULT 0
        CHECK (
          low_stock_level >= 0
        ),

      supplier_id INTEGER,

      is_active INTEGER NOT NULL
        DEFAULT 1,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP
    );


    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      product_id INTEGER NOT NULL,

      movement_type TEXT NOT NULL
        CHECK (
          movement_type IN (
            'stock_in',
            'stock_out',
            'sale',
            'sale_void',
            'adjustment'
          )
        ),

      quantity REAL NOT NULL
        CHECK (
          quantity > 0
        ),

      unit_cost REAL
        DEFAULT 0,

      reason TEXT,

      reference TEXT,

      user_id INTEGER,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (
        product_id
      )
      REFERENCES products(id)
    );


    CREATE INDEX IF NOT EXISTS
      idx_products_name
    ON products(name);


    CREATE INDEX IF NOT EXISTS
      idx_products_active_id
    ON products(
      is_active,
      id DESC
    );


    CREATE INDEX IF NOT EXISTS
      idx_products_active_category
    ON products(
      is_active,
      category
    );


    CREATE INDEX IF NOT EXISTS
      idx_stock_movements_product
    ON stock_movements(
      product_id
    );


    CREATE INDEX IF NOT EXISTS
      idx_stock_movements_created_at
    ON stock_movements(
      created_at
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

  /*
    Temporary fields while
    Suppliers and Users are still
    being migrated.
  */

  ensureColumn(
    "products",
    "supplier_name",
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

  const mapProduct = (
    row
  ) => {
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
        toNumber(
          row.buying_price
        ),

      sellingPrice:
        toNumber(
          row.selling_price
        ),

      stock:
        normalizeQuantity(
          unitType,
          row.stock
        ),

      lowStockLevel:
        normalizeQuantity(
          unitType,
          row.low_stock_level
        ),

      supplier:
        row.supplier_name ||
        "",

      supplierId:
        row.supplier_id ??
        null,

      isActive:
        Boolean(
          row.is_active
        ),

      createdAt:
        row.created_at,

      updatedAt:
        row.updated_at,
    };
  };

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

    return mapProduct(
      row
    );
  };

  const listProducts =
    () =>
      db.prepare(`
        SELECT *
        FROM products

        WHERE is_active = 1

        ORDER BY id DESC
      `)
        .all()
        .map(
          mapProduct
        );

  /*
    Paged catalogue query for large
    inventories.

    This keeps the Products page from
    loading and rendering the complete
    catalogue at once.
  */

  const listProductsPage = (
    options = {}
  ) => {
    const requestedPage =
      Math.max(
        1,
        Math.floor(
          toNumber(
            options.page,
            1
          )
        )
      );

    const limit =
      Math.min(
        200,
        Math.max(
          25,
          Math.floor(
            toNumber(
              options.limit,
              100
            )
          )
        )
      );

    const search =
      text(
        options.search
      );

    const hasSearch =
      search.length > 0;

    const inStockOnly =
      Boolean(
        options.inStockOnly
      );

    const whereStock =
      inStockOnly
        ? "AND stock > 0"
        : "";

    const whereSearch =
      hasSearch
        ? `
          AND (
            name LIKE ?
              COLLATE NOCASE
            OR brand LIKE ?
              COLLATE NOCASE
            OR category LIKE ?
              COLLATE NOCASE
            OR supplier_name LIKE ?
              COLLATE NOCASE
          )
        `
        : "";

    const searchParams =
      hasSearch
        ? Array(4).fill(
            `%${search}%`
          )
        : [];

    const countRow =
      db.prepare(`
        SELECT COUNT(*) AS count
        FROM products

        WHERE is_active = 1
        ${whereStock}
        ${whereSearch}
      `).get(
        ...searchParams
      );

    const total =
      toNumber(
        countRow?.count,
        0
      );

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          total / limit
        )
      );

    const page =
      Math.min(
        requestedPage,
        totalPages
      );

    const offset =
      (page - 1) *
      limit;

    const rows =
      db.prepare(`
        SELECT *
        FROM products

        WHERE is_active = 1
        ${whereStock}
        ${whereSearch}

        ORDER BY id DESC

        LIMIT ?
        OFFSET ?
      `).all(
        ...searchParams,
        limit,
        offset
      );

    return {
      products:
        rows.map(
          mapProduct
        ),

      total,

      page,

      limit,

      totalPages,

      search,

      inStockOnly,
    };
  };

  const getProductsSummary = () => {
    const row =
      db.prepare(`
        SELECT
          COUNT(*) AS product_count,

          COALESCE(
            SUM(
              stock * buying_price
            ),
            0
          ) AS inventory_value,

          COALESCE(
            SUM(
              CASE
                WHEN
                  stock <= low_stock_level
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS low_stock_count,

          COALESCE(
            SUM(
              CASE
                WHEN stock > 0
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS in_stock_count

        FROM products

        WHERE is_active = 1
      `).get();

    return {
      productCount:
        toNumber(
          row?.product_count,
          0
        ),

      inventoryValue:
        toNumber(
          row?.inventory_value,
          0
        ),

      lowStockCount:
        toNumber(
          row?.low_stock_count,
          0
        ),

      inStockCount:
        toNumber(
          row?.in_stock_count,
          0
        ),
    };
  };

  const validateProduct = (
    input = {},
    current = null
  ) => {
    const unitType =
      unitTypeOf(
        input.unitType ??
          input.unit_type ??
          current?.unitType
      );

    const value = {
      name:
        text(
          input.name ??
            current?.name
        ),

      brand:
        text(
          input.brand ??
            current?.brand
        ),

      category:
        text(
          input.category ??
            current?.category
        ),

      unitType,

      buyingPrice:
        toNumber(
          input.buyingPrice ??
            input.buying_price ??
            current?.buyingPrice,
          NaN
        ),

      sellingPrice:
        toNumber(
          input.sellingPrice ??
            input.selling_price ??
            input.price ??
            current?.sellingPrice,
          NaN
        ),

      stock:
        toNumber(
          input.stock ??
            current?.stock ??
            0,
          NaN
        ),

      lowStockLevel:
        toNumber(
          input.lowStockLevel ??
            input.low_stock_level ??
            current?.lowStockLevel ??
            0,
          NaN
        ),

      supplier:
        text(
          input.supplier ??
            current?.supplier
        ),
    };

    if (!value.name) {
      return {
        success: false,

        message:
          "Product name is required.",
      };
    }

    if (
      !Number.isFinite(
        value.buyingPrice
      ) ||
      value.buyingPrice < 0
    ) {
      return {
        success: false,

        message:
          "Buying price cannot be negative.",
      };
    }

    if (
      !Number.isFinite(
        value.sellingPrice
      ) ||
      value.sellingPrice <= 0
    ) {
      return {
        success: false,

        message:
          "Selling price must be greater than zero.",
      };
    }

    if (
      !Number.isFinite(
        value.stock
      ) ||
      value.stock < 0
    ) {
      return {
        success: false,

        message:
          "Opening stock cannot be negative.",
      };
    }

    if (
      !Number.isFinite(
        value.lowStockLevel
      ) ||
      value.lowStockLevel < 0
    ) {
      return {
        success: false,

        message:
          "Low stock level cannot be negative.",
      };
    }

    if (
      value.unitType ===
        "piece" &&
      (
        !Number.isInteger(
          value.stock
        ) ||
        !Number.isInteger(
          value.lowStockLevel
        )
      )
    ) {
      return {
        success: false,

        message:
          "Piece products require whole-number stock quantities and low-stock levels.",
      };
    }

    value.buyingPrice =
      Number(
        value.buyingPrice.toFixed(
          2
        )
      );

    value.sellingPrice =
      Number(
        value.sellingPrice.toFixed(
          2
        )
      );

    value.stock =
      normalizeQuantity(
        value.unitType,
        value.stock
      );

    value.lowStockLevel =
      normalizeQuantity(
        value.unitType,
        value.lowStockLevel
      );

    return {
      success: true,
      value,
    };
  };

  const createProduct = (
    input
  ) => {
    const validation =
      validateProduct(
        input
      );

    if (
      !validation.success
    ) {
      return validation;
    }

    const p =
      validation.value;

    const result =
      db.prepare(`
        INSERT INTO products (
          name,
          brand,
          category,
          unit_type,
          buying_price,
          selling_price,
          stock,
          low_stock_level,
          supplier_name,
          is_active,
          created_at,
          updated_at
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
          1,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `).run(
        p.name,
        p.brand,
        p.category,
        p.unitType,
        p.buyingPrice,
        p.sellingPrice,
        p.stock,
        p.lowStockLevel,
        p.supplier
      );

    return {
      success: true,

      product:
        getProduct(
          result.lastInsertRowid
        ),
    };
  };

  const updateProduct = (
    id,
    input
  ) => {
    const current =
      getProduct(id);

    if (!current) {
      return {
        success: false,

        message:
          "Product not found.",
      };
    }

    const requestedUnit =
      unitTypeOf(
        input?.unitType ??
          input?.unit_type ??
          current.unitType
      );

    /*
      Do not silently change
      piece/ml while inventory
      still exists.
    */

    if (
      requestedUnit !==
        current.unitType &&
      current.stock > 0
    ) {
      return {
        success: false,

        message:
          "Set this product stock to zero before changing its unit type.",
      };
    }

    /*
      Stock cannot be edited from
      Products after creation.

      Inventory changes must go
      through Stock In / Stock Out.
    */

    const validation =
      validateProduct(
        {
          ...input,

          stock:
            current.stock,
        },

        current
      );

    if (
      !validation.success
    ) {
      return validation;
    }

    const p =
      validation.value;

    db.prepare(`
      UPDATE products

      SET
        name = ?,
        brand = ?,
        category = ?,
        unit_type = ?,
        buying_price = ?,
        selling_price = ?,
        low_stock_level = ?,
        supplier_name = ?,
        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
        AND is_active = 1
    `).run(
      p.name,
      p.brand,
      p.category,
      p.unitType,
      p.buyingPrice,
      p.sellingPrice,
      p.lowStockLevel,
      p.supplier,
      id
    );

    return {
      success: true,

      product:
        getProduct(id),
    };
  };

  const removeProduct = (
    id
  ) => {
    const current =
      getProduct(id);

    if (!current) {
      return {
        success: false,

        message:
          "Product not found.",
      };
    }

    /*
      Do not let stock disappear
      when someone removes a
      product.
    */

    if (
      current.stock > 0
    ) {
      return {
        success: false,

        message:
          `Cannot remove ${current.name} while ${current.stock} ${current.unitType} remains in stock. Use Stock Out first.`,
      };
    }

    /*
      Soft delete.

      We keep the row so future
      sales/history can still refer
      to the product.
    */

    db.prepare(`
      UPDATE products

      SET
        is_active = 0,
        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
    `).run(id);

    return {
      success: true,
    };
  };


  const importProductsBatch = (
    items = []
  ) => {
    if (!Array.isArray(items)) {
      return {
        success: false,
        message: "Import data must be an array.",
        imported: 0,
        skipped: 0,
        errors: [],
      };
    }

    if (items.length === 0) {
      return {
        success: false,
        message: "No products were provided for import.",
        imported: 0,
        skipped: 0,
        errors: [],
      };
    }

    if (items.length > 20000) {
      return {
        success: false,
        message: "A single import is limited to 20,000 products.",
        imported: 0,
        skipped: 0,
        errors: [],
      };
    }

    const duplicateQuery =
      db.prepare(`
        SELECT id
        FROM products
        WHERE is_active = 1
          AND LOWER(TRIM(name)) = LOWER(TRIM(?))
          AND LOWER(TRIM(COALESCE(brand, ''))) =
              LOWER(TRIM(COALESCE(?, '')))
          AND LOWER(TRIM(category)) = LOWER(TRIM(?))
          AND unit_type = ?
        LIMIT 1
      `);

    const insert =
      db.prepare(`
        INSERT INTO products (
          name,
          brand,
          category,
          unit_type,
          buying_price,
          selling_price,
          stock,
          low_stock_level,
          supplier_name,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          1,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `);

    const seen = new Set();
    const prepared = [];
    const errors = [];
    let skipped = 0;

    for (let index = 0; index < items.length; index += 1) {
      const raw = items[index] || {};
      const validation = validateProduct(raw);

      if (!validation.success) {
        errors.push({
          row: index + 2,
          message: validation.message,
        });
        continue;
      }

      const product = validation.value;
      const key = [
        product.name.trim().toLowerCase(),
        product.brand.trim().toLowerCase(),
        product.category.trim().toLowerCase(),
        product.unitType,
      ].join("|");

      if (seen.has(key)) {
        skipped += 1;
        continue;
      }

      seen.add(key);

      const existing =
        duplicateQuery.get(
          product.name,
          product.brand,
          product.category,
          product.unitType
        );

      if (existing) {
        skipped += 1;
        continue;
      }

      prepared.push(product);
    }

    if (errors.length > 0) {
      return {
        success: false,
        message:
          "Import stopped because one or more rows are invalid. Fix the reported rows and try again.",
        imported: 0,
        skipped,
        errors: errors.slice(0, 100),
        errorCount: errors.length,
      };
    }

    const writeImport =
      db.transaction(() => {
        for (const product of prepared) {
          insert.run(
            product.name,
            product.brand,
            product.category,
            product.unitType,
            product.buyingPrice,
            product.sellingPrice,
            product.stock,
            product.lowStockLevel,
            product.supplier
          );
        }
      });

    writeImport();

    return {
      success: true,
      imported: prepared.length,
      skipped,
      errors: [],
      message:
        `${prepared.length} product${prepared.length === 1 ? "" : "s"} imported successfully.` +
        (skipped > 0
          ? ` ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped.`
          : ""),
    };
  };

  const importLegacyProducts = (
    items = []
  ) => {
    const count =
      db.prepare(`
        SELECT
          COUNT(*) AS count
        FROM products
      `).get().count;

    /*
      Migration only runs when the
      SQLite product table is empty.
    */

    if (
      count > 0 ||
      !Array.isArray(items)
    ) {
      return {
        success: true,

        imported: 0,

        products:
          listProducts(),
      };
    }

    const insertWithId =
      db.prepare(`
        INSERT INTO products (
          id,
          name,
          brand,
          category,
          unit_type,
          buying_price,
          selling_price,
          stock,
          low_stock_level,
          supplier_name,
          is_active,
          created_at,
          updated_at
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
          1,
          ?,
          ?
        )
      `);

    const insertAuto =
      db.prepare(`
        INSERT INTO products (
          name,
          brand,
          category,
          unit_type,
          buying_price,
          selling_price,
          stock,
          low_stock_level,
          supplier_name,
          is_active,
          created_at,
          updated_at
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
          1,
          ?,
          ?
        )
      `);

    let imported = 0;

    const migration =
      db.transaction(() => {
        for (
          const item of items
        ) {
          const validation =
            validateProduct(
              item
            );

          if (
            !validation.success
          ) {
            continue;
          }

          const p =
            validation.value;

          const createdAt =
            text(
              item?.createdAt
            ) ||
            new Date()
              .toISOString();

          const updatedAt =
            text(
              item?.updatedAt
            ) ||
            createdAt;

          const legacyId =
            Number(
              item?.id
            );

          const safeId =
            Number.isSafeInteger(
              legacyId
            ) &&
            legacyId > 0;

          if (safeId) {
            insertWithId.run(
              legacyId,
              p.name,
              p.brand,
              p.category,
              p.unitType,
              p.buyingPrice,
              p.sellingPrice,
              p.stock,
              p.lowStockLevel,
              p.supplier,
              createdAt,
              updatedAt
            );
          } else {
            insertAuto.run(
              p.name,
              p.brand,
              p.category,
              p.unitType,
              p.buyingPrice,
              p.sellingPrice,
              p.stock,
              p.lowStockLevel,
              p.supplier,
              createdAt,
              updatedAt
            );
          }

          imported += 1;
        }
      });

    migration();

    return {
      success: true,

      imported,

      products:
        listProducts(),
    };
  };

  const mapMovement = (
    row
  ) => {
    if (!row) {
      return null;
    }

    return {
      id:
        row.id,

      type:
        row.movement_type ===
        "stock_in"
          ? "in"
          : row.movement_type ===
            "stock_out"
          ? "out"
          : row.movement_type,

      productId:
        row.product_id,

      productName:
        row.product_name || "",

      quantity:
        toNumber(
          row.quantity
        ),

      unitType:
        unitTypeOf(
          row.unit_type
        ),

      reason:
        row.reason || "",

      notes:
        row.notes || "",

      userId:
        row.user_id ??
        null,

      userName:
        row.user_name ||
        "Unknown",

      date:
        row.created_at,
    };
  };

  const listMovements =
    () =>
      db.prepare(`
        SELECT
          sm.*,

          p.name
            AS product_name,

          p.unit_type
            AS unit_type

        FROM
          stock_movements sm

        JOIN
          products p

        ON
          p.id =
          sm.product_id

        ORDER BY
          sm.id DESC

        LIMIT 1000
      `)
        .all()
        .map(
          mapMovement
        );

  const validateMovement = (
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
          "Quantity must be greater than zero.",
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
          "Piece products require a whole-number quantity.",
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

  const readMovement = (
    id
  ) => {
    const row =
      db.prepare(`
        SELECT
          sm.*,

          p.name
            AS product_name,

          p.unit_type
            AS unit_type

        FROM
          stock_movements sm

        JOIN
          products p

        ON
          p.id =
          sm.product_id

        WHERE
          sm.id = ?
      `).get(id);

    return mapMovement(
      row
    );
  };

  /*
    Stock In is one SQLite
    transaction.

    Either both product balance and
    history save, or neither saves.
  */

  const stockInTransaction =
    db.transaction(
      (
        productId,
        value,
        metadata = {}
      ) => {
        const product =
          getProduct(
            productId
          );

        if (!product) {
          return {
            success: false,

            message:
              "Product not found.",
          };
        }

        const validation =
          validateMovement(
            product,
            value
          );

        if (
          !validation.success
        ) {
          return validation;
        }

        const quantity =
          validation.quantity;

        const newStock =
          normalizeQuantity(
            product.unitType,

            product.stock +
              quantity
          );

        db.prepare(`
          UPDATE products

          SET
            stock = ?,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id = ?
        `).run(
          newStock,
          product.id
        );

        const movement =
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
              'stock_in',
              ?,
              ?,
              ?,
              ?,
              NULL,
              ?,
              ?,
              CURRENT_TIMESTAMP
            )
          `).run(
            product.id,

            quantity,

            product.buyingPrice,

            text(
              metadata.reason
            ) ||
              "Stock purchase",

            text(
              metadata.reference
            ),

            text(
              metadata.notes
            ),

            text(
              metadata.userName
            ) ||
              "Unknown"
          );

        return {
          success: true,

          product:
            getProduct(
              product.id
            ),

          movement:
            readMovement(
              movement.lastInsertRowid
            ),
        };
      }
    );

  const stockOutTransaction =
    db.transaction(
      (
        productId,
        value,
        metadata = {}
      ) => {
        const product =
          getProduct(
            productId
          );

        if (!product) {
          return {
            success: false,

            message:
              "Product not found.",
          };
        }

        const validation =
          validateMovement(
            product,
            value
          );

        if (
          !validation.success
        ) {
          return validation;
        }

        const quantity =
          validation.quantity;

        if (
          quantity >
          product.stock
        ) {
          return {
            success: false,

            message:
              `Only ${product.stock} ${product.unitType} available.`,
          };
        }

        const newStock =
          normalizeQuantity(
            product.unitType,

            product.stock -
              quantity
          );

        db.prepare(`
          UPDATE products

          SET
            stock = ?,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id = ?
        `).run(
          newStock,
          product.id
        );

        const movement =
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
              'stock_out',
              ?,
              ?,
              ?,
              ?,
              NULL,
              ?,
              ?,
              CURRENT_TIMESTAMP
            )
          `).run(
            product.id,

            quantity,

            product.buyingPrice,

            text(
              metadata.reason
            ) ||
              "Adjustment",

            text(
              metadata.reference
            ),

            text(
              metadata.notes
            ),

            text(
              metadata.userName
            ) ||
              "Unknown"
          );

        return {
          success: true,

          product:
            getProduct(
              product.id
            ),

          movement:
            readMovement(
              movement.lastInsertRowid
            ),
        };
      }
    );

  return {
    listProducts,

    listProductsPage,

    getProductsSummary,

    createProduct,

    updateProduct,

    removeProduct,

    importProductsBatch,

    importLegacyProducts,

    listMovements,

    stockIn: (
      productId,
      quantity,
      metadata
    ) =>
      stockInTransaction(
        productId,
        quantity,
        metadata
      ),

    stockOut: (
      productId,
      quantity,
      metadata
    ) =>
      stockOutTransaction(
        productId,
        quantity,
        metadata
      ),

    close() {
      if (db.open) {
        db.close();
      }
    },
  };
}

module.exports = {
  createInventoryDatabase,
};