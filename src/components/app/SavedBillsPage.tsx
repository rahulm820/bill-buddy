import { useState, Dispatch } from "react";
import { AppState, AppAction, formatCurrency } from "@/lib/store";
import { ConfirmDialog } from "./SharedComponents";

interface SavedBillsPageProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  showToast: (msg: string) => void;
}

export default function SavedBillsPage({ state, dispatch, showToast }: SavedBillsPageProps) {
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  const bills = state.bills.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (b.customer || "").toLowerCase().includes(q) || String(b.num).includes(q) || b.rows.some(r => (r.name || "").toLowerCase().includes(q));
  });

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
        {search && (
          <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer">✕</button>
        )}
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
        const total = b.rows.reduce((s, r) => s + (parseFloat(r.price) || 0) * (parseFloat(r.qty) || 0), 0);
        return (
          <div key={b.id} className="bg-card border border-border rounded-sm px-4 py-3.5 mx-4 mb-2 slide-in">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-head text-xl font-extrabold text-primary">{formatCurrency(total)}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-sm border border-success text-success bg-success/5 font-semibold">SAVED</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Bill #{b.num} · {b.rows.length} item{b.rows.length !== 1 ? "s" : ""}
                </div>
                {b.customer && <div className="text-[11px] text-muted-foreground">👤 {b.customer}</div>}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => showToast("🖨️ Print/PDF ready!")}
                  className="px-2.5 py-1 rounded-sm border border-border bg-surface2 text-foreground text-[11px] cursor-pointer hover:border-primary hover:text-primary transition-colors"
                >
                  🖨️
                </button>
                <button
                  onClick={() => setConfirm(b.id)}
                  className="px-2.5 py-1 rounded-sm border border-border bg-surface2 text-foreground text-[11px] cursor-pointer hover:border-destructive hover:text-destructive transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
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
          </div>
        );
      })}

      {confirm && (
        <ConfirmDialog
          title="Delete Bill?"
          sub="This action cannot be undone."
          onConfirm={() => { dispatch({ type: "DEL_BILL", id: confirm }); setConfirm(null); showToast("Deleted."); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
