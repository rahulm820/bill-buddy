import { AppState, AppAction } from "@/lib/store";
import { Dispatch } from "react";

interface SettingsPageProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  showToast: (msg: string) => void;
}

export default function SettingsPage({ state, dispatch, showToast }: SettingsPageProps) {
  return (
    <div className="flex-1 overflow-y-auto pb-[70px] px-4 py-4 space-y-4">
      <div>
        <span className="font-head text-[11px] font-bold tracking-[2px] uppercase text-muted-foreground">
          Account
        </span>
      </div>

      <div className="bg-card border border-border rounded-sm p-4">
        <div className="font-head text-sm font-bold mb-1">{state.user?.name || "User"}</div>
        <div className="text-xs text-muted-foreground">{state.user?.email || "—"}</div>
      </div>

      <div>
        <span className="font-head text-[11px] font-bold tracking-[2px] uppercase text-muted-foreground">
          Data Summary
        </span>
      </div>

      <div className="bg-card border border-border rounded-sm p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Customers</span>
          <span className="text-foreground font-semibold">{state.customers.length}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Items</span>
          <span className="text-foreground font-semibold">{state.items.length}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Saved Bills</span>
          <span className="text-foreground font-semibold">{state.bills.length}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Bills in Queue</span>
          <span className="text-foreground font-semibold">{state.queue.length}</span>
        </div>
      </div>

      <div>
        <span className="font-head text-[11px] font-bold tracking-[2px] uppercase text-muted-foreground">
          Cloud Backup
        </span>
      </div>

      <div className="bg-card border border-border rounded-sm p-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Not connected — Enable Lovable Cloud for backup</span>
        </div>
      </div>

      <button
        onClick={() => { dispatch({ type: "LOGOUT" }); showToast("Logged out."); }}
        className="w-full px-3.5 py-2.5 rounded-sm border border-destructive bg-transparent text-destructive font-mono text-xs cursor-pointer hover:bg-destructive hover:text-secondary-foreground transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
