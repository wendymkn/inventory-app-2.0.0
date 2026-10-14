const {
  contextBridge,
  ipcRenderer,
} = require("electron");

let sessionToken = null;

function sendRendererError(
  payload
) {
  try {
    ipcRenderer.send(
      "diagnostics:renderer-error",
      payload
    );
  } catch {
    // Diagnostics must never break the renderer.
  }
}

window.addEventListener(
  "error",
  (event) => {
    sendRendererError({
      type:
        "window-error",

      message:
        event?.message ||
        "Renderer error",

      stack:
        event?.error
          ?.stack ||
        "",

      source:
        event?.filename ||
        "",

      line:
        event?.lineno ||
        null,

      column:
        event?.colno ||
        null,
    });
  }
);

window.addEventListener(
  "unhandledrejection",
  (event) => {
    const reason =
      event?.reason;

    sendRendererError({
      type:
        "unhandled-rejection",

      message:
        reason?.message ||
        String(
          reason ||
          "Unhandled renderer rejection"
        ),

      stack:
        reason?.stack ||
        "",
    });
  }
);

const secureInvoke = (
  channel,
  ...args
) =>
  ipcRenderer.invoke(
    channel,
    sessionToken,
    ...args
  );

const authApi =
  Object.freeze({
    setupStatus:
      () =>
        ipcRenderer.invoke(
          "auth:setup-status"
        ),

    createOwner:
      async (
        ownerData
      ) => {
        const result =
          await ipcRenderer.invoke(
            "auth:create-owner",
            ownerData
          );

        if (
          result?.success &&
          result?.token
        ) {
          sessionToken =
            result.token;
        }

        if (
          result &&
          typeof result ===
            "object"
        ) {
          const {
            token,
            ...safeResult
          } = result;

          return safeResult;
        }

        return result;
      },

    login:
      async (
        credentials
      ) => {
        const result =
          await ipcRenderer.invoke(
            "auth:login",
            credentials
          );

        if (
          result?.success &&
          result?.token
        ) {
          sessionToken =
            result.token;
        }

        if (
          result &&
          typeof result ===
            "object"
        ) {
          const {
            token,
            ...safeResult
          } = result;

          return safeResult;
        }

        return result;
      },

    logout:
      async () => {
        try {
          return await ipcRenderer
            .invoke(
              "auth:logout",
              sessionToken
            );
        } finally {
          sessionToken = null;
        }
      },

    changePassword:
      (data) =>
        secureInvoke(
          "auth:change-password",
          data
        ),

    users:
      Object.freeze({
        getAll: () =>
          secureInvoke(
            "auth:users:list"
          ),

        create:
          (userData) =>
            secureInvoke(
              "auth:users:create",
              userData
            ),

        update:
          (
            id,
            userData
          ) =>
            secureInvoke(
              "auth:users:update",
              id,
              userData
            ),

        remove:
          (id) =>
            secureInvoke(
              "auth:users:delete",
              id
            ),
      }),
  });

contextBridge.exposeInMainWorld(
  "glamstock",

  Object.freeze({
    license:
      Object.freeze({
        status: () =>
          ipcRenderer.invoke(
            "license:status"
          ),

        activate:
          (licenseText) =>
            ipcRenderer.invoke(
              "license:activate",
              licenseText
            ),
      }),

    auth: authApi,

    system:
      Object.freeze({
        ping: () =>
          ipcRenderer.invoke(
            "system:ping"
          ),
      }),

    database:
      Object.freeze({
        info: () =>
          ipcRenderer.invoke(
            "database:info"
          ),
      }),

    business:
      Object.freeze({
        get: () =>
          ipcRenderer.invoke(
            "business:get"
          ),

        update:
          (businessData) =>
            secureInvoke(
              "business:update",
              businessData
            ),
      }),

    products:
      Object.freeze({
        getAll: () =>
          ipcRenderer.invoke(
            "products:list"
          ),

        getPage:
          (options = {}) =>
            ipcRenderer.invoke(
              "products:list-page",
              options
            ),

        getSummary: () =>
          ipcRenderer.invoke(
            "products:summary"
          ),

        create:
          (productData) =>
            secureInvoke(
              "products:create",
              productData
            ),

        update:
          (
            id,
            productData
          ) =>
            secureInvoke(
              "products:update",
              id,
              productData
            ),

        remove:
          (id) =>
            secureInvoke(
              "products:delete",
              id
            ),

        importBatch:
          (products) =>
            secureInvoke(
              "products:import-batch",
              products
            ),

        importLegacy:
          (products) =>
            ipcRenderer.invoke(
              "products:import-legacy",
              products
            ),
      }),

    stock:
      Object.freeze({
        getAll: () =>
          ipcRenderer.invoke(
            "stock:list"
          ),

        in:
          (
            productId,
            quantity,
            metadata
          ) =>
            secureInvoke(
              "stock:in",
              productId,
              quantity,
              metadata
            ),

        out:
          (
            productId,
            quantity,
            metadata
          ) =>
            secureInvoke(
              "stock:out",
              productId,
              quantity,
              metadata
            ),
      }),

    transactions:
      Object.freeze({
        getAll: () =>
          ipcRenderer.invoke(
            "transactions:list"
          ),

        importLegacy:
          (transactions) =>
            ipcRenderer.invoke(
              "transactions:import-legacy",
              transactions
            ),
      }),

    sales:
      Object.freeze({
        checkout:
          (checkoutData) =>
            secureInvoke(
              "sales:checkout",
              checkoutData
            ),
      }),

    suppliers:
      Object.freeze({
        getAll: () =>
          ipcRenderer.invoke(
            "suppliers:list"
          ),

        create:
          (supplierData) =>
            secureInvoke(
              "suppliers:create",
              supplierData
            ),

        update:
          (
            id,
            supplierData
          ) =>
            secureInvoke(
              "suppliers:update",
              id,
              supplierData
            ),

        remove:
          (id) =>
            secureInvoke(
              "suppliers:delete",
              id
            ),

        importLegacy:
          (suppliers) =>
            ipcRenderer.invoke(
              "suppliers:import-legacy",
              suppliers
            ),
      }),

    customers:
      Object.freeze({
        getAll: () =>
          ipcRenderer.invoke(
            "customers:list"
          ),

        create:
          (customerData) =>
            secureInvoke(
              "customers:create",
              customerData
            ),

        update:
          (
            id,
            customerData
          ) =>
            secureInvoke(
              "customers:update",
              id,
              customerData
            ),

        remove:
          (id) =>
            secureInvoke(
              "customers:delete",
              id
            ),

        importLegacy:
          (customers) =>
            ipcRenderer.invoke(
              "customers:import-legacy",
              customers
            ),
      }),

    expenses:
      Object.freeze({
        getAll: () =>
          ipcRenderer.invoke(
            "expenses:list"
          ),

        create:
          (expenseData) =>
            secureInvoke(
              "expenses:create",
              expenseData
            ),

        update:
          (
            id,
            expenseData
          ) =>
            secureInvoke(
              "expenses:update",
              id,
              expenseData
            ),

        remove:
          (id) =>
            secureInvoke(
              "expenses:delete",
              id
            ),

        importLegacy:
          (expenses) =>
            ipcRenderer.invoke(
              "expenses:import-legacy",
              expenses
            ),
      }),


diagnostics:
  Object.freeze({
    summary: () =>
      secureInvoke(
        "diagnostics:summary"
      ),

    exportReport: () =>
      secureInvoke(
        "diagnostics:export"
      ),

    databaseHealth: () =>
      secureInvoke(
        "diagnostics:database-health"
      ),

    optimizeDatabase: () =>
      secureInvoke(
        "diagnostics:database-optimize"
      ),

    openLogs: () =>
      secureInvoke(
        "diagnostics:open-logs"
      ),

    logRenderer:
      (payload) => {
        sendRendererError(
          payload
        );

        return true;
      },
  }),

    backup:
      Object.freeze({
        info: () =>
          ipcRenderer.invoke(
            "backup:info"
          ),

        list: () =>
          secureInvoke(
            "backup:list"
          ),

        create: () =>
          secureInvoke(
            "backup:create"
          ),

        openFolder: () =>
          secureInvoke(
            "backup:open-folder"
          ),

        restoreSaved:
          (fileName) =>
            secureInvoke(
              "backup:restore-saved",
              fileName
            ),

        restoreExternal: () =>
          secureInvoke(
            "backup:restore-external"
          ),

        // Backward-compatible alias.
        restore: () =>
          secureInvoke(
            "backup:restore"
          ),
      }),
  })
);
