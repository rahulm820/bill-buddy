import { useState, Dispatch } from "react";
import { AppState, AppAction, Entity, Field, genId } from "@/lib/store";
import { EntityModal, ConfirmDialog } from "./SharedComponents";

interface StockPageProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  showToast: (msg: string) => void;
}

function EntityCard({ entity, onEdit, onDelete }: { entity: Entity; onEdit: () => void; onDelete: () => void }) {
  const nameField = entity.fields.find(f => f.label.toLowerCase().includes("name")) || entity.fields[0];
  const subField = entity.fields.find(f =>
    f !== nameField && (f.label.toLowerCase().includes("phone") || f.label.toLowerCase().includes("rate") || f.label.toLowerCase().includes("price"))
  );

  return (
    <div className="bg-card border border-border rounded-sm px-4 py-3.5 mx-4 mb-2 slide-in hover:border-primary/30 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-head text-[15px] font-bold">{nameField?.value || "—"}</div>
          {subField && <div className="text-[11px] text-muted-foreground mt-0.5">{subField.label}: {subField.value}</div>}
        </div>
        <div className="flex gap-1.5">
          <button onClick={onEdit} className="px-2.5 py-1 rounded-sm border border-border bg-surface2 text-foreground text-[11px] cursor-pointer hover:border-primary hover:text-primary transition-colors">✏️</button>
          <button onClick={onDelete} className="px-2.5 py-1 rounded-sm border border-border bg-surface2 text-foreground text-[11px] cursor-pointer hover:border-destructive hover:text-destructive transition-colors">🗑️</button>
        </div>
      </div>
      {entity.fields.filter(f => f !== nameField && f !== subField && f.value).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entity.fields.filter(f => f !== nameField && f !== subField && f.value).map(f => (
            <span key={f.id} className="text-[10px] bg-surface2 border border-border rounded-sm px-2 py-0.5 text-muted-foreground">
              <strong className="text-foreground">{f.label}:</strong> {f.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StockPage({ state, dispatch, showToast }: StockPageProps) {
  const [activeTab, setActiveTab] = useState<"customers" | "items">("customers");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ type: "customer" | "item"; entity: Entity | null } | null>(null);
  const [confirm, setConfirm] = useState<{ type: "customer" | "item"; id: string } | null>(null);

  const filter = (list: Entity[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(e => e.fields.some(f => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q)));
  };

  const customers = filter(state.customers);
  const items = filter(state.items);

  const saveEntity = (type: "customer" | "item", fields: Field[]) => {
    if (modal?.entity) {
      dispatch({ type: type === "customer" ? "UPDATE_CUSTOMER" : "UPDATE_ITEM", id: modal.entity.id, fields });
    } else {
      dispatch({ type: type === "customer" ? "ADD_CUSTOMER" : "ADD_ITEM", fields });
    }
    setModal(null);
    showToast(modal?.entity ? "Updated!" : "Added!");
  };

  const deleteEntity = (type: "customer" | "item", id: string) => {
    dispatch({ type: type === "customer" ? "DEL_CUSTOMER" : "DEL_ITEM", id });
    setConfirm(null);
    showToast("Deleted.");
  };

  return (
    <div className="flex-1 overflow-y-auto pb-[70px]">
      {/* Sub tabs */}
      <div className="flex border-b border-border bg-background sticky top-[53px] z-40">
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex-1 bg-transparent border-none border-b-2 text-[11px] font-semibold tracking-wider uppercase py-2.5 cursor-pointer transition-colors -mb-px font-mono ${
            activeTab === "customers" ? "text-primary border-primary" : "text-muted-foreground border-transparent"
          }`}
        >
          👤 Customers ({state.customers.length})
        </button>
        <button
          onClick={() => setActiveTab("items")}
          className={`flex-1 bg-transparent border-none border-b-2 text-[11px] font-semibold tracking-wider uppercase py-2.5 cursor-pointer transition-colors -mb-px font-mono ${
            activeTab === "items" ? "text-primary border-primary" : "text-muted-foreground border-transparent"
          }`}
        >
          📦 Items ({state.items.length})
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mx-4 my-3 bg-card border border-border rounded-sm px-3 py-2 focus-within:border-primary transition-colors">
        <span className="text-muted-foreground">🔍</span>
        <input
          className="flex-1 bg-transparent border-none outline-none text-foreground font-mono text-[13px] placeholder:text-muted-foreground"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer">✕</button>
        )}
      </div>

      {activeTab === "customers" && (
        <>
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <span className="font-head text-[11px] font-bold tracking-[2px] uppercase text-muted-foreground">
              Customers ({customers.length})
            </span>
            <button
              onClick={() => setModal({ type: "customer", entity: null })}
              className="px-2.5 py-1 rounded-sm border border-border bg-surface2 text-foreground text-[11px] font-mono cursor-pointer hover:border-primary hover:text-primary transition-colors"
            >
              + Add
            </button>
          </div>
          {customers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-5xl mb-3 opacity-40">👤</div>
              <div className="font-head text-base font-bold text-foreground mb-1.5">No customers yet</div>
              <div className="text-[11px]">Tap + Add to get started</div>
            </div>
          )}
          {customers.map(c => (
            <EntityCard key={c.id} entity={c} onEdit={() => setModal({ type: "customer", entity: c })} onDelete={() => setConfirm({ type: "customer", id: c.id })} />
          ))}
        </>
      )}

      {activeTab === "items" && (
        <>
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <span className="font-head text-[11px] font-bold tracking-[2px] uppercase text-muted-foreground">
              Items ({items.length})
            </span>
            <button
              onClick={() => setModal({ type: "item", entity: null })}
              className="px-2.5 py-1 rounded-sm border border-border bg-surface2 text-foreground text-[11px] font-mono cursor-pointer hover:border-primary hover:text-primary transition-colors"
            >
              + Add
            </button>
          </div>
          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-5xl mb-3 opacity-40">📦</div>
              <div className="font-head text-base font-bold text-foreground mb-1.5">No items yet</div>
              <div className="text-[11px]">Tap + Add to get started</div>
            </div>
          )}
          {items.map(i => (
            <EntityCard key={i.id} entity={i} onEdit={() => setModal({ type: "item", entity: i })} onDelete={() => setConfirm({ type: "item", id: i.id })} />
          ))}
        </>
      )}

      {modal && (
        <EntityModal
          title={modal.entity ? `Edit ${modal.type === "customer" ? "Customer" : "Item"}` : `New ${modal.type === "customer" ? "Customer" : "Item"}`}
          entity={modal.entity}
          onSave={fields => saveEntity(modal.type, fields)}
          onClose={() => setModal(null)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title="Delete?"
          sub="This action cannot be undone."
          onConfirm={() => deleteEntity(confirm.type, confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
