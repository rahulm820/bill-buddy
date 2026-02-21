export const genId = () => Math.random().toString(36).slice(2, 9);
export const formatCurrency = (n: number) => `₹${Number(n || 0).toFixed(2)}`;

export interface Field {
  id: string;
  label: string;
  value: string;
}

export interface Entity {
  id: string;
  fields: Field[];
}

export interface BillRow {
  id: string;
  name: string;
  price: string;
  qty: string;
}

export interface QueueBill {
  id: string;
  num: number;
  rows: BillRow[];
  customer: string | null;
  savedAt?: number;
}

export interface AppState {
  isLoggedIn: boolean;
  user: { name: string; email: string } | null;
  customers: Entity[];
  items: Entity[];
  bills: QueueBill[];
  queue: QueueBill[];
  activeBillId: string | null;
}

export type AppAction =
  | { type: "LOGIN"; user: { name: string; email: string } }
  | { type: "LOGOUT" }
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
  | { type: "SAVE_BILL"; id: string }
  | { type: "DEL_FROM_QUEUE"; id: string }
  | { type: "DEL_BILL"; id: string };

let billCounter = 0;

export const INITIAL_STATE: AppState = {
  isLoggedIn: false,
  user: null,
  customers: [
    { id: genId(), fields: [{ id: genId(), label: "Name", value: "Rahul Sharma" }, { id: genId(), label: "Phone", value: "9876543210" }, { id: genId(), label: "Shop Name", value: "Sharma Traders" }] },
    { id: genId(), fields: [{ id: genId(), label: "Name", value: "Priya Patel" }, { id: genId(), label: "Phone", value: "9988776655" }, { id: genId(), label: "GST", value: "29ABCDE1234F1Z5" }] },
  ],
  items: [
    { id: genId(), fields: [{ id: genId(), label: "Item Name", value: "Basmati Rice" }, { id: genId(), label: "Net Rate", value: "65" }, { id: genId(), label: "Unit", value: "kg" }] },
    { id: genId(), fields: [{ id: genId(), label: "Item Name", value: "Refined Oil" }, { id: genId(), label: "Net Rate", value: "130" }, { id: genId(), label: "Offer", value: "5% off" }, { id: genId(), label: "Unit", value: "litre" }] },
    { id: genId(), fields: [{ id: genId(), label: "Item Name", value: "Wheat Flour" }, { id: genId(), label: "Net Rate", value: "42" }, { id: genId(), label: "Unit", value: "kg" }] },
    { id: genId(), fields: [{ id: genId(), label: "Item Name", value: "Sugar" }, { id: genId(), label: "Net Rate", value: "45" }, { id: genId(), label: "Unit", value: "kg" }] },
  ],
  bills: [],
  queue: [],
  activeBillId: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "LOGIN":
      return { ...state, isLoggedIn: true, user: action.user };
    case "LOGOUT":
      return { ...INITIAL_STATE };
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
      const id = genId();
      const num = ++billCounter;
      return { ...state, queue: [...state.queue, { id, num, rows: [{ id: genId(), name: "", price: "", qty: "1" }], customer: null }], activeBillId: id };
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
      return { ...state, bills: [...state.bills, { ...bill, savedAt: Date.now() }], queue: newQueue, activeBillId: newQueue[0]?.id || null };
    }
    case "DEL_FROM_QUEUE": {
      const newQueue = state.queue.filter(b => b.id !== action.id);
      return { ...state, queue: newQueue, activeBillId: state.activeBillId === action.id ? (newQueue[0]?.id || null) : state.activeBillId };
    }
    case "DEL_BILL":
      return { ...state, bills: state.bills.filter(b => b.id !== action.id) };
    default:
      return state;
  }
}
