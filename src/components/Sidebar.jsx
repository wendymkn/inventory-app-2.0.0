import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  Users,
  ContactRound,
  BarChart3,
  Settings,
  UserCog,
  LogOut,
  ShieldCheck,
  UserRound,
  Store,
  ReceiptText,
  WalletCards,
  BadgeDollarSign,
  Building2,
  KeyRound,
  DatabaseBackup,
  LifeBuoy,
  WifiOff,
} from "lucide-react";

import useSettingsStore from "../store/settingsStore";

const sections = [
  {
    label: "OVERVIEW",
    items: [
      {
        name: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "POS",
        icon: Store,
      },
    ],
  },
  {
    label: "INVENTORY",
    items: [
      {
        name: "Products",
        icon: Package,
      },
      {
        name: "Stock In",
        icon: ArrowDownToLine,
      },
      {
        name: "Stock Out",
        icon: ArrowUpFromLine,
      },
    ],
  },
  {
    label: "SALES & CRM",
    items: [
      {
        name: "Sales",
        icon: ShoppingCart,
      },
      {
        name: "Receipts",
        icon: ReceiptText,
      },
      {
        name: "Customers",
        icon: ContactRound,
      },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      {
        name: "Expenses",
        icon: WalletCards,
        adminOnly: true,
      },
      {
        name: "Profit",
        icon: BadgeDollarSign,
        adminOnly: true,
      },
      {
        name: "Suppliers",
        icon: Users,
        adminOnly: true,
      },
      {
        name: "Reports",
        icon: BarChart3,
        adminOnly: true,
      },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      {
        name: "Users",
        icon: UserCog,
        adminOnly: true,
      },
      {
        name: "Settings",
        icon: Settings,
        adminOnly: true,
      },
      {
        name: "Backup & Restore",
        icon: DatabaseBackup,
        adminOnly: true,
      },
      {
        name: "Support & Diagnostics",
        icon: LifeBuoy,
        adminOnly: true,
      },
      {
        name: "License",
        icon: KeyRound,
        adminOnly: true,
      },
    ],
  },
];

function Sidebar({
  activePage,
  setActivePage,
  currentUser,
  onLogout,
}) {
  const business =
    useSettingsStore(
      (state) =>
        state.business
    );

  const isAdmin =
    currentUser?.role ===
    "admin";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-business-logo">
          {business?.logo ? (
            <img
              src={business.logo}
              alt={
                business.name ||
                "Business"
              }
            />
          ) : (
            <Building2
              size={23}
            />
          )}
        </div>

        <div className="sidebar-brand-text">
          <h2>
            {business?.name ||
              "GlamStock"}
          </h2>

          <span>
            {business?.tagline ||
              "Powered by GlamStock"}
          </span>
        </div>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {isAdmin ? (
            <ShieldCheck
              size={19}
            />
          ) : (
            <UserRound
              size={19}
            />
          )}
        </div>

        <div className="sidebar-user-info">
          <strong>
            {currentUser?.name ||
              currentUser?.username}
          </strong>

          <span>
            {isAdmin
              ? "Administrator"
              : "Worker"}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map(
          (section) => {
            const visibleItems =
              section.items.filter(
                (item) =>
                  !item.adminOnly ||
                  isAdmin
              );

            if (
              visibleItems.length ===
              0
            ) {
              return null;
            }

            return (
              <div
                className="sidebar-section"
                key={
                  section.label
                }
              >
                <div className="sidebar-section-title">
                  {
                    section.label
                  }
                </div>

                <div className="sidebar-section-items">
                  {visibleItems.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      const active =
                        activePage ===
                        item.name;

                      return (
                        <button
                          type="button"
                          key={
                            item.name
                          }
                          className={
                            active
                              ? "nav-item active"
                              : "nav-item"
                          }
                          onClick={() =>
                            setActivePage(
                              item.name
                            )
                          }
                        >
                          <span className="nav-icon">
                            <Icon
                              size={18}
                            />
                          </span>

                          <span className="nav-label">
                            {
                              item.name
                            }
                          </span>

                          {active && (
                            <span className="nav-active-dot" />
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            );
          }
        )}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-offline-card">
          <WifiOff size={16} />

          <div>
            <strong>
              Offline ready
            </strong>

            <span>
              Data stays on this PC
            </span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-logout"
          onClick={onLogout}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>

        <div className="sidebar-footer">
          <strong>
            GlamStock
          </strong>

          <span>
            Retail Inventory & POS
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
