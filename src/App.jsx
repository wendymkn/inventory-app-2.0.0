import { useState } from "react";

import Sidebar from "./components/Sidebar";
import LicenseBanner from "./components/LicenseBanner";
import AppErrorBoundary from "./components/AppErrorBoundary";

import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import StockIn from "./pages/StockIn";
import StockOut from "./pages/StockOut";
import Sales from "./pages/Sales";
import Receipts from "./pages/Receipts";
import Customers from "./pages/Customers";
import Expenses from "./pages/Expenses";
import Profit from "./pages/Profit";
import Suppliers from "./pages/Suppliers";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import BackupRestore from "./pages/BackupRestore";
import SupportDiagnostics from "./pages/SupportDiagnostics";
import License from "./pages/License";
import Login from "./pages/Login";

import useAuthStore from "./store/authStore";

const pagePermissions = {
  Dashboard: "view_dashboard",
  POS: "view_pos",
  Products: "view_products",
  "Stock In": "stock_in",
  "Stock Out": "stock_out",
  Sales: "view_sales",
  Receipts: "view_receipts",
  Customers: "view_customers",
  Expenses: "manage_expenses",
  Profit: "view_profit",
  Suppliers: "manage_suppliers",
  Reports: "view_reports",
  Users: "manage_users",
  Settings: "manage_settings",
  "Backup & Restore": "manage_settings",
  "Support & Diagnostics": "manage_settings",
  License: "manage_settings",
};

function App() {
  const currentUser = useAuthStore(
    (state) => state.currentUser
  );

  const logout = useAuthStore(
    (state) => state.logout
  );

  const hasPermission = useAuthStore(
    (state) => state.hasPermission
  );

  const [activePage, setActivePage] =
    useState("Dashboard");

  if (!currentUser) {
    return <Login />;
  }

  const handleLogout = async () => {
    await logout();
    setActivePage("Dashboard");
  };

  const renderPage = () => {
    const requiredPermission =
      pagePermissions[activePage];

    if (
      requiredPermission &&
      !hasPermission(requiredPermission)
    ) {
      return (
        <div className="page-shell">
          <div className="empty-state">
            <ShieldMessage />

            <h2>
              Access restricted
            </h2>

            <p>
              Your account does not have
              permission to open this module.
            </p>
          </div>
        </div>
      );
    }

    switch (activePage) {
      case "Dashboard":
        return <Dashboard />;

      case "POS":
        return <POS />;

      case "Products":
        return <Products />;

      case "Stock In":
        return <StockIn />;

      case "Stock Out":
        return <StockOut />;

      case "Sales":
        return <Sales />;

      case "Receipts":
        return <Receipts />;

      case "Customers":
        return <Customers />;

      case "Expenses":
        return <Expenses />;

      case "Profit":
        return <Profit />;

      case "Suppliers":
        return <Suppliers />;

      case "Reports":
        return <Reports />;

      case "Users":
        return <Users />;

      case "Settings":
        return <Settings />;

      case "Backup & Restore":
        return <BackupRestore />;

      case "Support & Diagnostics":
        return <SupportDiagnostics />;

      case "License":
        return <License />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <AppErrorBoundary>
      <div className="app-layout">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <LicenseBanner />
        {renderPage()}
      </main>
      </div>
    </AppErrorBoundary>
  );
}

function ShieldMessage() {
  return (
    <div className="empty-icon">
      !
    </div>
  );
}

export default App;
