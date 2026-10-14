import { useDeferredValue, useMemo, useState } from "react";
import {
  ReceiptText,
  Search,
  Printer,
  Eye,
  X,
} from "lucide-react";

import useInventoryStore from "../store/inventoryStore";
import useSettingsStore from "../store/settingsStore";

function Receipts() {
  const transactions = useInventoryStore(
    (state) => state.transactions
  );

  const currentBusiness =
    useSettingsStore(
      (state) => state.business
    );

  const currentCurrency =
    useSettingsStore(
      (state) => state.currency
    );

  const [searchTerm, setSearchTerm] =
    useState("");

  const deferredSearchTerm =
    useDeferredValue(searchTerm);

  const [
    selectedReceipt,
    setSelectedReceipt,
  ] = useState(null);

  const filtered = useMemo(() => {
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

  const currentFormatMoney = (
    amount
  ) =>
    `${currentCurrency} ${Number(
      amount || 0
    ).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const printTransaction = (
    transaction
  ) => {
    setSelectedReceipt(
      transaction
    );

    setTimeout(() => {
      window.print();
    }, 50);
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            RECEIPT ARCHIVE
          </p>
          <h1>Receipts</h1>
          <p>
            Find, view and reprint
            completed POS receipts.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Receipt History</h2>
            <p>
              {transactions.length} saved
              receipt
              {transactions.length === 1
                ? ""
                : "s"}
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
              placeholder="Search receipts..."
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <ReceiptText size={38} />
            <h3>No receipts found</h3>
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
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(
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
                          transaction.paymentMethod
                        }
                      </td>
                      <td className="money-cell">
                        {currentFormatMoney(
                          transaction.total
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() =>
                              setSelectedReceipt(
                                transaction
                              )
                            }
                            title="View"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            className="icon-button"
                            onClick={() =>
                              printTransaction(
                                transaction
                              )
                            }
                            title="Print"
                          >
                            <Printer
                              size={16}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedReceipt && (
        <ReceiptView
          receipt={selectedReceipt}
          fallbackBusiness={
            currentBusiness
          }
          fallbackCurrency={
            currentCurrency
          }
          onClose={() =>
            setSelectedReceipt(null)
          }
        />
      )}
    </div>
  );
}

function ReceiptView({
  receipt,
  fallbackBusiness,
  fallbackCurrency,
  onClose,
}) {
  const business =
    receipt.businessSnapshot ||
    fallbackBusiness ||
    {};

  const currency =
    receipt.currencySnapshot ||
    fallbackCurrency ||
    "KSh";

  const formatMoney = (amount) =>
    `${currency} ${Number(
      amount || 0
    ).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="receipt-overlay">
      <div className="receipt-modal">
        <div className="receipt-actions no-print">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            <X size={17} />
            Close
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              window.print()
            }
          >
            <Printer size={17} />
            Print
          </button>
        </div>

        <div className="receipt-print-area">
          <div className="receipt-header">
            <ReceiptText size={28} />
            <h2>
              {business.name ||
                "GlamStock Beauty Store"}
            </h2>
            {business.address && (
              <p>{business.address}</p>
            )}
            {business.phone && (
              <p>
                Tel: {business.phone}
              </p>
            )}
            {business.email && (
              <p>{business.email}</p>
            )}
            <p className="receipt-title">
              SALES RECEIPT
            </p>
          </div>

          <hr />

          <div className="receipt-info">
            <p>
              <strong>Receipt:</strong>{" "}
              {receipt.receiptNumber}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(
                receipt.date
              ).toLocaleString()}
            </p>
            <p>
              <strong>Cashier:</strong>{" "}
              {receipt.cashierName}
            </p>
            <p>
              <strong>Customer:</strong>{" "}
              {receipt.customerName}
            </p>
          </div>

          <hr />

          {(receipt.items || []).map(
            (item, index) => (
              <div
                className="receipt-item"
                key={`${item.productId}-${index}`}
              >
                <div>
                  <strong>
                    {item.productName}
                  </strong>
                  <p>
                    {item.quantity}{" "}
                    {item.unitType} ×{" "}
                    {formatMoney(
                      item.sellingPrice
                    )}
                  </p>
                </div>

                <strong>
                  {formatMoney(
                    item.total
                  )}
                </strong>
              </div>
            )
          )}

          <hr />

          <div className="receipt-total-row">
            <span>Subtotal</span>
            <strong>
              {formatMoney(
                receipt.subtotal
              )}
            </strong>
          </div>

          {Number(
            receipt.discount || 0
          ) > 0 && (
            <div className="receipt-total-row">
              <span>Discount</span>
              <strong>
                -{" "}
                {formatMoney(
                  receipt.discount
                )}
              </strong>
            </div>
          )}

          <div className="receipt-total-row receipt-grand-total">
            <span>TOTAL</span>
            <strong>
              {formatMoney(
                receipt.total
              )}
            </strong>
          </div>

          <hr />

          <div className="receipt-total-row">
            <span>Payment</span>
            <strong>
              {receipt.paymentMethod}
            </strong>
          </div>

          {receipt.paymentReference && (
            <div className="receipt-total-row">
              <span>Reference</span>
              <strong>
                {
                  receipt.paymentReference
                }
              </strong>
            </div>
          )}

          <div className="receipt-total-row">
            <span>Amount Paid</span>
            <strong>
              {formatMoney(
                receipt.amountPaid
              )}
            </strong>
          </div>

          {receipt.paymentMethod ===
            "Cash" && (
            <div className="receipt-total-row">
              <span>Change</span>
              <strong>
                {formatMoney(
                  receipt.change
                )}
              </strong>
            </div>
          )}

          <hr />

          <div className="receipt-footer">
            <p>
              {business.receiptFooter ||
                "Thank you for shopping with us!"}
            </p>
            <small>
              Powered by GlamStock
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Receipts;
