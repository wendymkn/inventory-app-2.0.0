const path = require("path");
const Database = require("better-sqlite3");

const text = (value) =>
  String(value ?? "").trim();

function createContactsDatabase(
  userDataPath
) {
  const databasePath =
    path.join(
      userDataPath,
      "data",
      "glamstock.db"
    );

  const db =
    new Database(databasePath);

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
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      name TEXT NOT NULL,

      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,

      is_active INTEGER NOT NULL
        DEFAULT 1,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP
    );


    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      name TEXT NOT NULL,

      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,

      is_active INTEGER NOT NULL
        DEFAULT 1,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP
    );


    CREATE INDEX IF NOT EXISTS
      idx_suppliers_name
    ON suppliers(name);


    CREATE INDEX IF NOT EXISTS
      idx_customers_name
    ON customers(name);
  `);

  // ==========================================
  // SUPPLIERS
  // ==========================================

  const mapSupplier = (
    row
  ) => {
    if (!row) {
      return null;
    }

    return {
      id:
        row.id,

      name:
        row.name || "",

      phone:
        row.phone || "",

      email:
        row.email || "",

      address:
        row.address || "",

      notes:
        row.notes || "",

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

  const getSupplier = (
    id
  ) => {
    const row =
      db.prepare(`
        SELECT *
        FROM suppliers

        WHERE id = ?
          AND is_active = 1
      `).get(id);

    return mapSupplier(
      row
    );
  };

  const listSuppliers =
    () =>
      db.prepare(`
        SELECT *
        FROM suppliers

        WHERE is_active = 1

        ORDER BY name ASC
      `)
        .all()
        .map(
          mapSupplier
        );

  const validateSupplier = (
    input = {}
  ) => {
    const supplier = {
      name:
        text(
          input.name
        ),

      phone:
        text(
          input.phone
        ),

      email:
        text(
          input.email
        ),

      address:
        text(
          input.address
        ),

      notes:
        text(
          input.notes
        ),
    };

    if (
      !supplier.name
    ) {
      return {
        success: false,

        message:
          "Supplier name is required.",
      };
    }

    return {
      success: true,
      supplier,
    };
  };

  const createSupplier = (
    input
  ) => {
    const validation =
      validateSupplier(
        input
      );

    if (
      !validation.success
    ) {
      return validation;
    }

    const supplier =
      validation.supplier;

    const result =
      db.prepare(`
        INSERT INTO suppliers (
          name,
          phone,
          email,
          address,
          notes,
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
          1,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `).run(
        supplier.name,
        supplier.phone,
        supplier.email,
        supplier.address,
        supplier.notes
      );

    return {
      success: true,

      supplier:
        getSupplier(
          result.lastInsertRowid
        ),
    };
  };

  const updateSupplier =
    db.transaction(
      (
        id,
        input
      ) => {
        const current =
          getSupplier(id);

        if (!current) {
          return {
            success: false,

            message:
              "Supplier not found.",
          };
        }

        const validation =
          validateSupplier(
            input
          );

        if (
          !validation.success
        ) {
          return validation;
        }

        const supplier =
          validation.supplier;

        db.prepare(`
          UPDATE suppliers

          SET
            name = ?,
            phone = ?,
            email = ?,
            address = ?,
            notes = ?,
            updated_at =
              CURRENT_TIMESTAMP

          WHERE id = ?
            AND is_active = 1
        `).run(
          supplier.name,
          supplier.phone,
          supplier.email,
          supplier.address,
          supplier.notes,
          id
        );

        /*
          Products currently store
          supplier name while we
          finish the migration.

          Keep product supplier
          names synchronized if a
          supplier is renamed.
        */

        if (
          current.name !==
          supplier.name
        ) {
          db.prepare(`
            UPDATE products

            SET
              supplier_name = ?,
              updated_at =
                CURRENT_TIMESTAMP

            WHERE supplier_name = ?
          `).run(
            supplier.name,
            current.name
          );
        }

        return {
          success: true,

          supplier:
            getSupplier(id),
        };
      }
    );

  const removeSupplier = (
    id
  ) => {
    const current =
      getSupplier(id);

    if (!current) {
      return {
        success: false,

        message:
          "Supplier not found.",
      };
    }

    db.prepare(`
      UPDATE suppliers

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

  const importLegacySuppliers = (
    suppliers = []
  ) => {
    const count =
      db.prepare(`
        SELECT COUNT(*) AS count
        FROM suppliers
      `).get().count;

    if (
      count > 0 ||
      !Array.isArray(
        suppliers
      ) ||
      suppliers.length === 0
    ) {
      return {
        success: true,

        imported: 0,

        suppliers:
          listSuppliers(),
      };
    }

    let imported = 0;

    const insertWithId =
      db.prepare(`
        INSERT OR IGNORE INTO suppliers (
          id,
          name,
          phone,
          email,
          address,
          notes,
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
          1,
          ?,
          ?
        )
      `);

    const insertAuto =
      db.prepare(`
        INSERT INTO suppliers (
          name,
          phone,
          email,
          address,
          notes,
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
          1,
          ?,
          ?
        )
      `);

    const migration =
      db.transaction(() => {
        for (
          const item
          of suppliers
        ) {
          const validation =
            validateSupplier(
              item
            );

          if (
            !validation.success
          ) {
            continue;
          }

          const supplier =
            validation.supplier;

          const createdAt =
            text(
              item.createdAt
            ) ||
            new Date()
              .toISOString();

          const updatedAt =
            text(
              item.updatedAt
            ) ||
            createdAt;

          const legacyId =
            Number(
              item.id
            );

          if (
            Number.isSafeInteger(
              legacyId
            ) &&
            legacyId > 0
          ) {
            const result =
              insertWithId.run(
                legacyId,
                supplier.name,
                supplier.phone,
                supplier.email,
                supplier.address,
                supplier.notes,
                createdAt,
                updatedAt
              );

            if (
              result.changes >
              0
            ) {
              imported += 1;
            }
          } else {
            insertAuto.run(
              supplier.name,
              supplier.phone,
              supplier.email,
              supplier.address,
              supplier.notes,
              createdAt,
              updatedAt
            );

            imported += 1;
          }
        }
      });

    migration();

    return {
      success: true,

      imported,

      suppliers:
        listSuppliers(),
    };
  };

  // ==========================================
  // CUSTOMERS
  // ==========================================

  const mapCustomer = (
    row
  ) => {
    if (!row) {
      return null;
    }

    return {
      id:
        row.id,

      name:
        row.name || "",

      phone:
        row.phone || "",

      email:
        row.email || "",

      address:
        row.address || "",

      notes:
        row.notes || "",

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

  const getCustomer = (
    id
  ) => {
    const row =
      db.prepare(`
        SELECT *
        FROM customers

        WHERE id = ?
          AND is_active = 1
      `).get(id);

    return mapCustomer(
      row
    );
  };

  const listCustomers =
    () =>
      db.prepare(`
        SELECT *
        FROM customers

        WHERE is_active = 1

        ORDER BY name ASC
      `)
        .all()
        .map(
          mapCustomer
        );

  const validateCustomer = (
    input = {}
  ) => {
    const customer = {
      name:
        text(
          input.name
        ),

      phone:
        text(
          input.phone
        ),

      email:
        text(
          input.email
        ),

      address:
        text(
          input.address
        ),

      notes:
        text(
          input.notes
        ),
    };

    if (
      !customer.name
    ) {
      return {
        success: false,

        message:
          "Customer name is required.",
      };
    }

    return {
      success: true,
      customer,
    };
  };

  const createCustomer = (
    input
  ) => {
    const validation =
      validateCustomer(
        input
      );

    if (
      !validation.success
    ) {
      return validation;
    }

    const customer =
      validation.customer;

    const result =
      db.prepare(`
        INSERT INTO customers (
          name,
          phone,
          email,
          address,
          notes,
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
          1,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `).run(
        customer.name,
        customer.phone,
        customer.email,
        customer.address,
        customer.notes
      );

    return {
      success: true,

      customer:
        getCustomer(
          result.lastInsertRowid
        ),
    };
  };

  const updateCustomer = (
    id,
    input
  ) => {
    const current =
      getCustomer(id);

    if (!current) {
      return {
        success: false,

        message:
          "Customer not found.",
      };
    }

    const validation =
      validateCustomer(
        input
      );

    if (
      !validation.success
    ) {
      return validation;
    }

    const customer =
      validation.customer;

    db.prepare(`
      UPDATE customers

      SET
        name = ?,
        phone = ?,
        email = ?,
        address = ?,
        notes = ?,
        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
        AND is_active = 1
    `).run(
      customer.name,
      customer.phone,
      customer.email,
      customer.address,
      customer.notes,
      id
    );

    return {
      success: true,

      customer:
        getCustomer(id),
    };
  };

  const removeCustomer = (
    id
  ) => {
    const current =
      getCustomer(id);

    if (!current) {
      return {
        success: false,

        message:
          "Customer not found.",
      };
    }

    /*
      Soft-delete keeps old sales
      linked to this customer.
    */

    db.prepare(`
      UPDATE customers

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

  const importLegacyCustomers = (
    customers = []
  ) => {
    const count =
      db.prepare(`
        SELECT COUNT(*) AS count
        FROM customers
      `).get().count;

    if (
      count > 0 ||
      !Array.isArray(
        customers
      ) ||
      customers.length === 0
    ) {
      return {
        success: true,

        imported: 0,

        customers:
          listCustomers(),
      };
    }

    let imported = 0;

    const insertWithId =
      db.prepare(`
        INSERT OR IGNORE INTO customers (
          id,
          name,
          phone,
          email,
          address,
          notes,
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
          1,
          ?,
          ?
        )
      `);

    const insertAuto =
      db.prepare(`
        INSERT INTO customers (
          name,
          phone,
          email,
          address,
          notes,
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
          1,
          ?,
          ?
        )
      `);

    const migration =
      db.transaction(() => {
        for (
          const item
          of customers
        ) {
          const validation =
            validateCustomer(
              item
            );

          if (
            !validation.success
          ) {
            continue;
          }

          const customer =
            validation.customer;

          const createdAt =
            text(
              item.createdAt
            ) ||
            new Date()
              .toISOString();

          const updatedAt =
            text(
              item.updatedAt
            ) ||
            createdAt;

          const legacyId =
            Number(
              item.id
            );

          if (
            Number.isSafeInteger(
              legacyId
            ) &&
            legacyId > 0
          ) {
            const result =
              insertWithId.run(
                legacyId,
                customer.name,
                customer.phone,
                customer.email,
                customer.address,
                customer.notes,
                createdAt,
                updatedAt
              );

            if (
              result.changes >
              0
            ) {
              imported += 1;
            }
          } else {
            insertAuto.run(
              customer.name,
              customer.phone,
              customer.email,
              customer.address,
              customer.notes,
              createdAt,
              updatedAt
            );

            imported += 1;
          }
        }
      });

    migration();

    return {
      success: true,

      imported,

      customers:
        listCustomers(),
    };
  };

  return {
    listSuppliers,
    createSupplier,
    updateSupplier,
    removeSupplier,
    importLegacySuppliers,

    listCustomers,
    createCustomer,
    updateCustomer,
    removeCustomer,
    importLegacyCustomers,

    close() {
      if (db.open) {
        db.close();
      }
    },
  };
}

module.exports = {
  createContactsDatabase,
};