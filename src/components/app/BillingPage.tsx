import { useState, useRef, useEffect, Dispatch, useCallback } from "react";
import { AppState, AppAction, Entity, genId, formatCurrency, BillRow } from "@/lib/store";
import PrintPreviewModal from "./PrintPreviewModal";
import PaymentModal from "./PaymentModal";

// ─── Swipeable Row ────────────────────────────────────────────────────────────

interface SwipeableRowProps {
  onDelete: () => void;
  children: React.ReactNode;
}

function SwipeableRow({ onDelete, children }: SwipeableRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isLockedRef = useRef(false); // locked to horizontal swipe
  const animFrameRef = useRef<number | null>(null);

  const THRESHOLD = 80;      // px to trigger delete
  const MAX_SWIPE = 120;     // max drag distance shown
  const LOCK_ANGLE = 30;     // degrees within which we lock to horizontal

  const applyTransform = useCallback((x: number, ratio: number) => {
    const el = rowRef.current;
    if (!el) return;
    el.style.transform = `translateX(${x}px)`;
    // Reveal behind: opacity of red bg
    const bg = el.parentElement?.querySelector(".swipe-bg") as HTMLElement | null;
    if (bg) {
      bg.style.opacity = String(Math.min(ratio, 1));
      bg.style.transform = `scaleX(${0.8 + 0.2 * Math.min(ratio, 1)})`;
    }
  }, []);

  const reset = useCallback((animate = true) => {
    const el = rowRef.current;
    if (!el) return;
    if (animate) el.style.transition = "transform 0.25s cubic-bezier(0.25,1,0.5,1)";
    applyTransform(0, 0);
    setTimeout(() => { if (el) el.style.transition = ""; }, 260);
  }, [applyTransform]);

  const triggerDelete = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    el.style.transition = "transform 0.2s ease-in, opacity 0.2s ease-in";
    el.style.transform = `translateX(${MAX_SWIPE + 40}px)`;
    el.style.opacity = "0";
    setTimeout(onDelete, 200);
  }, [onDelete, MAX_SWIPE]);

  // ── Pointer events (works for touch + mouse) ──
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    currentXRef.current = 0;
    isDraggingRef.current = true;
    isLockedRef.current = false;
    const el = rowRef.current;
    if (el) { el.style.transition = ""; el.setPointerCapture(e.pointerId); }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || startXRef.current === null || startYRef.current === null) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    // Determine lock direction once we've moved enough
    if (!isLockedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      const angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
      // Only lock horizontal if mostly sideways
      if (angle < LOCK_ANGLE || angle > 180 - LOCK_ANGLE) {
        isLockedRef.current = true;
      } else {
        // Vertical scroll — cancel
        isDraggingRef.current = false;
        reset(true);
        return;
      }
    }

    if (!isLockedRef.current) return;

    // Only allow right swipe (positive dx)
    const clampedX = Math.max(0, Math.min(dx, MAX_SWIPE));
    currentXRef.current = clampedX;

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      applyTransform(clampedX, clampedX / THRESHOLD);
    });

    // Prevent scroll when swiping
    if (isLockedRef.current) e.preventDefault();
  }, [applyTransform, reset, THRESHOLD, MAX_SWIPE, LOCK_ANGLE]);

  const onPointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    isLockedRef.current = false;

    if (currentXRef.current >= THRESHOLD) {
      triggerDelete();
    } else {
      reset(true);
    }
  }, [triggerDelete, reset, THRESHOLD]);

  const onPointerCancel = useCallback(() => {
    isDraggingRef.current = false;
    isLockedRef.current = false;
    reset(true);
  }, [reset]);

  return (
    <div className="relative overflow-hidden">
      {/* Red delete background revealed on swipe */}
      <div
        className="swipe-bg absolute inset-0 flex items-center pl-4 bg-destructive/90 opacity-0 origin-left"
        style={{ transition: "opacity 0.1s, transform 0.1s" }}
        aria-hidden="true"
      >
        <div className="flex items-center gap-1.5 text-white">
          <span className="text-base">🗑️</span>
          <span className="text-[11px] font-semibold font-mono tracking-wider">DELETE</span>
        </div>
      </div>

      {/* The actual row — dragged on top */}
      <div
        ref={rowRef}
        className="relative z-10 bg-background touch-pan-y"
        style={{ willChange: "transform" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Autocomplete Input ───────────────────────────────────────────────────────

interface AutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  items: Entity[];
  onSelectItem: (name: string, price: string) => void;
  placeholder?: string;
}

function AutocompleteInput({ value, onChange, items, onSelectItem, placeholder }: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = value.trim().length > 0
    ? items.filter(item => {
        const nameField = item.fields.find(f => f.label.toLowerCase().includes("item name") || f.label.toLowerCase().includes("name"));
        return nameField?.value.toLowerCase().includes(value.toLowerCase());
      }).slice(0, 6)
    : [];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectSuggestion = (item: Entity) => {
    const nameField = item.fields.find(f => f.label.toLowerCase().includes("item name") || f.label.toLowerCase().includes("name"));
    const rateField = item.fields.find(f =>
      f.label.toLowerCase().includes("net rate") || f.label.toLowerCase().includes("rate") || f.label.toLowerCase().includes("price")
    );
    onSelectItem(nameField?.value || "", rateField?.value || "");
    setOpen(false);
    setHighlighted(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter" && suggestions[highlighted]) { e.preventDefault(); selectSuggestion(suggestions[highlighted]); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full bg-surface2 border border-border rounded-sm px-2 py-[7px] text-foreground font-mono text-xs outline-none focus:border-primary transition-colors"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-card border border-primary rounded-sm z-[150] max-h-[180px] overflow-y-auto shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          {suggestions.map((item, idx) => {
            const nameField = item.fields.find(f => f.label.toLowerCase().includes("item name") || f.label.toLowerCase().includes("name"));
            const rateField = item.fields.find(f =>
              f.label.toLowerCase().includes("net rate") || f.label.toLowerCase().includes("rate") || f.label.toLowerCase().includes("price")
            );
            return (
              <div
                key={item.id}
                className={`px-3 py-2.5 cursor-pointer text-xs flex justify-between items-center border-b border-border last:border-b-0 transition-colors ${
                  idx === highlighted ? "bg-surface2 text-primary" : "hover:bg-surface2 hover:text-primary"
                }`}
                onClick={() => selectSuggestion(item)}
              >
                <span>{nameField?.value}</span>
                {rateField && <span className="text-[10px] text-primary font-semibold">₹{rateField.value}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Queue Drawer ─────────────────────────────────────────────────────────────

interface QueueDrawerProps {
  queue: AppState["queue"];
  activeBillId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function QueueDrawer({ queue, activeBillId, onSelect, onClose, onDelete }: QueueDrawerProps) {
  return (
    <div className="fixed bottom-[70px] left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[90] bg-card border-t border-border drawer-up">
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-border">
        <span className="font-head text-[13px] font-bold tracking-wider">📋 BILL QUEUE</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer">✕</button>
      </div>
      {queue.length === 0 ? (
        <p className="text-center text-muted-foreground text-xs py-4">No bills in queue</p>
      ) : (
        <div className="flex gap-2.5 px-4 py-3 overflow-x-auto">
          {queue.map(b => {
            const total = b.rows.reduce((s, r) => s + (parseFloat(r.price) || 0) * (parseFloat(r.qty) || 0), 0);
            const isActive = b.id === activeBillId;
            return (
              <div
                key={b.id}
                onClick={() => { onSelect(b.id); onClose(); }}
                className={`shrink-0 bg-surface2 border rounded-sm px-3.5 py-2.5 cursor-pointer transition-colors min-w-[110px] ${
                  isActive ? "border-primary bg-[#1e1a10]" : "border-border hover:border-primary hover:bg-[#1e1a10]"
                }`}
              >
                {isActive && <span className="inline-block px-1.5 py-0.5 text-[9px] bg-primary text-primary-foreground rounded-sm font-bold mb-1">ACTIVE</span>}
                <div className="font-head text-sm font-extrabold text-primary">#{b.num}</div>
                {b.customer && <div className="text-[10px] text-muted-foreground mt-0.5">👤 {b.customer}</div>}
                <div className="text-[10px] text-muted-foreground">{b.rows.length} item{b.rows.length !== 1 ? "s" : ""}</div>
                <div className="text-[10px] text-primary font-semibold">{formatCurrency(total)}</div>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(b.id); }}
                  className="mt-1 text-[10px] text-destructive bg-transparent border-none cursor-pointer font-mono hover:underline"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Billing Page ─────────────────────────────────────────────────────────────

interface BillingPageProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  showToast: (msg: string) => void;
}

export default function BillingPage({ state, dispatch, showToast }: BillingPageProps) {
  const bill = state.queue.find(b => b.id === state.activeBillId) || null;
  const rows = bill?.rows || [];
  const grandTotal = rows.reduce((s, r) => s + (parseFloat(r.price) || 0) * (parseFloat(r.qty) || 0), 0);

  // Bills that come from EDIT_BILL already have a payments array — detect this
  const existingPayments = bill?.payments || [];
  const alreadyPaid      = existingPayments.reduce((s, p) => s + p.amount, 0);
  const isReedit         = existingPayments.length > 0;   // was saved before with payments
  const remainingDue     = grandTotal - alreadyPaid;      // what's still owed after item changes

  const [showQueue, setShowQueue] = useState(false);
  const [showCustPicker, setShowCustPicker] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [custSearch, setCustSearch] = useState("");

  const newBill = () => { dispatch({ type: "NEW_BILL" }); showToast("New bill started!"); };

  const updateRow = (rowId: string, key: keyof BillRow, val: string) => {
    if (!bill) return;
    dispatch({ type: "UPDATE_BILL_ROWS", id: bill.id, rows: bill.rows.map(r => r.id === rowId ? { ...r, [key]: val } : r) });
  };

  const addRow = () => {
    if (!bill) { newBill(); return; }
    dispatch({ type: "UPDATE_BILL_ROWS", id: bill.id, rows: [...bill.rows, { id: genId(), name: "", price: "", qty: "1" }] });
  };

  const removeRow = (rowId: string) => {
    if (!bill) return;
    dispatch({ type: "UPDATE_BILL_ROWS", id: bill.id, rows: bill.rows.filter(r => r.id !== rowId) });
  };

  const handleSaveBill = (payment: import("@/lib/store").PaymentEntry | null) => {
    if (!bill) return;
    if (isReedit) {
      // Bill already had payments — preserve them, only append new payment if one was made
      dispatch({ type: "RESAVE_BILL", id: bill.id, payment: payment ?? undefined, totalAmount: grandTotal });
      setShowPayment(false);
      const newDue = remainingDue - (payment?.amount ?? 0);
      if (newDue <= 0.01) showToast("✅ Saved! Bill fully cleared");
      else showToast(`✅ Saved! ₹${newDue.toFixed(2)} still due`);
    } else {
      // Fresh bill — payment is mandatory
      if (!payment) return;
      dispatch({ type: "SAVE_BILL", id: bill.id, payment, totalAmount: grandTotal });
      setShowPayment(false);
      const balance = payment.amount - grandTotal;
      if (balance > 0.01) showToast(`✅ Saved! Return ₹${balance.toFixed(2)} change`);
      else if (balance < -0.01) showToast(`✅ Saved! ₹${Math.abs(balance).toFixed(2)} balance due`);
      else showToast("✅ Bill saved! Fully paid");
    }
  };

  // For re-edits where the bill is already fully paid — allow saving without payment modal
  const handleSaveClick = () => {
    if (!bill || rows.length === 0) return showToast("Add items first!");
    if (isReedit && remainingDue <= 0.01) {
      // Already fully paid — just resave items, no new payment needed
      handleSaveBill(null);
    } else {
      setShowPayment(true);
    }
  };

  const filteredCusts = state.customers.filter(c => {
    const q = custSearch.toLowerCase();
    return c.fields.some(f => f.value.toLowerCase().includes(q));
  });

  return (
    <div className="flex-1 overflow-y-auto pb-[70px]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-card to-[#1e1a10] border-b border-border px-4 py-3.5 flex justify-between items-start gap-3">
        <div>
          <div className="text-[10px] text-muted-foreground tracking-[2px] uppercase mb-1">
            {bill ? `Bill #${bill.num}` : "No Active Bill"}
          </div>
          <div className="font-head text-4xl font-extrabold text-primary tracking-tighter leading-none">
            {formatCurrency(grandTotal)}
          </div>
          {/* Show payment context when re-editing a partially paid bill */}
          {isReedit && (
            <div className={`mt-1.5 text-[10px] font-mono px-2 py-1 rounded-sm border inline-flex gap-2 ${
              remainingDue <= 0.01
                ? "text-success border-success/40 bg-success/10"
                : "text-orange-400 border-orange-500/40 bg-orange-500/10"
            }`}>
              {remainingDue <= 0.01
                ? `💚 Fully paid (${formatCurrency(alreadyPaid)})`
                : `⏳ Paid ${formatCurrency(alreadyPaid)} · Due ${formatCurrency(remainingDue)}`
              }
            </div>
          )}
          {bill?.customer ? (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>👤 {bill.customer}</span>
              <button
                onClick={() => dispatch({ type: "UPDATE_BILL_CUSTOMER", id: bill.id, customer: null })}
                className="bg-transparent border-none text-muted-foreground cursor-pointer text-sm hover:text-foreground"
              >✕</button>
            </div>
          ) : bill ? (
            <button
              onClick={() => setShowCustPicker(true)}
              className="mt-2 text-[11px] text-primary bg-transparent border-none cursor-pointer font-mono hover:underline"
            >
              + Customer
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5 items-end">
          <button
            onClick={newBill}
            className="px-3 py-2 rounded-sm bg-primary text-primary-foreground text-[11px] font-semibold border-none cursor-pointer active:scale-95 transition-transform"
          >
            🆕 New
          </button>
          <button
            onClick={() => setShowQueue(q => !q)}
            className="px-3 py-2 rounded-sm border border-border bg-surface2 text-foreground text-[11px] font-mono cursor-pointer hover:border-primary hover:text-primary transition-colors relative"
          >
            📋 Queue
            {state.queue.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center bg-secondary text-secondary-foreground text-[9px] font-bold w-4 h-4 rounded-full">
                {state.queue.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Column headers */}
      {rows.length > 0 && (
        <div className="grid grid-cols-[1fr_70px_60px] gap-1.5 px-4 py-1.5 text-[9px] text-muted-foreground tracking-[1.5px] uppercase">
          <span>Item Name</span>
          <span>Price</span>
          <span>Qty</span>
        </div>
      )}

      {/* Swipe hint — shown only when there are rows */}
      {rows.length > 0 && (
        <div className="px-4 pb-1 flex items-center gap-1.5 text-[9px] text-muted-foreground/60 font-mono">
          <span>←</span>
          <span>swipe right to delete</span>
        </div>
      )}

      {/* Rows with swipe-to-delete */}
      {rows.map(r => (
        <SwipeableRow key={r.id} onDelete={() => { removeRow(r.id); showToast("Item removed"); }}>
          <div className="grid grid-cols-[1fr_70px_60px] gap-1.5 items-center px-4 py-1.5 border-b border-border slide-in">
            <AutocompleteInput
              value={r.name}
              onChange={val => updateRow(r.id, "name", val)}
              items={state.items}
              onSelectItem={(name, price) => {
                const newRows = bill!.rows.map(row => row.id === r.id ? { ...row, name, price } : row);
                dispatch({ type: "UPDATE_BILL_ROWS", id: bill!.id, rows: newRows });
              }}
              placeholder="Item name"
            />
            <input
              className="w-full bg-surface2 border border-border rounded-sm px-2 py-[7px] text-foreground font-mono text-xs outline-none focus:border-primary transition-colors"
              value={r.price}
              placeholder="₹"
              onChange={e => updateRow(r.id, "price", e.target.value)}
            />
            <input
              className="w-full bg-surface2 border border-border rounded-sm px-2 py-[7px] text-foreground font-mono text-xs outline-none focus:border-primary transition-colors"
              value={r.qty}
              placeholder="1"
              onChange={e => updateRow(r.id, "qty", e.target.value)}
            />
          </div>
        </SwipeableRow>
      ))}

      {rows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-5xl mb-3 opacity-40">🧾</div>
          <div className="font-head text-base font-bold text-foreground mb-1.5">
            {bill ? "No items yet" : "No active bill"}
          </div>
          <div className="text-[11px]">{bill ? "Tap + Add Item below" : "Tap 🆕 New above"}</div>
        </div>
      )}

      {/* Row totals */}
      {rows.length > 0 && (
        <div className="px-4 py-2">
          {rows.filter(r => r.price && r.qty).map(r => (
            <div key={r.id} className="flex justify-between text-[11px] text-muted-foreground py-0.5">
              <span>{r.name || "—"}</span>
              <span className="text-foreground">{formatCurrency(parseFloat(r.price) * parseFloat(r.qty))}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add item */}
      <div className="px-4 py-2">
        <button
          onClick={addRow}
          className="w-full px-3.5 py-2 rounded-sm border border-border bg-surface2 text-foreground text-xs font-mono cursor-pointer hover:border-primary hover:text-primary transition-colors"
        >
          + Add Item Row
        </button>
      </div>

      {/* Bill actions */}
      <div className="flex gap-2.5 px-4 py-2.5">
        <button
          onClick={() => { if (!bill) return showToast("No active bill!"); setShowPrint(true); }}
          className="flex-1 flex justify-center items-center gap-1.5 px-3.5 py-2 rounded-sm border border-border bg-surface2 text-foreground font-mono text-xs cursor-pointer hover:border-primary hover:text-primary transition-colors"
        >
          🖨️ Print
        </button>
        <button
          onClick={() => handleSaveClick()}
          className="flex-1 flex justify-center items-center gap-1.5 px-3.5 py-2 rounded-sm bg-primary text-primary-foreground font-semibold text-xs border-none cursor-pointer active:scale-[0.98] transition-transform"
        >
          💾 Save Bill
        </button>
      </div>

      {/* Payment Modal */}
      {showPayment && bill && (
        <PaymentModal
          bill={{ ...bill, totalAmount: grandTotal, payments: existingPayments }}
          isAddPayment={isReedit}
          onConfirm={handleSaveBill}
          onCancel={() => setShowPayment(false)}
        />
      )}

      {/* Print Modal */}
      {showPrint && bill && (
        <PrintPreviewModal
          bill={bill}
          user={state.user}
          onClose={() => setShowPrint(false)}
          showToast={showToast}
        />
      )}

      {/* Queue Drawer */}
      {showQueue && (
        <>
          <QueueDrawer
            queue={state.queue}
            activeBillId={state.activeBillId}
            onSelect={id => dispatch({ type: "SET_ACTIVE_BILL", id })}
            onClose={() => setShowQueue(false)}
            onDelete={id => { dispatch({ type: "DEL_FROM_QUEUE", id }); showToast("Removed from queue."); }}
          />
          <div className="fixed inset-0 z-[80]" onClick={() => setShowQueue(false)} />
        </>
      )}

      {/* Customer Picker */}
      {showCustPicker && (
        <div className="fixed inset-0 bg-black/85 z-[200] flex items-end fade-in" onClick={() => setShowCustPicker(false)}>
          <div className="bg-card border border-border rounded-t-lg w-full max-w-[430px] mx-auto max-h-[90vh] overflow-y-auto slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 py-4 border-b border-border sticky top-0 bg-card z-[1]">
              <h3 className="font-head text-base font-extrabold">Select Customer</h3>
              <button onClick={() => setShowCustPicker(false)} className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer text-lg">✕</button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-2 bg-card border border-border rounded-sm px-3 py-2 focus-within:border-primary transition-colors">
                <span className="text-muted-foreground">🔍</span>
                <input
                  className="flex-1 bg-transparent border-none outline-none text-foreground font-mono text-[13px] placeholder:text-muted-foreground"
                  placeholder="Search customers..."
                  value={custSearch}
                  onChange={e => setCustSearch(e.target.value)}
                />
              </div>
              {filteredCusts.map(c => {
                const nameF = c.fields.find(f => f.label.toLowerCase().includes("name"));
                const name = nameF?.value || c.fields[0]?.value || "Customer";
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      dispatch({ type: "UPDATE_BILL_CUSTOMER", id: bill!.id, customer: name });
                      setShowCustPicker(false);
                      showToast("Customer added!");
                    }}
                    className="w-full text-left px-3 py-2.5 bg-surface2 border border-border rounded-sm text-foreground font-mono text-xs cursor-pointer hover:border-primary hover:text-primary transition-colors"
                  >
                    👤 {name}
                  </button>
                );
              })}
              <div className="pt-2">
                <input
                  className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-foreground font-mono text-[13px] outline-none focus:border-primary transition-colors"
                  placeholder="Or type a custom name + Enter"
                  onKeyDown={e => {
                    if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                      dispatch({ type: "UPDATE_BILL_CUSTOMER", id: bill!.id, customer: (e.target as HTMLInputElement).value.trim() });
                      setShowCustPicker(false);
                      showToast("Customer added!");
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}