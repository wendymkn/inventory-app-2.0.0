import {
  StrictMode,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import "./index.css";
import "./App.css";

import App from "./App.jsx";

import LicenseGate
  from "./components/LicenseGate.jsx";

import useInventoryStore
  from "./store/inventoryStore";

async function hydrateDesktopData() {
  if (
    typeof window ===
      "undefined" ||
    !window.glamstock
  ) {
    return;
  }

  try {
    const legacyState =
      useInventoryStore
        .getState();

    const legacyProducts =
      Array.isArray(
        legacyState.products
      )
        ? legacyState.products
        : [];

    const legacyTransactions =
      Array.isArray(
        legacyState.transactions
      )
        ? legacyState.transactions
        : [];

    const legacyCustomers =
      Array.isArray(
        legacyState.customers
      )
        ? legacyState.customers
        : [];

    const legacySuppliers =
      Array.isArray(
        legacyState.suppliers
      )
        ? legacyState.suppliers
        : [];

    const legacyExpenses =
      Array.isArray(
        legacyState.expenses
      )
        ? legacyState.expenses
        : [];

    // ======================================
    // SUPPLIERS
    // ======================================

    let suppliers =
      await window.glamstock
        .suppliers
        .getAll();

    if (
      suppliers.length === 0 &&
      legacySuppliers.length > 0
    ) {
      const result =
        await window.glamstock
          .suppliers
          .importLegacy(
            legacySuppliers
          );

      if (result?.success) {
        suppliers =
          result.suppliers ||
          [];
      }
    }

    // ======================================
    // CUSTOMERS
    // ======================================

    let customers =
      await window.glamstock
        .customers
        .getAll();

    if (
      customers.length === 0 &&
      legacyCustomers.length > 0
    ) {
      const result =
        await window.glamstock
          .customers
          .importLegacy(
            legacyCustomers
          );

      if (result?.success) {
        customers =
          result.customers ||
          [];
      }
    }

    // ======================================
    // PRODUCTS
    // ======================================

    /*
      IMPORTANT FOR LARGE CATALOGUES

      Do not hydrate the entire product table
      into Zustand on desktop. Products, POS,
      Stock In and Stock Out use SQLite-side
      search/pagination instead.

      We only check whether the SQLite table is
      empty so a one-time legacy migration can
      still happen.
    */

    const productProbe =
      await window.glamstock
        .products
        .getPage({
          page: 1,
          limit: 25,
        });

    if (
      Number(
        productProbe?.total || 0
      ) === 0 &&
      legacyProducts.length > 0
    ) {
      await window.glamstock
        .products
        .importLegacy(
          legacyProducts
        );
    }

    const products = [];

    // ======================================
    // TRANSACTIONS
    // ======================================

    let transactions =
      await window.glamstock
        .transactions
        .getAll();

    if (
      transactions.length === 0 &&
      legacyTransactions.length > 0
    ) {
      const result =
        await window.glamstock
          .transactions
          .importLegacy(
            legacyTransactions
          );

      if (result?.success) {
        transactions =
          result.transactions ||
          [];
      }
    }

    // ======================================
    // EXPENSES
    // ======================================

    let expenses =
      await window.glamstock
        .expenses
        .getAll();

    if (
      expenses.length === 0 &&
      legacyExpenses.length > 0
    ) {
      const result =
        await window.glamstock
          .expenses
          .importLegacy(
            legacyExpenses
          );

      if (result?.success) {
        expenses =
          result.expenses ||
          [];
      }
    }

    // ======================================
    // STOCK
    // ======================================

    const stockMovements =
      await window.glamstock
        .stock
        .getAll();

    useInventoryStore
      .setState({
        suppliers:
          Array.isArray(
            suppliers
          )
            ? suppliers
            : [],

        customers:
          Array.isArray(
            customers
          )
            ? customers
            : [],

        products:
          Array.isArray(
            products
          )
            ? products
            : [],

        transactions:
          Array.isArray(
            transactions
          )
            ? transactions
            : [],

        expenses:
          Array.isArray(
            expenses
          )
            ? expenses
            : [],

        stockMovements:
          Array.isArray(
            stockMovements
          )
            ? stockMovements
            : [],
      });
  } catch (error) {
    console.error(
      "Could not hydrate SQLite data:",
      error
    );
  }
}

async function startApp() {
  await hydrateDesktopData();

  createRoot(
    document.getElementById(
      "root"
    )
  ).render(
    <StrictMode>

      <LicenseGate>
        <App />
      </LicenseGate>

    </StrictMode>
  );
}

startApp();