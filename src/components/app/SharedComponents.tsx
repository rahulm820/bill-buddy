import { useState, useEffect } from "react";
import { genId, type Field } from "@/lib/store";

interface DynamicFieldEditorProps {
  fields: Field[];
  onChange: (fields: Field[]) => void;
}

export function DynamicFieldEditor({ fields, onChange }: DynamicFieldEditorProps) {
  const addField = () => onChange([...fields, { id: genId(), label: "", value: "" }]);
  const removeField = (id: string) => onChange(fields.filter(f => f.id !== id));
  const updateField = (id: string, key: "label" | "value", val: string) =>
    onChange(fields.map(f => f.id === id ? { ...f, [key]: val } : f));

  return (
    <div>
      {fields.map(f => (
        <div key={f.id} className="flex gap-2 items-center mb-2 slide-in">
          <input
            className="w-[100px] bg-background border border-border rounded-sm px-3 py-2.5 text-foreground font-mono text-[13px] outline-none focus:border-primary transition-colors"
            placeholder="Label"
            value={f.label}
            onChange={e => updateField(f.id, "label", e.target.value)}
          />
          <input
            className="flex-1 bg-background border border-border rounded-sm px-3 py-2.5 text-foreground font-mono text-[13px] outline-none focus:border-primary transition-colors"
            placeholder="Value"
            value={f.value}
            onChange={e => updateField(f.id, "value", e.target.value)}
          />
          <button
            onClick={() => removeField(f.id)}
            className="shrink-0 w-8 h-[38px] flex items-center justify-center bg-transparent border border-border rounded-sm text-muted-foreground text-base cursor-pointer hover:border-destructive hover:text-destructive transition-colors"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={addField}
        className="text-xs text-primary cursor-pointer bg-transparent border-none font-mono mt-1"
      >
        + Add Field
      </button>
    </div>
  );
}

interface EntityModalProps {
  title: string;
  entity: { fields: Field[] } | null;
  onSave: (fields: Field[]) => void;
  onClose: () => void;
}

export function EntityModal({ title, entity, onSave, onClose }: EntityModalProps) {
  const [fields, setFields] = useState<Field[]>(
    entity?.fields || [{ id: genId(), label: "Name", value: "" }]
  );

  return (
    <div className="fixed inset-0 bg-black/85 z-[200] flex items-end fade-in" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-lg w-full max-w-[430px] mx-auto max-h-[90vh] overflow-y-auto slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 py-4 border-b border-border sticky top-0 bg-card z-[1]">
          <h3 className="font-head text-base font-extrabold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer text-lg">✕</button>
        </div>
        <div className="px-5 py-4">
          <div className="mb-3.5">
            <label className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1.5 block">
              Fields
            </label>
            <DynamicFieldEditor fields={fields} onChange={setFields} />
          </div>
          <button
            onClick={() => { if (fields.some(f => f.label && f.value)) onSave(fields); }}
            className="w-full bg-primary text-primary-foreground font-semibold text-xs py-3 rounded-sm active:scale-[0.98] transition-transform"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  title: string;
  sub: string;
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}

export function ConfirmDialog({ title, sub, icon = "⚠️", onConfirm, onCancel, confirmLabel = "Delete" }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-6 fade-in" onClick={onCancel}>
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-[320px] text-center" onClick={e => e.stopPropagation()}>
        <div className="text-[32px] mb-3">{icon}</div>
        <h3 className="font-head text-lg font-extrabold mb-2">{title}</h3>
        <p className="text-xs text-muted-foreground mb-5">{sub}</p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 flex justify-center items-center gap-1.5 px-3.5 py-2 rounded-sm border border-border bg-surface2 text-foreground font-mono text-xs cursor-pointer hover:border-primary hover:text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex justify-center items-center gap-1.5 px-3.5 py-2 rounded-sm border border-destructive bg-transparent text-destructive font-mono text-xs cursor-pointer hover:bg-destructive hover:text-secondary-foreground transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToastProps {
  msg: string;
  onDone: () => void;
}

export function AppToast({ msg, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-success text-primary-foreground font-mono text-xs font-semibold px-5 py-2.5 rounded-sm z-[500] toast-anim whitespace-nowrap">
      {msg}
    </div>
  );
}
