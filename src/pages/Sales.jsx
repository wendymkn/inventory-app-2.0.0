import { useDeferredValue, useMemo, useState } from "react";
import {
  ShoppingCart,
  Search,
} from "lucide-react";

import useInventoryStore from "../store/inventoryStore";
import useSettingsStore from "../store/settingsStore";

function Sales() {
  const transactions = useInventoryStore(
    (state) => state.transactions
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

  const [searchTerm, setSearchTerm] =
    useState("");

  const deferredSearchTerm =
    useDeferredValue(searchTerm);

  const formatMoney = (amount) =>
    `${currency} ${Number(
      amount || 0
    ).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const filteredTransactions =
    useMemo(() => {
      const search =
        deferredSearchTerm.trim().toLowerCase();

      return transactions.filter(
        (transaction) =>
          transaction.receiptNumber
            ?.toLowerCase()
            .includes(search) ||
          transaction.customerName
            ?.toLowerCase()
            .includes(search) ||
          transaction.cashierName
            ?.toLowerCase()
            .includes(search) ||
          transaction.paymentMethod
            ?.toLowerCase()
            .includes(search)
      );
    }, [transactions, deferredSearchTerm]);

  const revenue =
    transactions.reduce(
      (sum, transaction) =>
        sum +
        Number(transaction.total || 0),
      0
    ) +
    legacySales.reduce(
      (sum, sale) =>
        sum + Number(sale.total || 0),
      0
    );

  const averageOrder =
    transactions.length > 0
      ? transactions.reduce(
          (sum, transaction) =>
            sum +
            Number(
              transaction.total || 0
            ),
          0
        ) / transactions.length
      : 0;

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            SALES ACTIVITY
          </p>
          <h1>Sales</h1>
          <p>
            Review completed POS
            transactions.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <ShoppingCart size={21} />
          </div>
          <div>
            <span>Revenue</span>
            <strong>
              {formatMoney(revenue)}
            </strong>
            <small>
              Includes legacy sales
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ShoppingCart size={21} />
          </div>
          <div>
            <span>Transactions</span>
            <strong>
              {transactions.length}
            </strong>
            <small>
              POS receipts
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ShoppingCart size={21} />
          </div>
          <div>
            <span>Average Order</span>
            <strong>
              {formatMoney(
                averageOrder
              )}
            </strong>
            <small>
              POS average
            </small>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Transaction History</h2>
            <p>
              Search by receipt, customer,
              cashier or payment.
            </p>
          </div>

          <div className="search-box">
            <Search size={18} />
            <input
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search sales..."
            />
          </div>
        </div>

        {filteredTransactions.length ===
        0 ? (
          <div className="empty-state">
            <ShoppingCart size={36} />
            <h3>No sales found</h3>
            <p>
              Complete a POS sale or
              change your search.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Cashier</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.map(
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
                        {new Date(
                          transaction.date
                        ).toLocaleString()}
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
                        {
                          transaction.items
                            ?.length
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

export default Sales;
