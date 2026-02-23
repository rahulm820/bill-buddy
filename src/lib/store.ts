export const genId = () => Math.random().toString(36).slice(2, 9);
export const formatCurrency = (n: number) => `₹${Number(n || 0).toFixed(2)}`;

export interface Field { id: string; label: string; value: string; }
export interface Entity { id: string; fields: Field[]; }
export interface BillRow { id: string; name: string; price: string; qty: string; }

// Each individual payment entry
export interface PaymentEntry {
  id: string;
  amount: number;
  mode: string;        // cash | upi | card | credit
  paidAt: number;      // timestamp
  note?: string;
}

export interface QueueBill {
  id: string;
  num: number;
  rows: BillRow[];
  customer: string | null;
  savedAt?: number;
  totalAmount?: number;
  // NEW: full payment history replaces single amountPaid
  payments: PaymentEntry[];
  // Legacy fields kept for backward-compat with old saved data
  amountPaid?: number;
  paymentMode?: string;
}

export interface AppUser {
  id: string; name: string; email: string;
  phone?: string | null; business_name?: string | null;
}

export interface AppState {
  isLoggedIn: boolean;
  user: AppUser | null;
  customers: Entity[];
  items: Entity[];
  bills: QueueBill[];
  queue: QueueBill[];
  activeBillId: string | null;
  syncStatus: "idle" | "syncing" | "synced" | "error" | "offline";
}

export type AppAction =
  | { type: "LOGIN"; user: AppUser }
  | { type: "LOGOUT" }
  | { type: "SET_SYNC_STATUS"; status: AppState["syncStatus"] }
  | { type: "UPDATE_USER_PROFILE"; updates: Partial<AppUser> }
  | { type: "LOAD_CLOUD_DATA"; customers: Entity[]; items: Entity[]; bills: QueueBill[] }
  | { type: "ADD_CUSTOMER"; fields: Field[] }
  | { type: "UPDATE_CUSTOMER"; id: string; fields: Field[] }
  | { type: "DEL_CUSTOMER"; id: string }
  | { type: "ADD_ITEM"; fields: Field[] }
  | { type: "UPDATE_ITEM"; id: string; fields: Field[] }
  | { type: "DEL_ITEM"; id: string }
  | { type: "NEW_BILL" }
  | { type: "SET_ACTIVE_BILL"; id: string }
  | { type: "UPDATE_BILL_ROWS"; id: string; rows: BillRow[] }
  | { type: "UPDATE_BILL_CUSTOMER"; id: string; customer: string | null }
  | { type: "SAVE_BILL"; id: string; payment: PaymentEntry; totalAmount: number }
  | { type: "RESAVE_BILL"; id: string; payment?: PaymentEntry; totalAmount: number }  // re-save after item edit — keeps old payments
  | { type: "ADD_PAYMENT"; id: string; payment: PaymentEntry }
  | { type: "DEL_FROM_QUEUE"; id: string }
  | { type: "DEL_BILL"; id: string }
  | { type: "EDIT_BILL"; id: string };

let billCounter = 0;

export const INITIAL_STATE: AppState = {
  isLoggedIn: false, user: null, customers: [], items: [],
  bills: [], queue: [], activeBillId: null, syncStatus: "idle",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Sum all payments on a bill (handles legacy amountPaid too) */
export function getTotalPaid(bill: QueueBill): number {
  const fromHistory = (bill.payments || []).reduce((s, p) => s + p.amount, 0);
  // If no payments array yet (old data), fall back to legacy field
  if (fromHistory === 0 && bill.amountPaid) return bill.amountPaid;
  return fromHistory;
}

export function getBillTotal(bill: QueueBill): number {
  return bill.totalAmount ?? bill.rows.reduce(
    (s, r) => s + (parseFloat(r.price) || 0) * (parseFloat(r.qty) || 0), 0
  );
}

export function getBalanceDue(bill: QueueBill): number {
  return getBillTotal(bill) - getTotalPaid(bill);
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "LOGIN":
      return { ...state, isLoggedIn: true, user: action.user, syncStatus: "syncing" };
    case "LOGOUT":
      return { ...INITIAL_STATE };
    case "SET_SYNC_STATUS":
      return { ...state, syncStatus: action.status };
    case "UPDATE_USER_PROFILE":
      return { ...state, user: state.user ? { ...state.user, ...action.updates } : state.user };
    case "LOAD_CLOUD_DATA": {
      const maxNum = Math.max(0, ...action.bills.map(b => b.num));
      if (maxNum > billCounter) billCounter = maxNum;
      // Ensure every loaded bill has a payments array
      const bills = action.bills.map(b => ({ ...b, payments: b.payments || [] }));
      return { ...state, customers: action.customers, items: action.items, bills, syncStatus: "synced" };
    }
    case "ADD_CUSTOMER":
      return { ...state, customers: [...state.customers, { id: genId(), fields: action.fields }] };
    case "UPDATE_CUSTOMER":
      return { ...state, customers: state.customers.map(c => c.id === action.id ? { ...c, fields: action.fields } : c) };
    case "DEL_CUSTOMER":
      return { ...state, customers: state.customers.filter(c => c.id !== action.id) };
    case "ADD_ITEM":
      return { ...state, items: [...state.items, { id: genId(), fields: action.fields }] };
    case "UPDATE_ITEM":
      return { ...state, items: state.items.map(i => i.id === action.id ? { ...i, fields: action.fields } : i) };
    case "DEL_ITEM":
      return { ...state, items: state.items.filter(i => i.id !== action.id) };
    case "NEW_BILL": {
      const id = genId(); const num = ++billCounter;
      return { ...state, queue: [...state.queue, { id, num, rows: [{ id: genId(), name: "", price: "", qty: "1" }], customer: null, payments: [] }], activeBillId: id };
    }
    case "SET_ACTIVE_BILL":
      return { ...state, activeBillId: action.id };
    case "UPDATE_BILL_ROWS":
      return { ...state, queue: state.queue.map(b => b.id === action.id ? { ...b, rows: action.rows } : b) };
    case "UPDATE_BILL_CUSTOMER":
      return { ...state, queue: state.queue.map(b => b.id === action.id ? { ...b, customer: action.customer } : b) };
    case "SAVE_BILL": {
      const bill = state.queue.find(b => b.id === action.id);
      if (!bill) return state;
      const newQueue = state.queue.filter(b => b.id !== action.id);
      const savedBill: QueueBill = {
        ...bill,
        savedAt: Date.now(),
        totalAmount: action.totalAmount,
        payments: [...(bill.payments || []), action.payment],
      };
      return { ...state, bills: [...state.bills, savedBill], queue: newQueue, activeBillId: newQueue[0]?.id || null };
    }
    case "RESAVE_BILL": {
      // Re-saving after item edit: preserve existing payments, only append if a new payment provided
      const bill = state.queue.find(b => b.id === action.id);
      if (!bill) return state;
      const newQueue = state.queue.filter(b => b.id !== action.id);
      const savedBill: QueueBill = {
        ...bill,
        savedAt: Date.now(),
        totalAmount: action.totalAmount,
        payments: action.payment
          ? [...(bill.payments || []), action.payment]
          : (bill.payments || []),
      };
      return { ...state, bills: [...state.bills, savedBill], queue: newQueue, activeBillId: newQueue[0]?.id || null };
    }
    case "ADD_PAYMENT": {
      // Append a new payment to an already-saved bill — does NOT touch items
      return {
        ...state,
        bills: state.bills.map(b =>
          b.id === action.id
            ? { ...b, payments: [...(b.payments || []), action.payment] }
            : b
        ),
      };
    }
    case "DEL_FROM_QUEUE": {
      const newQueue = state.queue.filter(b => b.id !== action.id);
      return { ...state, queue: newQueue, activeBillId: state.activeBillId === action.id ? (newQueue[0]?.id || null) : state.activeBillId };
    }
    case "DEL_BILL":
      return { ...state, bills: state.bills.filter(b => b.id !== action.id) };
    case "EDIT_BILL": {
      const bill = state.bills.find(b => b.id === action.id);
      if (!bill) return state;
      // Preserve payment history when editing items
      return {
        ...state,
        bills: state.bills.filter(b => b.id !== action.id),
        queue: [...state.queue, { ...bill, savedAt: undefined }],
        activeBillId: bill.id,
      };
    }
    default: return state;
  }
}