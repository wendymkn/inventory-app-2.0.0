import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CreditCard,
  Smartphone,
  Banknote,
  Package,
} from "lucide-react";

import useInventoryStore from "../store/inventoryStore";
import useSettingsStore from "../store/settingsStore";

function Reports() {
  const transactions = useInventoryStore(
    (state) => state.transactions
  );

  const products = useInventoryStore(
    (state) => state.products
  );

  const hasDesktopSummary =
    typeof window !== "undefined" &&
    Boolean(
      window.glamstock
        ?.products
        ?.getSummary
    );

  const [
    desktopInventoryCost,
    setDesktopInventoryCost,
  ] = useState(0);

  const currency = useSettingsStore(
    (state) => state.currency
  );

  const [period, setPeriod] =
    useState("month");

  useEffect(() => {
    if (!hasDesktopSummary) {
      return undefined;
    }

    let cancelled = false;

    const loadProductSummary =
      async () => {
        try {
          const summary =
            await window.glamstock
              .products
              .getSummary();

          if (!cancelled) {
            setDesktopInventoryCost(
              Number(
                summary?.inventoryValue ||
                  0
              )
            );
          }
        } catch (error) {
          console.error(
            "Could not load report inventory summary:",
            error
          );
        }
      };

    loadProductSummary();

    const handleFocus = () =>
      loadProductSummary();

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
  }, [hasDesktopSummary]);

  const formatMoney = (amount) =>
    `${currency} ${Number(
      amount || 0
    ).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const filteredTransactions =
    useMemo(() => {
      if (period === "all") {
        return transactions;
      }

      const now = new Date();
      let start = null;

      if (period === "today") {
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
      }

      if (period === "week") {
        start = new Date();
        start.setDate(
          start.getDate() - 7
        );
      }

      if (period === "month") {
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );
      }

      if (period === "year") {
        start = new Date(
          now.getFullYear(),
          0,
          1
        );
      }

      if (!start) {
        return transactions;
      }

      return transactions.filter(
        (transaction) =>
          new Date(transaction.date) >=
          start
      );
    }, [transactions, period]);

  const revenue =
    filteredTransactions.reduce(
      (sum, transaction) =>
        sum +
        Number(transaction.total || 0),
      0
    );

  const discount =
    filteredTransactions.reduce(
      (sum, transaction) =>
        sum +
        Number(
          transaction.discount || 0
        ),
      0
    );

  const paymentTotals =
    filteredTransactions.reduce(
      (totals, transaction) => {
        const method =
          transaction.paymentMethod ||
          "Other";

        totals[method] =
          (totals[method] || 0) +
          Number(
            transaction.total || 0
          );

        return totals;
      },
      {}
    );

  const productPerformance =
    filteredTransactions.reduce(
      (map, transaction) => {
        for (const item of
          transaction.items || []) {
          const current =
            map.get(item.productId) || {
              name: item.productName,
              quantity: 0,
              revenue: 0,
            };

          current.quantity +=
            Number(
              item.quantity || 0
            );

          current.revenue +=
            Number(item.total || 0);

          map.set(
            item.productId,
            current
          );
        }

        return map;
      },
      new Map()
    );

  const topProducts = Array.from(
    productPerformance.values()
  )
    .sort(
      (a, b) =>
        b.revenue - a.revenue
    )
    .slice(0, 8);

  const inventoryCost =
    hasDesktopSummary
      ? desktopInventoryCost
      : products.reduce(
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
        );

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            BUSINESS REPORTING
          </p>
          <h1>Reports</h1>
          <p>
            Sales, payment and product
            performance summaries.
          </p>
        </div>

        <div className="period-control">
          <label>Period</label>
          <select
            value={period}
            onChange={(event) =>
              setPeriod(
                event.target.value
              )
            }
          >
            <option value="today">
              Today
            </option>
            <option value="week">
              Last 7 Days
            </option>
            <option value="month">
              This Month
            </option>
            <option value="year">
              This Year
            </option>
            <option value="all">
              All Time
            </option>
          </select>
        </div>
      </div>

      <div className="stats-grid">
        <ReportMetric
          icon={BarChart3}
          label="Revenue"
          value={formatMoney(revenue)}
        />
        <ReportMetric
          icon={BarChart3}
          label="Transactions"
          value={
            filteredTransactions.length
          }
        />
        <ReportMetric
          icon={BarChart3}
          label="Discounts"
          value={formatMoney(discount)}
        />
        <ReportMetric
          icon={Package}
          label="Inventory Cost"
          value={formatMoney(
            inventoryCost
          )}
        />
      </div>

      <div className="report-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>
                Payment Breakdown
              </h2>
            </div>
          </div>

          <div className="metric-list">
            <PaymentRow
              icon={Banknote}
              label="Cash"
              value={formatMoney(
                paymentTotals.Cash || 0
              )}
            />
            <PaymentRow
              icon={Smartphone}
              label="M-Pesa"
              value={formatMoney(
                paymentTotals["M-Pesa"] ||
                  0
              )}
            />
            <PaymentRow
              icon={CreditCard}
              label="Card"
              value={formatMoney(
                paymentTotals.Card || 0
              )}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>
                Top Selling Products
              </h2>
            </div>
          </div>

          {topProducts.length === 0 ? (
            <div className="empty-state compact">
              <p>
                No sales data for this
                period.
              </p>
            </div>
          ) : (
            <div className="metric-list">
              {topProducts.map(
                (product) => (
                  <div
                    className="metric-row"
                    key={product.name}
                  >
                    <div>
                      <strong>
                        {product.name}
                      </strong>
                      <small>
                        {product.quantity}{" "}
                        sold
                      </small>
                    </div>
                    <strong>
                      {formatMoney(
                        product.revenue
                      )}
                    </strong>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportMetric({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={21} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function PaymentRow({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="metric-row">
      <div className="metric-row-label">
        <Icon size={18} />
        <strong>{label}</strong>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

export default Reports;
