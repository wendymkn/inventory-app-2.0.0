const fs = require("fs");
const path = require("path");

const Database = require(
  "better-sqlite3"
);

function createDatabase(
  userDataPath
) {
  const dataDirectory =
    path.join(
      userDataPath,
      "data"
    );

  fs.mkdirSync(
    dataDirectory,
    {
      recursive: true,
    }
  );

  const databasePath =
    path.join(
      dataDirectory,
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
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );


    CREATE TABLE IF NOT EXISTS business_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),

      name TEXT NOT NULL DEFAULT 'GlamStock Beauty Store',
      tagline TEXT,
      logo_path TEXT,

      phone TEXT,
      email TEXT,
      address TEXT,

      kra_pin TEXT,
      registration_number TEXT,

      currency TEXT NOT NULL DEFAULT 'KSh',

      receipt_footer TEXT NOT NULL
        DEFAULT 'Thank you for shopping with us!',

      receipt_size TEXT NOT NULL
        DEFAULT '80mm',

      low_stock_alerts INTEGER NOT NULL
        DEFAULT 1,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP
    );


    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      username TEXT NOT NULL UNIQUE,

      display_name TEXT NOT NULL,

      password_hash TEXT NOT NULL,

      role TEXT NOT NULL
        CHECK (
          role IN (
            'admin',
            'worker'
          )
        ),

      is_active INTEGER NOT NULL
        DEFAULT 1,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP
    );


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


    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      name TEXT NOT NULL,

      brand TEXT,

      category TEXT NOT NULL,

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
        DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (
        supplier_id
      )
      REFERENCES suppliers(id)
      ON DELETE SET NULL
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
        DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (
        customer_id
      )
      REFERENCES customers(id)
      ON DELETE SET NULL,

      FOREIGN KEY (
        user_id
      )
      REFERENCES users(id)
      ON DELETE SET NULL
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
      REFERENCES products(id),

      FOREIGN KEY (
        user_id
      )
      REFERENCES users(id)
      ON DELETE SET NULL
    );


    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      title TEXT NOT NULL,

      category TEXT NOT NULL,

      amount REAL NOT NULL
        CHECK (
          amount >= 0
        ),

      expense_date TEXT NOT NULL,

      notes TEXT,

      user_id INTEGER,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (
        user_id
      )
      REFERENCES users(id)
      ON DELETE SET NULL
    );


    CREATE INDEX IF NOT EXISTS
      idx_products_name
    ON products(name);


    CREATE INDEX IF NOT EXISTS
      idx_transactions_created_at
    ON transactions(created_at);


    CREATE INDEX IF NOT EXISTS
      idx_transaction_items_transaction
    ON transaction_items(
      transaction_id
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


    CREATE INDEX IF NOT EXISTS
      idx_expenses_date
    ON expenses(
      expense_date
    );
  `);

  db.prepare(`
    INSERT OR IGNORE INTO
      app_meta (
        key,
        value
      )
    VALUES (
      'schema_version',
      '1'
    )
  `).run();

  db.prepare(`
    INSERT OR IGNORE INTO
      business_settings (
        id,
        name,
        currency,
        receipt_footer,
        receipt_size,
        low_stock_alerts
      )
    VALUES (
      1,
      'GlamStock Beauty Store',
      'KSh',
      'Thank you for shopping with us!',
      '80mm',
      1
    )
  `).run();


  // ==========================================
  // BUSINESS SETTINGS HELPERS
  // ==========================================

  const mapBusinessRow = (
    row
  ) => {
    if (!row) {
      return null;
    }

    return {
      id:
        row.id,

      name:
        row.name ||
        "GlamStock Beauty Store",

      tagline:
        row.tagline ||
        "",

      logo:
        row.logo_path ||
        "",

      phone:
        row.phone ||
        "",

      email:
        row.email ||
        "",

      address:
        row.address ||
        "",

      kraPin:
        row.kra_pin ||
        "",

      registrationNumber:
        row.registration_number ||
        "",

      currency:
        row.currency ||
        "KSh",

      receiptFooter:
        row.receipt_footer ||
        "Thank you for shopping with us!",

      receiptSize:
        row.receipt_size ||
        "80mm",

      lowStockAlerts:
        Boolean(
          row.low_stock_alerts
        ),

      updatedAt:
        row.updated_at,
    };
  };


  const getBusiness = () => {
    const row =
      db.prepare(`
        SELECT *
        FROM business_settings
        WHERE id = 1
      `).get();

    return mapBusinessRow(
      row
    );
  };


  const updateBusiness = (
    input = {}
  ) => {
    const current =
      getBusiness() || {};

    const text = (
      value
    ) =>
      String(
        value ?? ""
      ).trim();


    const receiptSize =
      input.receiptSize ===
      "58mm"
        ? "58mm"
        : input.receiptSize ===
          "80mm"
        ? "80mm"
        : current.receiptSize ||
          "80mm";


    const next = {
      name:
        text(
          input.name ??
          current.name
        ) ||
        "GlamStock Beauty Store",

      tagline:
        text(
          input.tagline ??
          current.tagline
        ),

      logo:
        input.logo ??
        current.logo ??
        "",

      phone:
        text(
          input.phone ??
          current.phone
        ),

      email:
        text(
          input.email ??
          current.email
        ),

      address:
        text(
          input.address ??
          current.address
        ),

      kraPin:
        text(
          input.kraPin ??
          current.kraPin
        ),

      registrationNumber:
        text(
          input.registrationNumber ??
          current.registrationNumber
        ),

      currency:
        text(
          input.currency ??
          current.currency
        ) ||
        "KSh",

      receiptFooter:
        text(
          input.receiptFooter ??
          current.receiptFooter
        ) ||
        "Thank you for shopping with us!",

      receiptSize,

      lowStockAlerts:
        input.lowStockAlerts ===
        undefined
          ? current.lowStockAlerts !==
            false
          : Boolean(
              input.lowStockAlerts
            ),
    };


    db.prepare(`
      UPDATE business_settings

      SET
        name = ?,
        tagline = ?,
        logo_path = ?,
        phone = ?,
        email = ?,
        address = ?,
        kra_pin = ?,
        registration_number = ?,
        currency = ?,
        receipt_footer = ?,
        receipt_size = ?,
        low_stock_alerts = ?,
        updated_at = CURRENT_TIMESTAMP

      WHERE id = 1
    `).run(
      next.name,
      next.tagline,
      next.logo,
      next.phone,
      next.email,
      next.address,
      next.kraPin,
      next.registrationNumber,
      next.currency,
      next.receiptFooter,
      next.receiptSize,
      next.lowStockAlerts
        ? 1
        : 0
    );


    return getBusiness();
  };


  // ==========================================
  // DATABASE SERVICE
  // ==========================================

  return {
    getInfo() {
      const version =
        db.prepare(`
          SELECT
            sqlite_version()
              AS version
        `).get();

      return {
        connected: true,

        databasePath,

        sqliteVersion:
          version.version,
      };
    },


    getBusiness,


    updateBusiness,


    healthCheck() {
      const integrity =
        db.pragma(
          "integrity_check",
          {
            simple: true,
          }
        );

      const quickCheck =
        db.pragma(
          "quick_check",
          {
            simple: true,
          }
        );

      const pageCount =
        Number(
          db.pragma(
            "page_count",
            {
              simple: true,
            }
          ) || 0
        );

      const pageSize =
        Number(
          db.pragma(
            "page_size",
            {
              simple: true,
            }
          ) || 0
        );

      return {
        success:
          integrity === "ok" &&
          quickCheck === "ok",

        integrity,
        quickCheck,

        sizeBytes:
          pageCount *
          pageSize,
      };
    },


    optimize() {
      db.pragma(
        "wal_checkpoint(PASSIVE)"
      );

      db.exec(
        "PRAGMA optimize;"
      );

      return {
        success: true,
        message:
          "Database optimization completed successfully.",
      };
    },


    close() {
      if (db.open) {
        db.close();
      }
    },
  };
}


module.exports = {
  createDatabase,
};