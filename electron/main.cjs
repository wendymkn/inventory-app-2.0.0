const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  dialog,
  shell,
} = require("electron");

const os = require("os");
const fs = require("fs");

const path = require("path");

const {
  createDatabase,
} = require("./database.cjs");

const {
  createInventoryDatabase,
} = require("./inventoryDatabase.cjs");

const {
  createSalesDatabase,
} = require("./salesDatabase.cjs");

const {
  createContactsDatabase,
} = require("./contactsDatabase.cjs");

const {
  createExpensesDatabase,
} = require("./expensesDatabase.cjs");

const {
  createAuthDatabase,
} = require("./authDatabase.cjs");

const {
  createLicenseDatabase,
} = require("./licenseDatabase.cjs");

const {
  createBackupDatabase,
} = require("./backupDatabase.cjs");

const {
  createLogger,
} = require("./logging.cjs");

let mainWindow = null;

let databaseService = null;
let inventoryDatabaseService = null;
let salesDatabaseService = null;
let contactsDatabaseService = null;
let expensesDatabaseService = null;
let authDatabaseService = null;
let licenseDatabaseService = null;
let backupDatabaseService = null;
let logger = null;

function requireOperational() {
  return licenseDatabaseService
    .assertOperational();
}

function authorize(
  token,
  permission
) {
  return authDatabaseService
    .authorize(
      token,
      permission
    );
}

function requireAdmin(token) {
  const user =
    authorize(
      token,
      "admin"
    );

  if (
    user.role !== "admin"
  ) {
    throw new Error(
      "Administrator access required."
    );
  }

  return user;
}


function closeDatabaseServices() {
  const services = [
    licenseDatabaseService,
    authDatabaseService,
    expensesDatabaseService,
    contactsDatabaseService,
    salesDatabaseService,
    inventoryDatabaseService,
    databaseService,
  ];

  for (const service of services) {
    try {
      if (
        service &&
        typeof service.close ===
          "function"
      ) {
        service.close();
      }
    } catch (error) {
      console.error(
        "Database close error:",
        error
      );
    }
  }
}

function registerIpcHandlers() {
  // ==========================================
  // SYSTEM
  // ==========================================

  ipcMain.handle(
    "system:ping",

    async () => ({
      ok: true,
      appName: app.getName(),
      version: app.getVersion(),
      packaged: app.isPackaged,
    })
  );

  ipcMain.handle(
    "database:info",

    async () =>
      databaseService.getInfo()
  );

  // ==========================================
  // LICENSE
  // ==========================================

  ipcMain.handle(
    "license:status",

    async () =>
      licenseDatabaseService
        .getStatus()
  );

  ipcMain.handle(
    "license:activate",

    async (
      _event,
      licenseText
    ) =>
      licenseDatabaseService
        .activate(
          licenseText
        )
  );

  // ==========================================
  // AUTH
  // ==========================================

  ipcMain.handle(
  "auth:setup-status",

  async () =>
    authDatabaseService
      .getSetupStatus()
);

ipcMain.handle(
  "auth:create-owner",

  async (
    _event,
    ownerData
  ) => {
    requireOperational();

    return authDatabaseService
      .createOwner(
        ownerData
      );
  }
);
  ipcMain.handle(
    "auth:login",

    async (
      _event,
      credentials
    ) =>
      authDatabaseService
        .login(
          credentials
        )
  );

  ipcMain.handle(
    "auth:logout",

    async (
      _event,
      token
    ) =>
      authDatabaseService
        .logout(token)
  );

  ipcMain.handle(
    "auth:change-password",

    async (
      _event,
      token,
      data
    ) =>
      authDatabaseService
        .changePassword(
          token,
          data
        )
  );

  ipcMain.handle(
    "auth:users:list",

    async (
      _event,
      token
    ) =>
      authDatabaseService
        .listUsers(token)
  );

  ipcMain.handle(
    "auth:users:create",

    async (
      _event,
      token,
      userData
    ) => {
      requireOperational();

      return authDatabaseService
        .createUser(
          token,
          userData
        );
    }
  );

  ipcMain.handle(
    "auth:users:update",

    async (
      _event,
      token,
      id,
      userData
    ) => {
      requireOperational();

      return authDatabaseService
        .updateUser(
          token,
          id,
          userData
        );
    }
  );

  ipcMain.handle(
    "auth:users:delete",

    async (
      _event,
      token,
      id
    ) => {
      requireOperational();

      return authDatabaseService
        .removeUser(
          token,
          id
        );
    }
  );

  // ==========================================
  // BUSINESS
  // ==========================================

  ipcMain.handle(
    "business:get",

    async () =>
      databaseService
        .getBusiness()
  );

  ipcMain.handle(
    "business:update",

    async (
      _event,
      token,
      businessData
    ) => {
      requireOperational();
      requireAdmin(token);

      return databaseService
        .updateBusiness(
          businessData
        );
    }
  );

  // ==========================================
  // PRODUCTS
  // ==========================================

  ipcMain.handle(
    "products:list",

    async () =>
      inventoryDatabaseService
        .listProducts()
  );

  ipcMain.handle(
    "products:list-page",

    async (
      _event,
      options
    ) =>
      inventoryDatabaseService
        .listProductsPage(
          options
        )
  );

  ipcMain.handle(
    "products:summary",

    async () =>
      inventoryDatabaseService
        .getProductsSummary()
  );

  ipcMain.handle(
    "products:create",

    async (
      _event,
      token,
      productData
    ) => {
      requireOperational();
      requireAdmin(token);

      return inventoryDatabaseService
        .createProduct(
          productData
        );
    }
  );

  ipcMain.handle(
    "products:update",

    async (
      _event,
      token,
      id,
      productData
    ) => {
      requireOperational();
      requireAdmin(token);

      return inventoryDatabaseService
        .updateProduct(
          id,
          productData
        );
    }
  );

  ipcMain.handle(
    "products:delete",

    async (
      _event,
      token,
      id
    ) => {
      requireOperational();
      requireAdmin(token);

      return inventoryDatabaseService
        .removeProduct(id);
    }
  );

  ipcMain.handle(
    "products:import-batch",

    async (
      _event,
      token,
      products
    ) => {
      requireOperational();
      requireAdmin(token);

      return inventoryDatabaseService
        .importProductsBatch(
          products
        );
    }
  );

  ipcMain.handle(
    "products:import-legacy",

    async (
      _event,
      products
    ) =>
      inventoryDatabaseService
        .importLegacyProducts(
          products
        )
  );

  // ==========================================
  // STOCK
  // ==========================================

  ipcMain.handle(
    "stock:list",

    async () =>
      inventoryDatabaseService
        .listMovements()
  );

  ipcMain.handle(
    "stock:in",

    async (
      _event,
      token,
      productId,
      quantity,
      metadata
    ) => {
      requireOperational();

      const user =
        authorize(
          token,
          "stock.in"
        );

      return inventoryDatabaseService
        .stockIn(
          productId,
          quantity,
          {
            ...metadata,
            userName: user.name,
          }
        );
    }
  );

  ipcMain.handle(
    "stock:out",

    async (
      _event,
      token,
      productId,
      quantity,
      metadata
    ) => {
      requireOperational();

      const user =
        authorize(
          token,
          "stock.out"
        );

      return inventoryDatabaseService
        .stockOut(
          productId,
          quantity,
          {
            ...metadata,
            userName: user.name,
          }
        );
    }
  );

  // ==========================================
  // SALES
  // ==========================================

  ipcMain.handle(
    "transactions:list",

    async () =>
      salesDatabaseService
        .listTransactions()
  );

  ipcMain.handle(
    "transactions:import-legacy",

    async (
      _event,
      transactions
    ) =>
      salesDatabaseService
        .importLegacyTransactions(
          transactions
        )
  );

  ipcMain.handle(
    "sales:checkout",

    async (
      _event,
      token,
      checkoutData
    ) => {
      requireOperational();

      const user =
        authorize(
          token,
          "sales.checkout"
        );

      return salesDatabaseService
        .checkoutSale({
          ...checkoutData,

          cashierId: null,

          cashierName:
            user.name,
        });
    }
  );

  // ==========================================
  // SUPPLIERS
  // ==========================================

  ipcMain.handle(
    "suppliers:list",

    async () =>
      contactsDatabaseService
        .listSuppliers()
  );

  ipcMain.handle(
    "suppliers:create",

    async (
      _event,
      token,
      supplierData
    ) => {
      requireOperational();
      requireAdmin(token);

      return contactsDatabaseService
        .createSupplier(
          supplierData
        );
    }
  );

  ipcMain.handle(
    "suppliers:update",

    async (
      _event,
      token,
      id,
      supplierData
    ) => {
      requireOperational();
      requireAdmin(token);

      return contactsDatabaseService
        .updateSupplier(
          id,
          supplierData
        );
    }
  );

  ipcMain.handle(
    "suppliers:delete",

    async (
      _event,
      token,
      id
    ) => {
      requireOperational();
      requireAdmin(token);

      return contactsDatabaseService
        .removeSupplier(id);
    }
  );

  ipcMain.handle(
    "suppliers:import-legacy",

    async (
      _event,
      suppliers
    ) =>
      contactsDatabaseService
        .importLegacySuppliers(
          suppliers
        )
  );

  // ==========================================
  // CUSTOMERS
  // ==========================================

  ipcMain.handle(
    "customers:list",

    async () =>
      contactsDatabaseService
        .listCustomers()
  );

  ipcMain.handle(
    "customers:create",

    async (
      _event,
      token,
      customerData
    ) => {
      requireOperational();

      authorize(
        token,
        "customers.add"
      );

      return contactsDatabaseService
        .createCustomer(
          customerData
        );
    }
  );

  ipcMain.handle(
    "customers:update",

    async (
      _event,
      token,
      id,
      customerData
    ) => {
      requireOperational();
      requireAdmin(token);

      return contactsDatabaseService
        .updateCustomer(
          id,
          customerData
        );
    }
  );

  ipcMain.handle(
    "customers:delete",

    async (
      _event,
      token,
      id
    ) => {
      requireOperational();
      requireAdmin(token);

      return contactsDatabaseService
        .removeCustomer(id);
    }
  );

  ipcMain.handle(
    "customers:import-legacy",

    async (
      _event,
      customers
    ) =>
      contactsDatabaseService
        .importLegacyCustomers(
          customers
        )
  );

  // ==========================================
  // EXPENSES
  // ==========================================

  ipcMain.handle(
    "expenses:list",

    async () =>
      expensesDatabaseService
        .listExpenses()
  );

  ipcMain.handle(
    "expenses:create",

    async (
      _event,
      token,
      expenseData
    ) => {
      requireOperational();

      const user =
        requireAdmin(token);

      return expensesDatabaseService
        .createExpense({
          ...expenseData,

          userName:
            user.name,
        });
    }
  );

  ipcMain.handle(
    "expenses:update",

    async (
      _event,
      token,
      id,
      expenseData
    ) => {
      requireOperational();

      const user =
        requireAdmin(token);

      return expensesDatabaseService
        .updateExpense(
          id,
          {
            ...expenseData,

            userName:
              user.name,
          }
        );
    }
  );

  ipcMain.handle(
    "expenses:delete",

    async (
      _event,
      token,
      id
    ) => {
      requireOperational();
      requireAdmin(token);

      return expensesDatabaseService
        .removeExpense(id);
    }
  );

  ipcMain.handle(
    "expenses:import-legacy",

    async (
      _event,
      expenses
    ) =>
      expensesDatabaseService
        .importLegacyExpenses(
          expenses
        )
  );


// ==========================================
// SUPPORT / DIAGNOSTICS
// ==========================================

ipcMain.on(
  "diagnostics:renderer-error",

  (
    _event,
    payload
  ) => {
    logger?.renderer(
      payload
    );
  }
);

ipcMain.handle(
  "diagnostics:summary",

  async (
    _event,
    token
  ) => {
    requireAdmin(token);

    const databaseInfo =
      databaseService
        .getInfo();

    const databaseHealth =
      databaseService
        .healthCheck();

    const licenseStatus =
      licenseDatabaseService
        .getStatus();

    const backups =
      backupDatabaseService
        .listBackups();

    const logInfo =
      logger
        .getInfo();

    return {
      app: {
        name:
          app.getName(),

        version:
          app.getVersion(),

        packaged:
          app.isPackaged,
      },

      system: {
        os:
          `${os.type()} ${os.release()}`,

        arch:
          os.arch(),

        electron:
          process.versions
            .electron,

        node:
          process.versions
            .node,

        chrome:
          process.versions
            .chrome,
      },

      database: {
        path:
          databaseInfo
            ?.databasePath ||
          databaseInfo
            ?.path ||
          null,

        healthy:
          Boolean(
            databaseHealth
              ?.success
          ),

        integrity:
          databaseHealth
            ?.integrity ||
          "unknown",

        sizeBytes:
          Number(
            databaseHealth
              ?.sizeBytes ||
            0
          ),
      },

      license: {
        status:
          licenseStatus
            ?.status ||
          "unknown",

        operational:
          Boolean(
            licenseStatus
              ?.operational
          ),

        installationId:
          licenseStatus
            ?.installationId ||
          null,

        daysRemaining:
          licenseStatus
            ?.daysRemaining ??
          null,
      },

      backup: {
        count:
          backups.length,

        directory:
          backupDatabaseService
            .getInfo()
            .backupDirectory,
      },

      logs: {
        directory:
          logInfo
            .logDirectory,
      },

      recentErrors:
        logger
          .getRecentErrors(
            40
          ),
    };
  }
);

ipcMain.handle(
  "diagnostics:database-health",

  async (
    _event,
    token
  ) => {
    requireAdmin(token);

    return databaseService
      .healthCheck();
  }
);

ipcMain.handle(
  "diagnostics:database-optimize",

  async (
    _event,
    token
  ) => {
    requireOperational();
    requireAdmin(token);

    const result =
      databaseService
        .optimize();

    logger?.info(
      "Database optimization completed."
    );

    return result;
  }
);

ipcMain.handle(
  "diagnostics:open-logs",

  async (
    _event,
    token
  ) => {
    requireAdmin(token);

    const logInfo =
      logger
        .getInfo();

    const errorMessage =
      await shell.openPath(
        logInfo
          .logDirectory
      );

    return {
      success:
        !errorMessage,

      message:
        errorMessage ||
        "Log folder opened.",
    };
  }
);

ipcMain.handle(
  "diagnostics:export",

  async (
    _event,
    token
  ) => {
    const admin =
      requireAdmin(
        token
      );

    const databaseInfo =
      databaseService
        .getInfo();

    const licenseStatus =
      licenseDatabaseService
        .getStatus();

    const backups =
      backupDatabaseService
        .listBackups();

    const recentErrors =
      logger
        .getRecentErrors(
          120
        );

    const report = {
      generatedAt:
        new Date()
          .toISOString(),

      product:
        "GlamStock",

      app: {
        version:
          app.getVersion(),

        packaged:
          app.isPackaged,
      },

      system: {
        os:
          `${os.type()} ${os.release()}`,

        arch:
          os.arch(),

        electron:
          process.versions
            .electron,

        node:
          process.versions
            .node,

        chrome:
          process.versions
            .chrome,
      },

      admin: {
        role:
          admin.role,
      },

      database: {
        path:
          databaseInfo
            ?.databasePath ||
          databaseInfo
            ?.path ||
          null,
      },

      license: {
        status:
          licenseStatus
            ?.status ||
          "unknown",

        operational:
          Boolean(
            licenseStatus
              ?.operational
          ),

        installationId:
          licenseStatus
            ?.installationId ||
          null,

        daysRemaining:
          licenseStatus
            ?.daysRemaining ??
          null,

        expiresAt:
          licenseStatus
            ?.license
            ?.expiresAt ||
          null,
      },

      backup: {
        count:
          backups.length,

        newest:
          backups[0]
            ? {
                fileName:
                  backups[0]
                    .fileName,

                modifiedAt:
                  backups[0]
                    .modifiedAt,

                sizeBytes:
                  backups[0]
                    .sizeBytes,
              }
            : null,
      },

      recentErrors,
    };

    const defaultName =
      `GlamStock-Support-${
        new Date()
          .toISOString()
          .slice(
            0,
            10
          )
      }.json`;

    const result =
      await dialog
        .showSaveDialog(
          mainWindow,
          {
            title:
              "Export GlamStock Support Report",

            defaultPath:
              path.join(
                app.getPath(
                  "documents"
                ),
                defaultName
              ),

            filters: [
              {
                name:
                  "JSON Support Report",
                extensions: [
                  "json",
                ],
              },
            ],
          }
        );

    if (
      result.canceled ||
      !result.filePath
    ) {
      return {
        cancelled: true,
      };
    }

    fs.writeFileSync(
      result.filePath,
      JSON.stringify(
        report,
        null,
        2
      ),
      "utf8"
    );

    logger.info(
      "Support report exported.",
      {
        path:
          result.filePath,
      }
    );

    return {
      success: true,
      path:
        result.filePath,

      message:
        "Support report exported successfully.",
    };
  }
);

  // ==========================================
  // BACKUP / RESTORE
  // ==========================================

  ipcMain.handle(
    "backup:info",

    async () =>
      backupDatabaseService
        .getInfo()
  );

  ipcMain.handle(
    "backup:list",

    async (
      _event,
      token
    ) => {
      requireAdmin(token);

      return backupDatabaseService
        .listBackups();
    }
  );

  ipcMain.handle(
    "backup:create",

    async (
      _event,
      token
    ) => {
      requireAdmin(token);

      return backupDatabaseService
        .createAutomaticBackup();
    }
  );

  ipcMain.handle(
    "backup:open-folder",

    async (
      _event,
      token
    ) => {
      requireAdmin(token);

      const info =
        backupDatabaseService
          .getInfo();

      const errorMessage =
        await shell.openPath(
          info.backupDirectory
        );

      return {
        success:
          !errorMessage,

        message:
          errorMessage ||
          "Backup folder opened.",
      };
    }
  );

  const restoreFromPath =
    async (
      backupPath
    ) => {
      const verification =
        backupDatabaseService
          .verifyBackupFile(
            backupPath
          );

      if (
        !verification.valid
      ) {
        throw new Error(
          verification.message
        );
      }

      await backupDatabaseService
        .createEmergencyBackup();

      const preservedLicenseState =
        backupDatabaseService
          .captureLicenseState();

      closeDatabaseServices();

      backupDatabaseService
        .restoreBackup(
          backupPath,
          preservedLicenseState
        );

      app.relaunch();
      app.exit(0);

      return {
        success: true,
        message:
          "Backup restored successfully. GlamStock is restarting.",
      };
    };

  ipcMain.handle(
    "backup:restore-saved",

    async (
      _event,
      token,
      fileName
    ) => {
      requireOperational();
      requireAdmin(token);

      const backupPath =
        backupDatabaseService
          .resolveSavedBackup(
            fileName
          );

      return restoreFromPath(
        backupPath
      );
    }
  );

  ipcMain.handle(
    "backup:restore-external",

    async (
      _event,
      token
    ) => {
      requireOperational();
      requireAdmin(token);

      const result =
        await dialog
          .showOpenDialog(
            mainWindow,
            {
              title:
                "Restore External GlamStock Backup",

              properties: [
                "openFile",
              ],

              filters: [
                {
                  name:
                    "GlamStock Backup",
                  extensions: [
                    "db",
                    "sqlite",
                  ],
                },
              ],
            }
          );

      if (
        result.canceled ||
        !result.filePaths?.[0]
      ) {
        return {
          cancelled: true,
        };
      }

      return restoreFromPath(
        result.filePaths[0]
      );
    }
  );

  // Backward-compatible alias.
  ipcMain.handle(
    "backup:restore",

    async (
      _event,
      token
    ) => {
      requireOperational();
      requireAdmin(token);

      const result =
        await dialog
          .showOpenDialog(
            mainWindow,
            {
              title:
                "Restore GlamStock Backup",

              properties: [
                "openFile",
              ],

              filters: [
                {
                  name:
                    "GlamStock Backup",
                  extensions: [
                    "db",
                    "sqlite",
                  ],
                },
              ],
            }
          );

      if (
        result.canceled ||
        !result.filePaths?.[0]
      ) {
        return {
          cancelled: true,
        };
      }

      return restoreFromPath(
        result.filePaths[0]
      );
    }
  );
}

function createWindow() {
  mainWindow =
    new BrowserWindow({
      width: 1440,
      height: 900,

      minWidth: 1100,
      minHeight: 700,

      show: false,

      autoHideMenuBar: true,

      webPreferences: {
        preload:
          path.join(
            __dirname,
            "preload.cjs"
          ),

        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });

  Menu.setApplicationMenu(
    null
  );

  mainWindow.webContents.on(
    "render-process-gone",

    (
      _event,
      details
    ) => {
      logger?.error(
        "Renderer process exited unexpectedly.",
        details?.reason ||
          "unknown",

        {
          reason:
            details?.reason ||
            null,

          exitCode:
            details?.exitCode ??
            null,
        }
      );
    }
  );

  mainWindow.once(
    "ready-to-show",

    () => {
      mainWindow.show();
    }
  );

  mainWindow.webContents
    .setWindowOpenHandler(
      () => ({
        action: "deny",
      })
    );

  mainWindow.webContents.on(
    "will-navigate",

    (
      event,
      url
    ) => {
      const allowed =
        app.isPackaged
          ? url.startsWith(
              "file://"
            )
          : url.startsWith(
              "http://localhost:5173"
            );

      if (!allowed) {
        event.preventDefault();
      }
    }
  );

  if (app.isPackaged) {
    mainWindow.loadFile(
      path.join(
        __dirname,
        "..",
        "dist",
        "index.html"
      )
    );
  } else {
    mainWindow.loadURL(
      "http://localhost:5173"
    );

    mainWindow.webContents
      .openDevTools({
        mode: "detach",
      });
  }

  mainWindow.on(
    "closed",

    () => {
      mainWindow = null;
    }
  );
}

app.whenReady().then(
  async () => {
    const userDataPath =
      app.getPath(
        "userData"
      );

    logger =
      createLogger(
        userDataPath
      );

    logger.info(
      "GlamStock starting.",
      {
        version:
          app.getVersion(),

        packaged:
          app.isPackaged,
      }
    );

    process.on(
      "uncaughtException",
      (error) => {
        logger?.error(
          "Uncaught main-process exception.",
          error
        );
      }
    );

    process.on(
      "unhandledRejection",
      (reason) => {
        logger?.error(
          "Unhandled main-process rejection.",
          reason
        );
      }
    );

    databaseService =
      createDatabase(
        userDataPath
      );

    inventoryDatabaseService =
      createInventoryDatabase(
        userDataPath
      );

    salesDatabaseService =
      createSalesDatabase(
        userDataPath
      );

    contactsDatabaseService =
      createContactsDatabase(
        userDataPath
      );

    expensesDatabaseService =
      createExpensesDatabase(
        userDataPath
      );

    authDatabaseService =
      createAuthDatabase(
        userDataPath
      );

    licenseDatabaseService =
      createLicenseDatabase(
        userDataPath
      );

    backupDatabaseService =
      createBackupDatabase(
        userDataPath
      );

    try {
      const automaticBackup =
        await backupDatabaseService
          .createScheduledBackupIfDue({
            minimumHours: 24,
            keep: 30,
          });

      logger.info(
        automaticBackup?.skipped
          ? "Automatic backup not due."
          : "Automatic backup completed.",
        {
          skipped:
            Boolean(
              automaticBackup
                ?.skipped
            ),
        }
      );
    } catch (error) {
      logger?.error(
        "Automatic backup failed.",
        error
      );
    }

    registerIpcHandlers();

    createWindow();

    app.on(
      "activate",

      () => {
        if (
          BrowserWindow
            .getAllWindows()
            .length === 0
        ) {
          createWindow();
        }
      }
    );
  }
);

app.on(
  "window-all-closed",

  () => {
    if (
      process.platform !==
      "darwin"
    ) {
      app.quit();
    }
  }
);

app.on(
  "before-quit",

  () => {
    logger?.info(
      "GlamStock shutting down."
    );

    closeDatabaseServices();
  }
);
