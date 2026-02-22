import { useState, Dispatch } from "react";
import { AppState, AppAction } from "@/lib/store";
import { updateProfile } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";

interface SettingsPageProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  showToast: (msg: string) => void;
  onLogout: () => void;
}

const syncLabels: Record<string, { label: string; color: string }> = {
  idle:    { label: "Idle",     color: "bg-muted-foreground" },
  syncing: { label: "Syncing…", color: "bg-secondary pulse-sync" },
  synced:  { label: "Synced ✓", color: "bg-success" },
  error:   { label: "Error ✕",  color: "bg-destructive" },
  offline: { label: "Offline",  color: "bg-muted-foreground" },
};

export default function SettingsPage({ state, dispatch, showToast, onLogout }: SettingsPageProps) {
  const sync = syncLabels[state.syncStatus] || syncLabels.idle;
  const user = state.user;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [businessName, setBusinessName] = useState(user?.business_name || "");
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const updates = { name: name.trim(), phone: phone.trim(), business_name: businessName.trim() };
    if (isSupabaseConfigured) {
      const result = await updateProfile(user.id, updates);
      if (!result) { showToast("⚠️ Failed to save profile"); setSaving(false); return; }
    }
    dispatch({ type: "UPDATE_USER_PROFILE", updates });
    setEditing(false);
    setSaving(false);
    showToast("Profile saved!");
  };

  return (
    <div className="flex-1 overflow-y-auto pb-[70px] px-4 py-4 space-y-4">

      {/* ── Account / Profile ── */}
      <span className="font-head text-[11px] font-bold tracking-[2px] uppercase text-muted-foreground">Account</span>

      <div className="bg-card border border-border rounded-sm p-4 space-y-3">
        {!editing ? (
          <>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-head text-sm font-bold">{user?.name || "—"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{user?.email || "—"}</div>
                {user?.phone && <div className="text-xs text-muted-foreground mt-0.5">📞 {user.phone}</div>}
                {user?.business_name && <div className="text-xs text-muted-foreground mt-0.5">🏪 {user.business_name}</div>}
              </div>
              <button
                onClick={() => { setName(user?.name || ""); setPhone(user?.phone || ""); setBusinessName(user?.business_name || ""); setEditing(true); }}
                className="px-2.5 py-1 rounded-sm border border-border bg-surface2 text-foreground text-[11px] cursor-pointer hover:border-primary hover:text-primary transition-colors"
              >
                ✏️ Edit
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {[
              { label: "Name", value: name, set: setName, placeholder: "Your name" },
              { label: "Phone", value: phone, set: setPhone, placeholder: "+91 98765 43210" },
              { label: "Business Name", value: businessName, set: setBusinessName, placeholder: "Your shop / company" },
            ].map(f => (
              <div key={f.label}>
                <label className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1.5 block">{f.label}</label>
                <input
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-foreground font-mono text-[13px] outline-none focus:border-primary transition-colors"
                />
              </div>
            ))}
            <div className="text-[10px] text-muted-foreground font-mono">Email: {user?.email} (cannot be changed)</div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2 rounded-sm border border-border bg-surface2 text-foreground font-mono text-xs cursor-pointer hover:border-primary transition-colors"
              >Cancel</button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 py-2 rounded-sm bg-primary text-primary-foreground font-semibold text-xs cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {saving && <span className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Cloud Sync ── */}
      <span className="font-head text-[11px] font-bold tracking-[2px] uppercase text-muted-foreground">Cloud Sync</span>

      <div className="bg-card border border-border rounded-sm p-4 space-y-3">
        {isSupabaseConfigured ? (
          <>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${sync.color}`} />
              <span className="text-xs text-foreground font-semibold">{sync.label}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Data is automatically synced to Supabase. Changes reflect across all your devices instantly.
            </p>
            <div className="text-[10px] text-muted-foreground font-mono border-t border-border pt-2">
              User ID: {user?.id?.slice(0, 20)}…
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Demo mode. Add <code className="bg-surface2 px-1 rounded-sm text-foreground">VITE_SUPABASE_URL</code> and{" "}
              <code className="bg-surface2 px-1 rounded-sm text-foreground">VITE_SUPABASE_ANON_KEY</code> to your{" "}
              <code className="bg-surface2 px-1 rounded-sm text-foreground">.env</code> to enable cloud sync.
            </p>
          </div>
        )}
      </div>

      {/* ── Data Summary ── */}
      <span className="font-head text-[11px] font-bold tracking-[2px] uppercase text-muted-foreground">Data Summary</span>

      <div className="bg-card border border-border rounded-sm p-4 space-y-2">
        {[["Customers", state.customers.length], ["Items", state.items.length], ["Saved Bills", state.bills.length], ["In Queue", state.queue.length]].map(([l, v]) => (
          <div key={l as string} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{l}</span>
            <span className="text-foreground font-semibold">{v}</span>
          </div>
        ))}
      </div>

      {/* ── Logout ── */}
      <button
        onClick={onLogout}
        className="w-full px-3.5 py-2.5 rounded-sm border border-destructive bg-transparent text-destructive font-mono text-xs cursor-pointer hover:bg-destructive hover:text-secondary-foreground transition-colors"
      >
        Logout
      </button>
    </div>
  );
}