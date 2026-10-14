import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Package,
  ShoppingCart,
  WalletCards,
  TriangleAlert,
  ReceiptText,
  Boxes,
} from "lucide-react";

import useInventoryStore from "../store/inventoryStore";
import useSettingsStore from "../store/settingsStore";

const EMPTY_SUMMARY = {
  productCount: 0,
  inventoryValue: 0,
  lowStockCount: 0,
  inStockCount: 0,
};

function Dashboard() {
  const products = useInventoryStore(
    (state) => state.products
  );

  const transactions = useInventoryStore(
    (state) => state.transactions
  );

  const expenses = useInventoryStore(
    (state) => state.expenses
  );

  const currency = useSettingsStore(
    (state) => state.currency
  );

  const lowStockAlerts = useSettingsStore(
    (state) => state.lowStockAlerts
  );

  const sales = useInventoryStore(
    (state) => state.sales
  );

  const hasDesktopSummary =
    typeof window !== "undefined" &&
    Boolean(
      window.glamstock
        ?.products
        ?.getSummary
    );

  const localProductSummary =
    useMemo(() => {
      const activeProducts =
        Array.isArray(products)
          ? products
          : [];

      return {
        productCount:
          activeProducts.length,

        inventoryValue:
          activeProducts.reduce(
            (sum, product) =>
              sum +
              Number(
                product.stock || 0
              ) *
                Number(
                  product.buyingPrice ??
                    product.buying_price ??
                    0
                ),
            0
          ),

        lowStockCount:
          activeProducts.filter(
            (product) =>
              Number(
                product.stock || 0
              ) <=
              Number(
                product.lowStockLevel ??
                  product.low_stock_level ??
                  0
              )
          ).length,

        inStockCount:
          activeProducts.filter(
            (product) =>
              Number(
                product.stock || 0
              ) > 0
          ).length,
      };
    }, [products]);

  const [
    productSummary,
    setProductSummary,
  ] = useState(
    hasDesktopSummary
      ? EMPTY_SUMMARY
      : localProductSummary
  );

  useEffect(() => {
    if (!hasDesktopSummary) {
      setProductSummary(
        localProductSummary
      );
      return undefined;
    }

    let cancelled = false;

    const loadSummary =
      async () => {
        try {
          const summary =
            await window.glamstock
              .products
              .getSummary();

          if (!cancelled) {
            setProductSummary({
              ...EMPTY_SUMMARY,
              ...summary,
            });
          }
        } catch (error) {
          console.error(
            "Could not load dashboard product summary:",
            error
          );
        }
      };

    loadSummary();

    const handleFocus = () =>
      loadSummary();

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [
    hasDesktopSummary,
    localProductSummary,
  ]);

  const legacySales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          sale.source !== "pos"
      ),
    [sales]
  );

  const formatMoney = (amount) =>
    `${currency} ${Number(
      amount || 0
    ).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const transactionRevenue =
    transactions.reduce(
      (sum, transaction) =>
        sum +
        Number(
          transaction.total || 0
        ),
      0
    );

  const legacyRevenue =
    legacySales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.total || 0
        ),
      0
    );

  const revenue =
    transactionRevenue +
    legacyRevenue;

  const totalExpenses =
    expenses.reduce(
      (sum, expense) =>
        sum +
        Number(
          expense.amount || 0
        ),
      0
    );

  const recentTransactions =
    transactions.slice(0, 5);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            BUSINESS OVERVIEW
          </p>

          <h1>Dashboard</h1>

          <p>
            A focused view of sales,
            stock and business activity.
          </p>
        </div>

        <div className="page-header-chip">
          <Boxes size={16} />
          <span>
            {Number(
              productSummary.inStockCount ||
                0
            ).toLocaleString()}
            {" "}
            stocked items
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={Package}
          label="Products"
          value={Number(
            productSummary.productCount ||
              0
          ).toLocaleString()}
          note="Active catalogue"
        />

        <StatCard
          icon={ShoppingCart}
          label="Revenue"
          value={formatMoney(revenue)}
          note={`${transactions.length.toLocaleString()} POS transactions`}
        />

        <StatCard
          icon={WalletCards}
          label="Inventory Cost"
          value={formatMoney(
            productSummary.inventoryValue
          )}
          note="Current buying-value estimate"
        />

        <StatCard
          icon={ReceiptText}
          label="Expenses"
          value={formatMoney(
            totalExpenses
          )}
          note="Recorded operating costs"
        />
      </div>

      {lowStockAlerts &&
        Number(
          productSummary.lowStockCount ||
            0
        ) > 0 && (
          <div className="alert-card warning">
            <TriangleAlert size={22} />

            <div>
              <strong>
                {Number(
                  productSummary.lowStockCount
                ).toLocaleString()}
                {" "}
                low-stock product
                {Number(
                  productSummary.lowStockCount
                ) === 1
                  ? ""
                  : "s"}
              </strong>

              <p>
                Restock before these
                items run out.
              </p>
            </div>
          </div>
        )}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent Sales</h2>
            <p>
              Latest completed POS
              transactions.
            </p>
          </div>

          <span className="panel-meta">
            Last 5 receipts
          </span>
        </div>

        {recentTransactions.length ===
        0 ? (
          <div className="empty-state">
            <ShoppingCart size={34} />
            <h3>No sales yet</h3>
            <p>
              Complete a POS sale to
              see activity here.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Customer</th>
                  <th>Cashier</th>
                  <th>Payment</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {recentTransactions.map(
                  (transaction) => (
                    <tr
                      key={
                        transaction.id
                      }
                    >
                      <td>
                        <strong>
                          {
                            transaction.receiptNumber
                          }
                        </strong>
                      </td>

                      <td>
                        {
                          transaction.customerName
                        }
                      </td>

                      <td>
                        {
                          transaction.cashierName
                        }
                      </td>

                      <td>
                        <span className="status-badge neutral">
                          {
                            transaction.paymentMethod
                          }
                        </span>
                      </td>

                      <td className="money-cell">
                        {formatMoney(
                          transaction.total
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={21} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </div>
  );
}

export default Dashboard;
