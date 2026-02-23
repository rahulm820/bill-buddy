import { useState, Dispatch } from "react";
import { AppState, AppAction, QueueBill, formatCurrency, getBillTotal, getTotalPaid, getBalanceDue, genId } from "@/lib/store";
import { ConfirmDialog } from "./SharedComponents";
import PrintPreviewModal from "./PrintPreviewModal";
import PaymentModal from "./PaymentModal";

interface SavedBillsPageProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  showToast: (msg: string) => void;
  onSwitchTab?: (tab: string) => void;
}

const modeIcon: Record<string, string> = { cash: "💵", upi: "📱", card: "💳", credit: "📋" };

function PaymentHistory({ bill }: { bill: QueueBill }) {
  const payments = bill.payments || [];
  if (payments.length === 0) return null;

  return (
    <div className="mt-2.5 border-t border-dashed border-border pt-2.5 space-y-1">
      <div className="text-[9px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1">
        Payment History
      </div>
      {payments.map(p => (
        <div key={p.id} className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>{modeIcon[p.mode] || "💰"}</span>
            <span>{new Date(p.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
            {p.note && <span className="italic truncate max-w-[80px]">· {p.note}</span>}
          </div>
          <span className="text-success font-semibold font-mono">+{formatCurrency(p.amount)}</span>
        </div>
      ))}
    </div>
  );
}

export default function SavedBillsPage({ state, dispatch, showToast, onSwitchTab }: SavedBillsPageProps) {
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [printBillId, setPrintBillId] = useState<string | null>(null);
  const [addPaymentBillId, setAddPaymentBillId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const bills = state.bills.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (b.customer || "").toLowerCase().includes(q)
      || String(b.num).includes(q)
      || b.rows.some(r => (r.name || "").toLowerCase().includes(q));
  });

  const billToPrint     = printBillId     ? state.bills.find(b => b.id === printBillId)     : null;
  const billAddPayment  = addPaymentBillId ? state.bills.find(b => b.id === addPaymentBillId) : null;

  const handleAddPayment = (payment: import("@/lib/store").PaymentEntry) => {
    if (!addPaymentBillId) return;
    dispatch({ type: "ADD_PAYMENT", id: addPaymentBillId, payment });
    setAddPaymentBillId(null);
    const bill = state.bills.find(b => b.id === addPaymentBillId);
    if (!bill) return;
    const newDue = getBalanceDue(bill) - payment.amount;
    if (newDue <= 0.01) showToast("✅ Payment added! Bill fully cleared");
    else showToast(`✅ Payment added! ₹${newDue.toFixed(2)} still due`);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-[70px]">
      {/* Search */}
      <div className="flex items-center gap-2 mx-4 my-3 bg-card border border-border rounded-sm px-3 py-2 focus-within:border-primary transition-colors">
        <span className="text-muted-foreground">🔍</span>
        <input
          className="flex-1 bg-transparent border-none outline-none text-foreground font-mono text-[13px] placeholder:text-muted-foreground"
          placeholder="Search bills..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer">✕</button>}
      </div>

      <div className="px-4 pt-3.5 pb-2">
        <span className="font-head text-[11px] font-bold tracking-[2px] uppercase text-muted-foreground">
          Saved Bills ({bills.length})
        </span>
      </div>

      {bills.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-5xl mb-3 opacity-40">🧾</div>
          <div className="font-head text-base font-bold text-foreground mb-1.5">No saved bills</div>
          <div className="text-[11px]">Save bills from the Billing tab</div>
        </div>
      )}

      {[...bills].reverse().map(b => {
        const total      = getBillTotal(b);
        const totalPaid  = getTotalPaid(b);
        const due        = getBalanceDue(b);
        const isFullyPaid = due <= 0.01;
        const isDue       = due > 0.01;
        const isExpanded  = expandedId === b.id;

        return (
          <div key={b.id} className="bg-card border border-border rounded-sm px-4 py-3.5 mx-4 mb-2 slide-in">

            {/* Top row: amount + badges + actions */}
            <div className="flex justify-between items-start">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : b.id)}
              >
                {/* Amounts */}
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-head text-xl font-extrabold text-primary">{formatCurrency(total)}</span>
                  {isFullyPaid ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-sm border border-success text-success bg-success/5 font-semibold">
                      💚 PAID
                    </span>
                  ) : isDue ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-sm border border-destructive text-destructive bg-destructive/5 font-semibold">
                      🔴 DUE {formatCurrency(due)}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-sm border border-border text-muted-foreground font-semibold">
                      — UNPAID
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Bill #{b.num} · {b.rows.length} item{b.rows.length !== 1 ? "s" : ""}
                  {totalPaid > 0 && <span className="ml-1.5">· Paid {formatCurrency(totalPaid)}</span>}
                </div>
                {b.customer && <div className="text-[11px] text-muted-foreground">👤 {b.customer}</div>}

                {/* Expand hint */}
                <div className="text-[9px] text-muted-foreground/50 mt-0.5 font-mono">
                  {isExpanded ? "▲ collapse" : "▼ payment history"}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-1.5 items-end ml-2">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { dispatch({ type: "EDIT_BILL", id: b.id }); showToast("Bill moved to queue for editing!"); onSwitchTab?.("billing"); }}
                    className="px-2.5 py-1 rounded-sm border border-border bg-surface2 text-foreground text-[11px] cursor-pointer hover:border-primary hover:text-primary transition-colors"
                    title="Edit items"
                  >✏️</button>
                  <button
                    onClick={() => setPrintBillId(b.id)}
                    className="px-2.5 py-1 rounded-sm border border-border bg-surface2 text-foreground text-[11px] cursor-pointer hover:border-primary hover:text-primary transition-colors"
                    title="Print"
                  >🖨️</button>
                  <button
                    onClick={() => setConfirm(b.id)}
                    className="px-2.5 py-1 rounded-sm border border-border bg-surface2 text-foreground text-[11px] cursor-pointer hover:border-destructive hover:text-destructive transition-colors"
                    title="Delete"
                  >🗑️</button>
                </div>
                {/* Add Payment button — only when balance is due */}
                {isDue && (
                  <button
                    onClick={() => setAddPaymentBillId(b.id)}
                    className="px-2.5 py-1.5 rounded-sm border border-primary bg-primary/10 text-primary text-[10px] font-semibold font-mono cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap"
                  >
                    + Add Payment
                  </button>
                )}
              </div>
            </div>

            {/* Item chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {b.rows.slice(0, 3).map(r => (
                <span key={r.id} className="text-[10px] bg-surface2 border border-border rounded-sm px-2 py-0.5 text-muted-foreground">
                  {r.name || "Item"} × {r.qty} = {formatCurrency(parseFloat(r.price || "0") * parseFloat(r.qty || "0"))}
                </span>
              ))}
              {b.rows.length > 3 && (
                <span className="text-[10px] bg-surface2 border border-border rounded-sm px-2 py-0.5 text-muted-foreground">
                  +{b.rows.length - 3} more
                </span>
              )}
            </div>

            {/* Expanded: full payment history */}
            {isExpanded && <PaymentHistory bill={b} />}
          </div>
        );
      })}

      {/* Confirm delete */}
      {confirm && (
        <ConfirmDialog
          title="Delete Bill?"
          sub="This action cannot be undone."
          onConfirm={() => { dispatch({ type: "DEL_BILL", id: confirm }); setConfirm(null); showToast("Deleted."); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Print modal */}
      {billToPrint && (
        <PrintPreviewModal
          bill={billToPrint}
          user={state.user}
          onClose={() => setPrintBillId(null)}
          showToast={showToast}
        />
      )}

      {/* Add payment modal */}
      {billAddPayment && (
        <PaymentModal
          bill={billAddPayment}
          isAddPayment={true}
          onConfirm={handleAddPayment}
          onCancel={() => setAddPaymentBillId(null)}
        />
      )}
    </div>
  );
}