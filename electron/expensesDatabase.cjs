const path = require("path");
const Database = require("better-sqlite3");

const text = (value) =>
  String(value ?? "").trim();

const toNumber = (
  value,
  fallback = 0
) => {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : fallback;
};

const money = (value) =>
  Number(
    toNumber(
      value
    ).toFixed(2)
  );

const today = () =>
  new Date()
    .toISOString()
    .split("T")[0];

function createExpensesDatabase(
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
      idx_expenses_date
    ON expenses(
      expense_date
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
    User authentication has not
    yet been migrated to SQLite.

    Until then we safely store the
    display name and leave user_id
    NULL.
  */

  ensureColumn(
    "expenses",
    "user_name",
    "TEXT"
  );

  ensureColumn(
    "expenses",
    "is_active",
    "INTEGER NOT NULL DEFAULT 1"
  );

  ensureColumn(
    "expenses",
    "updated_at",
    "TEXT"
  );

  const mapExpense = (
    row
  ) => {
    if (!row) {
      return null;
    }

    return {
      id:
        row.id,

      title:
        row.title || "",

      category:
        row.category ||
        "Other",

      amount:
        money(
          row.amount
        ),

      date:
        row.expense_date,

      notes:
        row.notes || "",

      userId:
        row.user_id ??
        null,

      userName:
        row.user_name ||
        "",

      isActive:
        Boolean(
          row.is_active
        ),

      createdAt:
        row.created_at,

      updatedAt:
        row.updated_at ||
        row.created_at,
    };
  };

  const getExpense = (
    id
  ) => {
    const row =
      db.prepare(`
        SELECT *
        FROM expenses

        WHERE id = ?
          AND is_active = 1
      `).get(id);

    return mapExpense(
      row
    );
  };

  const listExpenses =
    () =>
      db.prepare(`
        SELECT *
        FROM expenses

        WHERE is_active = 1

        ORDER BY
          expense_date DESC,
          id DESC
      `)
        .all()
        .map(
          mapExpense
        );

  const validateExpense = (
    input = {}
  ) => {
    const expense = {
      title:
        text(
          input.title
        ),

      category:
        text(
          input.category
        ) ||
        "Other",

      amount:
        money(
          input.amount
        ),

      date:
        text(
          input.date ??
          input.expenseDate ??
          input.expense_date
        ) ||
        today(),

      notes:
        text(
          input.notes
        ),

      userName:
        text(
          input.userName
        ),
    };

    if (
      !expense.title
    ) {
      return {
        success: false,

        message:
          "Enter an expense description.",
      };
    }

    if (
      !Number.isFinite(
        expense.amount
      ) ||
      expense.amount <= 0
    ) {
      return {
        success: false,

        message:
          "Expense amount must be greater than zero.",
      };
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        expense.date
      )
    ) {
      return {
        success: false,

        message:
          "Enter a valid expense date.",
      };
    }

    return {
      success: true,
      expense,
    };
  };

  const createExpense = (
    input
  ) => {
    const validation =
      validateExpense(
        input
      );

    if (
      !validation.success
    ) {
      return validation;
    }

    const expense =
      validation.expense;

    const result =
      db.prepare(`
        INSERT INTO expenses (
          title,
          category,
          amount,
          expense_date,
          notes,
          user_id,
          user_name,
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
          NULL,
          ?,
          1,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `).run(
        expense.title,
        expense.category,
        expense.amount,
        expense.date,
        expense.notes,
        expense.userName
      );

    return {
      success: true,

      expense:
        getExpense(
          result.lastInsertRowid
        ),
    };
  };

  const updateExpense = (
    id,
    input
  ) => {
    const current =
      getExpense(id);

    if (!current) {
      return {
        success: false,

        message:
          "Expense not found.",
      };
    }

    const validation =
      validateExpense({
        ...current,
        ...input,

        userName:
          input.userName ??
          current.userName,
      });

    if (
      !validation.success
    ) {
      return validation;
    }

    const expense =
      validation.expense;

    db.prepare(`
      UPDATE expenses

      SET
        title = ?,
        category = ?,
        amount = ?,
        expense_date = ?,
        notes = ?,
        user_name = ?,
        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
        AND is_active = 1
    `).run(
      expense.title,
      expense.category,
      expense.amount,
      expense.date,
      expense.notes,
      expense.userName,
      id
    );

    return {
      success: true,

      expense:
        getExpense(id),
    };
  };

  const removeExpense = (
    id
  ) => {
    const current =
      getExpense(id);

    if (!current) {
      return {
        success: false,

        message:
          "Expense not found.",
      };
    }

    /*
      Soft delete so we do not
      physically destroy accounting
      records.
    */

    db.prepare(`
      UPDATE expenses

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

  const importLegacyExpenses = (
    items = []
  ) => {
    const count =
      db.prepare(`
        SELECT
          COUNT(*) AS count

        FROM expenses
      `).get().count;

    if (
      count > 0 ||
      !Array.isArray(
        items
      ) ||
      items.length === 0
    ) {
      return {
        success: true,

        imported: 0,

        expenses:
          listExpenses(),
      };
    }

    const insertWithId =
      db.prepare(`
        INSERT OR IGNORE INTO expenses (
          id,
          title,
          category,
          amount,
          expense_date,
          notes,
          user_id,
          user_name,
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
          NULL,
          ?,
          1,
          ?,
          ?
        )
      `);

    const insertAuto =
      db.prepare(`
        INSERT INTO expenses (
          title,
          category,
          amount,
          expense_date,
          notes,
          user_id,
          user_name,
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
          NULL,
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
          const item
          of items
        ) {
          const validation =
            validateExpense(
              item
            );

          if (
            !validation.success
          ) {
            continue;
          }

          const expense =
            validation.expense;

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
                expense.title,
                expense.category,
                expense.amount,
                expense.date,
                expense.notes,
                expense.userName,
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
              expense.title,
              expense.category,
              expense.amount,
              expense.date,
              expense.notes,
              expense.userName,
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

      expenses:
        listExpenses(),
    };
  };

  return {
    listExpenses,

    createExpense,

    updateExpense,

    removeExpense,

    importLegacyExpenses,

    close() {
      if (db.open) {
        db.close();
      }
    },
  };
}

module.exports = {
  createExpensesDatabase,
};