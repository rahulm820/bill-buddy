import { useState, useRef, useEffect } from "react";
import { formatCurrency, PaymentEntry, QueueBill, getBillTotal, getTotalPaid, getBalanceDue, genId } from "@/lib/store";

interface PaymentModalProps {
  bill: QueueBill;
  /** If true, this is adding a payment to an already-saved bill */
  isAddPayment?: boolean;
  onConfirm: (payment: PaymentEntry) => void;
  onCancel: () => void;
}

const PAYMENT_MODES = [
  { id: "cash",   label: "Cash",   icon: "💵" },
  { id: "upi",    label: "UPI",    icon: "📱" },
  { id: "card",   label: "Card",   icon: "💳" },
  { id: "credit", label: "Credit", icon: "📋" },
];

function quickAmounts(due: number) {
  const rounded = [
    Math.ceil(due / 10) * 10,
    Math.ceil(due / 50) * 50,
    Math.ceil(due / 100) * 100,
  ].filter((v, i, arr) => v !== due && arr.indexOf(v) === i).slice(0, 2);
  return [due, ...rounded];
}

export default function PaymentModal({ bill, isAddPayment = false, onConfirm, onCancel }: PaymentModalProps) {
  const total      = getBillTotal(bill);
  const alreadyPaid = getTotalPaid(bill);
  const due        = isAddPayment ? getBalanceDue(bill) : total;

  const [amountStr, setAmountStr] = useState(Math.max(0, due).toFixed(2));
  const [mode, setMode] = useState("cash");
  const [note, setNote] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 120);
  }, []);

  const amountPaid  = parseFloat(amountStr) || 0;
  const newTotalPaid = alreadyPaid + (isAddPayment ? amountPaid : amountPaid);
  const balance      = isAddPayment
    ? amountPaid - due          // change for this payment
    : amountPaid - total;       // change on first save
  const stillDue     = total - (isAddPayment ? alreadyPaid + amountPaid : amountPaid);
  const isOverpaid   = balance > 0;
  const isExact      = Math.abs(balance) < 0.01;
  const isEmpty      = amountPaid <= 0;

  const handleConfirm = () => {
    if (isEmpty) return;
    onConfirm({
      id: genId(),
      amount: amountPaid,
      mode,
      paidAt: Date.now(),
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[400] flex items-end fade-in" onClick={onCancel}>
      <div className="bg-card border border-border rounded-t-lg w-full max-w-[430px] mx-auto max-h-[92vh] overflow-y-auto slide-up" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-head text-base font-extrabold">
              {isAddPayment ? "➕ Add Payment" : "💰 Collect Payment"}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Bill #{bill.num}</p>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer text-lg">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* ── Bill summary ── */}
          <div className="bg-surface2 border border-border rounded-sm px-4 py-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground font-mono">Bill Total</span>
              <span className="font-head text-lg font-extrabold text-foreground">{formatCurrency(total)}</span>
            </div>
            {isAddPayment && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-mono">Already Paid</span>
                  <span className="text-sm font-semibold text-success font-mono">{formatCurrency(alreadyPaid)}</span>
                </div>
                <div className="border-t border-dashed border-border pt-1.5 flex justify-between items-center">
                  <span className="text-xs font-semibold text-destructive font-mono">Balance Due</span>
                  <span className="font-head text-2xl font-extrabold text-destructive">{formatCurrency(Math.max(0, due))}</span>
                </div>
              </>
            )}
            {!isAddPayment && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-mono">Amount Due</span>
                <span className="font-head text-2xl font-extrabold text-primary">{formatCurrency(total)}</span>
              </div>
            )}
          </div>

          {/* ── Amount input ── */}
          <div>
            <label className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1.5 block">
              {isAddPayment ? "Amount Received Now" : "Amount Paid by Customer"}
            </label>
            <div className="flex items-center bg-background border border-border rounded-sm px-3 focus-within:border-primary transition-colors">
              <span className="text-primary font-head font-extrabold text-lg mr-1">₹</span>
              <input
                ref={inputRef}
                type="number"
                min="0"
                step="0.01"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleConfirm()}
                className="flex-1 bg-transparent border-none outline-none text-foreground font-mono text-xl py-3 font-bold"
                placeholder="0.00"
              />
              {Math.abs(amountPaid - due) > 0.01 && (
                <button
                  onClick={() => setAmountStr(Math.max(0, due).toFixed(2))}
                  className="text-[10px] text-muted-foreground hover:text-primary font-mono bg-transparent border-none cursor-pointer whitespace-nowrap"
                >
                  EXACT
                </button>
              )}
            </div>
          </div>

          {/* ── Quick amounts ── */}
          <div className="flex gap-2">
            {quickAmounts(Math.max(0, due)).map(amt => (
              <button
                key={amt}
                onClick={() => setAmountStr(amt.toFixed(2))}
                className={`flex-1 py-2 rounded-sm text-xs font-mono border transition-colors ${
                  Math.abs(amountPaid - amt) < 0.01
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface2 text-foreground border-border hover:border-primary hover:text-primary"
                }`}
              >
                {Math.abs(amt - due) < 0.01 ? "Exact" : formatCurrency(amt)}
              </button>
            ))}
          </div>

          {/* ── Change / remaining due ── */}
          {!isEmpty && (
            <div className={`rounded-sm px-4 py-3 border flex justify-between items-center transition-colors ${
              isOverpaid || isExact ? "bg-success/10 border-success/40" : "bg-orange-500/10 border-orange-500/40"
            }`}>
              <div>
                <div className={`text-xs font-semibold ${isOverpaid || isExact ? "text-success" : "text-orange-400"}`}>
                  {isOverpaid
                    ? "💚 Change to Return"
                    : isExact
                    ? "✅ Exact Amount"
                    : "⏳ Still Remaining"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                  {isOverpaid
                    ? `${formatCurrency(amountPaid)} − ${formatCurrency(due)}`
                    : !isExact
                    ? `After this: ₹${Math.max(0, stillDue).toFixed(2)} still due`
                    : "Fully cleared"}
                </div>
              </div>
              <div className={`font-head text-2xl font-extrabold ${isOverpaid || isExact ? "text-success" : "text-orange-400"}`}>
                {isExact ? "✓" : formatCurrency(Math.abs(isOverpaid ? balance : stillDue))}
              </div>
            </div>
          )}

          {/* ── Payment mode ── */}
          <div>
            <label className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1.5 block">Payment Mode</label>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-sm border text-[10px] font-mono transition-colors ${
                    mode === m.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-surface2 border-border text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  <span className="text-lg leading-none">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Optional note ── */}
          <div>
            <label className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1.5 block">Note (optional)</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Partial payment, UPI ref #..."
              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-foreground font-mono text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-2.5 pb-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-sm border border-border bg-surface2 text-foreground font-mono text-xs cursor-pointer hover:border-primary transition-colors"
            >Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={isEmpty}
              className="flex-1 py-2.5 rounded-sm bg-primary text-primary-foreground font-semibold text-xs cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExact || isOverpaid
                ? "✓ Fully Paid"
                : stillDue > 0.01
                ? "💾 Save Partial"
                : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}