const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const SESSION_LIFETIME =
  12 * 60 * 60 * 1000;

const text = (value) =>
  String(value ?? "").trim();

const normalizeUsername = (value) =>
  text(value).toLowerCase();

const VALID_ROLES = new Set([
  "admin",
  "worker",
]);

const WORKER_PERMISSIONS = new Set([
  "stock.in",
  "stock.out",
  "sales.checkout",
  "customers.add",
]);

const hashPassword = (password) => {
  const salt = crypto
    .randomBytes(16)
    .toString("hex");

  const hash = crypto
    .scryptSync(
      password,
      salt,
      64
    )
    .toString("hex");

  return [
    "scrypt",
    salt,
    hash,
  ].join("$");
};

const verifyPassword = (
  password,
  storedHash
) => {
  try {
    const [
      algorithm,
      salt,
      expectedHex,
    ] = String(
      storedHash || ""
    ).split("$");

    if (
      algorithm !== "scrypt" ||
      !salt ||
      !expectedHex
    ) {
      return false;
    }

    const calculated =
      crypto.scryptSync(
        password,
        salt,
        64
      );

    const expected =
      Buffer.from(
        expectedHex,
        "hex"
      );

    if (
      calculated.length !==
      expected.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      calculated,
      expected
    );
  } catch {
    return false;
  }
};

function createAuthDatabase(
  userDataPath
) {
  const databasePath = path.join(
    userDataPath,
    "data",
    "glamstock.db"
  );

  const db = new Database(
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
    CREATE TABLE IF NOT EXISTS app_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      name TEXT NOT NULL,

      username TEXT NOT NULL
        COLLATE NOCASE
        UNIQUE,

      password_hash TEXT NOT NULL,

      role TEXT NOT NULL
        CHECK (
          role IN ('admin', 'worker')
        ),

      active INTEGER NOT NULL
        DEFAULT 1,

      must_change_password INTEGER
        NOT NULL
        DEFAULT 0,

      created_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at TEXT NOT NULL
        DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS
      idx_app_users_username
    ON app_users(username);
  `);

  const sessions = new Map();

  const mapUser = (row) => {
    if (!row) {
      return null;
    }

    return {
      id: row.id,

      name: row.name,

      username:
        row.username,

      role:
        row.role,

      active:
        Boolean(
          row.active
        ),

      mustChangePassword:
        Boolean(
          row.must_change_password
        ),

      createdAt:
        row.created_at,

      updatedAt:
        row.updated_at,
    };
  };

  const readUser = (id) =>
    db.prepare(`
      SELECT *
      FROM app_users
      WHERE id = ?
    `).get(id) || null;

  const publicUser = (id) =>
    mapUser(
      readUser(id)
    );

  const userCount = () =>
    db.prepare(`
      SELECT COUNT(*) AS count
      FROM app_users
    `).get().count;

  const getSetupStatus = () => ({
    setupRequired:
      userCount() === 0,
  });

  const createSession = (
    userId
  ) => {
    const token = crypto
      .randomBytes(32)
      .toString("hex");

    sessions.set(
      token,
      {
        userId,

        createdAt:
          Date.now(),

        lastSeen:
          Date.now(),
      }
    );

    return token;
  };

  const destroyUserSessions = (
    userId,
    exceptToken = null
  ) => {
    for (
      const [
        token,
        session,
      ] of sessions.entries()
    ) {
      if (
        session.userId ===
          userId &&
        token !==
          exceptToken
      ) {
        sessions.delete(
          token
        );
      }
    }
  };

  const getSession = (token) => {
    if (!token) {
      return null;
    }

    const session =
      sessions.get(token);

    if (!session) {
      return null;
    }

    const expired =
      Date.now() -
        session.lastSeen >
      SESSION_LIFETIME;

    if (expired) {
      sessions.delete(
        token
      );

      return null;
    }

    const row =
      readUser(
        session.userId
      );

    if (
      !row ||
      !row.active
    ) {
      sessions.delete(
        token
      );

      return null;
    }

    session.lastSeen =
      Date.now();

    return {
      session,
      row,
      user:
        mapUser(row),
    };
  };

  const requireSession = (
    token
  ) => {
    const result =
      getSession(token);

    if (!result) {
      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    return result;
  };

  const authorize = (
    token,
    permission
  ) => {
    const result =
      requireSession(
        token
      );

    const { user } =
      result;

    if (
      user.mustChangePassword
    ) {
      throw new Error(
        "You must change your temporary password before continuing."
      );
    }

    if (
      user.role ===
      "admin"
    ) {
      return user;
    }

    if (
      user.role ===
        "worker" &&
      WORKER_PERMISSIONS.has(
        permission
      )
    ) {
      return user;
    }

    throw new Error(
      "You do not have permission to perform this action."
    );
  };

  const validateOwner = (
    input = {}
  ) => {
    const name =
      text(input.name);

    const username =
      normalizeUsername(
        input.username
      );

    const password =
      String(
        input.password || ""
      );

    if (!name) {
      return {
        success: false,

        message:
          "Owner name is required.",
      };
    }

    if (
      username.length < 3
    ) {
      return {
        success: false,

        message:
          "Username must contain at least 3 characters.",
      };
    }

    if (
      !/^[a-z0-9._-]+$/.test(
        username
      )
    ) {
      return {
        success: false,

        message:
          "Username may only contain letters, numbers, dots, hyphens and underscores.",
      };
    }

    if (
      password.length < 8
    ) {
      return {
        success: false,

        message:
          "Password must contain at least 8 characters.",
      };
    }

    return {
      success: true,

      owner: {
        name,
        username,
        password,
      },
    };
  };

  const createOwner = (
    input
  ) => {
    const validation =
      validateOwner(
        input
      );

    if (
      !validation.success
    ) {
      return validation;
    }

    const owner =
      validation.owner;

    const createTransaction =
      db.transaction(() => {
        if (
          userCount() !== 0
        ) {
          return {
            success: false,

            message:
              "GlamStock has already been configured.",
          };
        }

        const result =
          db.prepare(`
            INSERT INTO app_users (
              name,
              username,
              password_hash,
              role,
              active,
              must_change_password,
              created_at,
              updated_at
            )

            VALUES (
              ?,
              ?,
              ?,
              'admin',
              1,
              0,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            )
          `).run(
            owner.name,
            owner.username,
            hashPassword(
              owner.password
            )
          );

        return {
          success: true,

          userId:
            Number(
              result.lastInsertRowid
            ),
        };
      });

    const created =
      createTransaction();

    if (
      !created.success
    ) {
      return created;
    }

    const token =
      createSession(
        created.userId
      );

    return {
      success: true,

      token,

      user:
        publicUser(
          created.userId
        ),
    };
  };

  const login = (
    credentials = {}
  ) => {
    if (
      userCount() === 0
    ) {
      return {
        success: false,

        setupRequired:
          true,

        message:
          "Create the owner account first.",
      };
    }

    const username =
      normalizeUsername(
        credentials.username
      );

    const password =
      String(
        credentials.password ||
          ""
      );

    if (
      !username ||
      !password
    ) {
      return {
        success: false,

        message:
          "Enter your username and password.",
      };
    }

    const row =
      db.prepare(`
        SELECT *
        FROM app_users

        WHERE username = ?
          COLLATE NOCASE
      `).get(
        username
      );

    if (
      !row ||
      !row.active ||
      !verifyPassword(
        password,
        row.password_hash
      )
    ) {
      return {
        success: false,

        message:
          "Invalid username or password.",
      };
    }

    destroyUserSessions(
      row.id
    );

    const token =
      createSession(
        row.id
      );

    return {
      success: true,

      token,

      user:
        mapUser(row),
    };
  };

  const logout = (token) => {
    if (token) {
      sessions.delete(
        token
      );
    }

    return {
      success: true,
    };
  };

  const changePassword = (
    token,
    input = {}
  ) => {
    const { row } =
      requireSession(
        token
      );

    const currentPassword =
      String(
        input.currentPassword ||
          ""
      );

    const newPassword =
      String(
        input.newPassword ||
          ""
      );

    if (
      newPassword.length < 8
    ) {
      return {
        success: false,

        message:
          "Your new password must contain at least 8 characters.",
      };
    }

    if (
      !row.must_change_password
    ) {
      if (
        !currentPassword ||
        !verifyPassword(
          currentPassword,
          row.password_hash
        )
      ) {
        return {
          success: false,

          message:
            "Current password is incorrect.",
        };
      }
    }

    if (
      verifyPassword(
        newPassword,
        row.password_hash
      )
    ) {
      return {
        success: false,

        message:
          "Choose a different password.",
      };
    }

    db.prepare(`
      UPDATE app_users

      SET
        password_hash = ?,
        must_change_password = 0,
        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
    `).run(
      hashPassword(
        newPassword
      ),

      row.id
    );

    destroyUserSessions(
      row.id,
      token
    );

    return {
      success: true,

      user:
        publicUser(
          row.id
        ),
    };
  };

  const listUsers = (
    token
  ) => {
    const admin =
      authorize(
        token,
        "users.manage"
      );

    if (
      admin.role !==
      "admin"
    ) {
      throw new Error(
        "Administrator access required."
      );
    }

    return db
      .prepare(`
        SELECT *
        FROM app_users

        ORDER BY
          active DESC,
          name ASC
      `)
      .all()
      .map(mapUser);
  };

  const validateNewUser = (
    input = {}
  ) => {
    const name =
      text(input.name);

    const username =
      normalizeUsername(
        input.username
      );

    const password =
      String(
        input.password ||
          ""
      );

    const role =
      text(
        input.role
      ).toLowerCase();

    if (!name) {
      return {
        success: false,

        message:
          "User name is required.",
      };
    }

    if (
      username.length < 3
    ) {
      return {
        success: false,

        message:
          "Username must contain at least 3 characters.",
      };
    }

    if (
      !/^[a-z0-9._-]+$/.test(
        username
      )
    ) {
      return {
        success: false,

        message:
          "Username may only contain letters, numbers, dots, hyphens and underscores.",
      };
    }

    if (
      password.length < 8
    ) {
      return {
        success: false,

        message:
          "Password must contain at least 8 characters.",
      };
    }

    if (
      !VALID_ROLES.has(
        role
      )
    ) {
      return {
        success: false,

        message:
          "Select a valid user role.",
      };
    }

    return {
      success: true,

      user: {
        name,
        username,
        password,
        role,
      },
    };
  };

  const createUser = (
    token,
    input
  ) => {
    const admin =
      authorize(
        token,
        "users.manage"
      );

    if (
      admin.role !==
      "admin"
    ) {
      throw new Error(
        "Administrator access required."
      );
    }

    const validation =
      validateNewUser(
        input
      );

    if (
      !validation.success
    ) {
      return validation;
    }

    const user =
      validation.user;

    const duplicate =
      db.prepare(`
        SELECT id
        FROM app_users

        WHERE username = ?
          COLLATE NOCASE
      `).get(
        user.username
      );

    if (duplicate) {
      return {
        success: false,

        message:
          "That username is already in use.",
      };
    }

    const result =
      db.prepare(`
        INSERT INTO app_users (
          name,
          username,
          password_hash,
          role,
          active,
          must_change_password,
          created_at,
          updated_at
        )

        VALUES (
          ?,
          ?,
          ?,
          ?,
          1,
          1,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `).run(
        user.name,
        user.username,
        hashPassword(
          user.password
        ),
        user.role
      );

    return {
      success: true,

      user:
        publicUser(
          result.lastInsertRowid
        ),
    };
  };

  const activeAdminCount =
    () =>
      db.prepare(`
        SELECT COUNT(*) AS count

        FROM app_users

        WHERE role = 'admin'
          AND active = 1
      `).get().count;

  const updateUser = (
    token,
    id,
    input = {}
  ) => {
    const admin =
      authorize(
        token,
        "users.manage"
      );

    if (
      admin.role !==
      "admin"
    ) {
      throw new Error(
        "Administrator access required."
      );
    }

    const target =
      readUser(id);

    if (!target) {
      return {
        success: false,

        message:
          "User not found.",
      };
    }

    const name =
      text(
        input.name ??
        target.name
      );

    const username =
      normalizeUsername(
        input.username ??
        target.username
      );

    const role =
      text(
        input.role ??
        target.role
      ).toLowerCase();

    const active =
      input.active ===
      undefined
        ? Boolean(
            target.active
          )
        : Boolean(
            input.active
          );

    const newPassword =
      String(
        input.password || ""
      );

    if (!name) {
      return {
        success: false,

        message:
          "User name is required.",
      };
    }

    if (
      username.length < 3 ||
      !/^[a-z0-9._-]+$/.test(
        username
      )
    ) {
      return {
        success: false,

        message:
          "Enter a valid username.",
      };
    }

    if (
      !VALID_ROLES.has(
        role
      )
    ) {
      return {
        success: false,

        message:
          "Select a valid role.",
      };
    }

    const duplicate =
      db.prepare(`
        SELECT id
        FROM app_users

        WHERE username = ?
          COLLATE NOCASE
          AND id != ?
      `).get(
        username,
        id
      );

    if (duplicate) {
      return {
        success: false,

        message:
          "That username is already in use.",
      };
    }

    if (
      admin.id === target.id &&
      (
        role !== "admin" ||
        !active
      )
    ) {
      return {
        success: false,

        message:
          "You cannot remove your own administrator access.",
      };
    }

    if (
      target.role === "admin" &&
      target.active &&
      (
        role !== "admin" ||
        !active
      ) &&
      activeAdminCount() <= 1
    ) {
      return {
        success: false,

        message:
          "GlamStock must always have at least one active administrator.",
      };
    }

    let passwordHash =
      target.password_hash;

    let mustChange =
      target.must_change_password;

    if (newPassword) {
      if (
        newPassword.length < 8
      ) {
        return {
          success: false,

          message:
            "New passwords must contain at least 8 characters.",
        };
      }

      passwordHash =
        hashPassword(
          newPassword
        );

      mustChange = 1;
    }

    db.prepare(`
      UPDATE app_users

      SET
        name = ?,
        username = ?,
        password_hash = ?,
        role = ?,
        active = ?,
        must_change_password = ?,
        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
    `).run(
      name,
      username,
      passwordHash,
      role,
      active ? 1 : 0,
      mustChange ? 1 : 0,
      id
    );

    if (
      !active ||
      newPassword
    ) {
      destroyUserSessions(
        id
      );
    }

    return {
      success: true,

      user:
        publicUser(id),
    };
  };

  const removeUser = (
    token,
    id
  ) => {
    const admin =
      authorize(
        token,
        "users.manage"
      );

    if (
      admin.role !==
      "admin"
    ) {
      throw new Error(
        "Administrator access required."
      );
    }

    const target =
      readUser(id);

    if (!target) {
      return {
        success: false,

        message:
          "User not found.",
      };
    }

    if (
      admin.id ===
      target.id
    ) {
      return {
        success: false,

        message:
          "You cannot deactivate your own account.",
      };
    }

    if (
      target.role === "admin" &&
      target.active &&
      activeAdminCount() <= 1
    ) {
      return {
        success: false,

        message:
          "GlamStock must always have at least one active administrator.",
      };
    }

    db.prepare(`
      UPDATE app_users

      SET
        active = 0,
        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
    `).run(id);

    destroyUserSessions(id);

    return {
      success: true,
    };
  };

  return {
    getSetupStatus,
    createOwner,

    login,
    logout,

    authorize,

    changePassword,

    listUsers,
    createUser,
    updateUser,
    removeUser,

    close() {
      sessions.clear();

      if (db.open) {
        db.close();
      }
    },
  };
}

module.exports = {
  createAuthDatabase,
};