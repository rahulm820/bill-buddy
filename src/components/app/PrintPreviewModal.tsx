import { useState } from "react";
import { QueueBill, AppUser, formatCurrency } from "@/lib/store";
import { printBill } from "@/lib/print";

interface PrintPreviewModalProps {
  bill: QueueBill;
  user: AppUser | null;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export default function PrintPreviewModal({ bill, user, onClose, showToast }: PrintPreviewModalProps) {
  const [showGST, setShowGST] = useState(false);
  const [gstRate, setGstRate] = useState("18");
  const [note, setNote] = useState("");

  const subtotal = bill.rows.reduce(
    (s, r) => s + (parseFloat(r.price) || 0) * (parseFloat(r.qty) || 0),
    0
  );
  const gstAmt = showGST ? (subtotal * parseFloat(gstRate || "0")) / 100 : 0;
  const total = subtotal + gstAmt;

  const handlePrint = () => {
    printBill({
      bill,
      user,
      showGST,
      gstRate: parseFloat(gstRate || "0"),
      note: note.trim(),
    });
    showToast("🖨️ Print dialog opened!");
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[300] flex items-end fade-in" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-t-lg w-full max-w-[430px] mx-auto max-h-[92vh] overflow-y-auto slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-border sticky top-0 bg-card z-[1]">
          <div>
            <h3 className="font-head text-base font-extrabold">🖨️ Print Bill #{bill.num}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Configure before printing</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer text-lg">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* ── Bill Summary Preview ── */}
          <div className="bg-surface2 border border-border rounded-sm p-4 font-mono text-[11px] space-y-1">
            {/* Shop name */}
            <div className="text-center font-head font-extrabold text-sm text-foreground uppercase tracking-wider mb-2">
              {user?.business_name || user?.name || "BillStock"}
            </div>
            {user?.phone && <div className="text-center text-muted-foreground text-[10px]">📞 {user.phone}</div>}

            <div className="border-t border-dashed border-border my-2" />

            <div className="flex justify-between text-muted-foreground">
              <span>Bill #</span><span className="text-foreground font-bold">#{bill.num}</span>
            </div>
            {bill.customer && (
              <div className="flex justify-between text-muted-foreground">
                <span>Customer</span><span className="text-foreground">{bill.customer}</span>
              </div>
            )}

            <div className="border-t border-dashed border-border my-2" />

            {/* Item rows */}
            {bill.rows.map(r => {
              const amt = (parseFloat(r.price) || 0) * (parseFloat(r.qty) || 0);
              return (
                <div key={r.id} className="flex justify-between">
                  <span className="text-muted-foreground truncate max-w-[140px]">
                    {r.name || "—"} × {r.qty}
                  </span>
                  <span className="text-foreground">{formatCurrency(amt)}</span>
                </div>
              );
            })}

            <div className="border-t border-dashed border-border my-2" />

            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span className="text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            {showGST && (
              <div className="flex justify-between text-muted-foreground">
                <span>GST ({gstRate}%)</span>
                <span className="text-foreground">{formatCurrency(gstAmt)}</span>
              </div>
            )}

            <div className="border-t border-border my-2" />

            <div className="flex justify-between font-head font-extrabold text-primary text-sm">
              <span>TOTAL</span><span>{formatCurrency(total)}</span>
            </div>

            {note && (
              <div className="mt-2 text-[10px] text-muted-foreground italic border-t border-dashed border-border pt-2">
                📝 {note}
              </div>
            )}

            <div className="text-center text-[10px] text-muted-foreground mt-3 pt-2 border-t border-dashed border-border">
              Thank You! Visit Again 🙏
            </div>
          </div>

          {/* ── GST Toggle ── */}
          <div className="bg-card border border-border rounded-sm p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground">Include GST</div>
                <div className="text-[10px] text-muted-foreground">Adds GST line to bill</div>
              </div>
              <button
                onClick={() => setShowGST(g => !g)}
                className={`relative w-10 h-5 rounded-full transition-colors ${showGST ? "bg-primary" : "bg-border"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showGST ? "translate-x-1" : "translate-x-0.5"}`} />
              </button>
            </div>

            {showGST && (
              <div>
                <label className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1.5 block">
                  GST Rate (%)
                </label>
                <div className="flex gap-2">
                  {["5", "12", "18", "28"].map(rate => (
                    <button
                      key={rate}
                      onClick={() => setGstRate(rate)}
                      className={`flex-1 py-1.5 rounded-sm text-xs font-mono border transition-colors ${
                        gstRate === rate
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-surface2 text-foreground border-border hover:border-primary"
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                  <input
                    type="number"
                    value={gstRate}
                    onChange={e => setGstRate(e.target.value)}
                    className="w-14 bg-surface2 border border-border rounded-sm px-2 py-1.5 text-foreground font-mono text-xs outline-none focus:border-primary transition-colors text-center"
                    placeholder="Custom"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Note ── */}
          <div>
            <label className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1.5 block">
              Note (optional)
            </label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Payment received, No returns..."
              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-foreground font-mono text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* ── Printer info ── */}
          <div className="bg-surface2 border border-border rounded-sm p-3 text-[11px] text-muted-foreground space-y-1.5">
            <div className="text-foreground font-semibold text-xs mb-1">🖨️ Printer Setup</div>
            <div>• <strong className="text-foreground">Thermal printer</strong> (80mm) — connect via USB/Bluetooth, set as default printer in OS, then tap Print below.</div>
            <div>• <strong className="text-foreground">Regular printer</strong> — just tap Print, select your printer in the dialog.</div>
            <div>• <strong className="text-foreground">Save as PDF</strong> — in print dialog, choose "Save as PDF".</div>
            <div>• <strong className="text-foreground">Mobile</strong> — on Android/iOS, share via Google Cloud Print or AirPrint.</div>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-2.5 pb-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-sm border border-border bg-surface2 text-foreground font-mono text-xs cursor-pointer hover:border-primary hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 rounded-sm bg-primary text-primary-foreground font-semibold text-xs cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
            >
              🖨️ Print Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}