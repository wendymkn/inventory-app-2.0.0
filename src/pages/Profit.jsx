import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  WalletCards,
  ShoppingCart,
  Percent,
} from "lucide-react";

import useInventoryStore from "../store/inventoryStore";
import useSettingsStore from "../store/settingsStore";

function Profit() {
  const transactions = useInventoryStore(
    (state) => state.transactions
  );

  const expenses = useInventoryStore(
    (state) => state.expenses
  );

  const sales = useInventoryStore(
    (state) => state.sales
  );

  const legacySales = useMemo(
    () =>
      sales.filter(
        (sale) => sale.source !== "pos"
      ),
    [sales]
  );

  const currency = useSettingsStore(
    (state) => state.currency
  );

  const [period, setPeriod] =
    useState("month");

  const formatMoney = (amount) =>
    `${currency} ${Number(
      amount || 0
    ).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const startDate = useMemo(() => {
    const now = new Date();

    if (period === "today") {
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
    }

    if (period === "week") {
      const date = new Date();
      date.setDate(
        date.getDate() - 7
      );
      return date;
    }

    if (period === "month") {
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );
    }

    if (period === "year") {
      return new Date(
        now.getFullYear(),
        0,
        1
      );
    }

    return null;
  }, [period]);

  const inPeriod = (dateValue) => {
    if (!startDate) return true;

    const date = new Date(dateValue);

    return (
      !Number.isNaN(
        date.getTime()
      ) && date >= startDate
    );
  };

  const filteredTransactions =
    transactions.filter(
      (transaction) =>
        inPeriod(transaction.date)
    );

  const filteredExpenses =
    expenses.filter((expense) =>
      inPeriod(
        expense.date ||
          expense.createdAt
      )
    );

  const filteredLegacy =
    legacySales.filter((sale) =>
      inPeriod(sale.date)
    );

  const posRevenue =
    filteredTransactions.reduce(
      (sum, transaction) =>
        sum +
        Number(transaction.total || 0),
      0
    );

  const posCost =
    filteredTransactions.reduce(
      (sum, transaction) => {
        if (
          transaction.costTotal !==
          undefined
        ) {
          return (
            sum +
            Number(
              transaction.costTotal ||
                0
            )
          );
        }

        return (
          sum +
          (transaction.items || []).reduce(
            (itemSum, item) =>
              itemSum +
              Number(
                item.costTotal ||
                  Number(
                    item.buyingPrice ||
                      0
                  ) *
                    Number(
                      item.quantity ||
                        0
                    )
              ),
            0
          )
        );
      },
      0
    );

  const legacyRevenue =
    filteredLegacy.reduce(
      (sum, sale) =>
        sum + Number(sale.total || 0),
      0
    );

  const legacyCost =
    filteredLegacy.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.costTotal ??
            Number(
              sale.buyingPrice || 0
            ) *
              Number(
                sale.quantity || 0
              )
        ),
      0
    );

  const revenue =
    posRevenue + legacyRevenue;

  const cogs =
    posCost + legacyCost;

  const grossProfit =
    revenue - cogs;

  const totalExpenses =
    filteredExpenses.reduce(
      (sum, expense) =>
        sum +
        Number(expense.amount || 0),
      0
    );

  const netProfit =
    grossProfit - totalExpenses;

  const margin =
    revenue > 0
      ? (netProfit / revenue) *
        100
      : 0;

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            FINANCIAL PERFORMANCE
          </p>
          <h1>Profit</h1>
          <p>
            Revenue after cost of goods
            and operating expenses.
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
        <Metric
          icon={ShoppingCart}
          label="Revenue"
          value={formatMoney(revenue)}
        />
        <Metric
          icon={WalletCards}
          label="COGS"
          value={formatMoney(cogs)}
        />
        <Metric
          icon={TrendingUp}
          label="Gross Profit"
          value={formatMoney(
            grossProfit
          )}
        />
        <Metric
          icon={WalletCards}
          label="Expenses"
          value={formatMoney(
            totalExpenses
          )}
        />
        <Metric
          icon={
            netProfit >= 0
              ? TrendingUp
              : TrendingDown
          }
          label="Net Profit"
          value={formatMoney(
            netProfit
          )}
        />
        <Metric
          icon={Percent}
          label="Net Margin"
          value={`${margin.toFixed(
            2
          )}%`}
        />
      </div>

      <div className="panel">
        <div className="financial-breakdown">
          <div>
            <span>Sales Revenue</span>
            <strong>
              {formatMoney(revenue)}
            </strong>
          </div>
          <div>
            <span>
              Cost of Goods Sold
            </span>
            <strong>
              - {formatMoney(cogs)}
            </strong>
          </div>
          <div>
            <span>Gross Profit</span>
            <strong>
              {formatMoney(
                grossProfit
              )}
            </strong>
          </div>
          <div>
            <span>
              Operating Expenses
            </span>
            <strong>
              -{" "}
              {formatMoney(
                totalExpenses
              )}
            </strong>
          </div>
          <div className="financial-total">
            <span>Net Profit</span>
            <strong>
              {formatMoney(
                netProfit
              )}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
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

export default Profit;
