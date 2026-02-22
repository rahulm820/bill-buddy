import { useReducer, useState, useCallback, useEffect, useRef } from "react";
import { appReducer, INITIAL_STATE, AppState, AppAction } from "@/lib/store";
import { loadUserData, upsertCustomer, deleteCustomer, upsertItem, deleteItem, upsertBill, deleteBill, signOut, getCurrentSession } from "@/lib/db";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import AuthScreen from "@/components/app/AuthScreen";
import BottomNav from "@/components/app/BottomNav";
import StockPage from "@/components/app/StockPage";
import BillingPage from "@/components/app/BillingPage";
import SavedBillsPage from "@/components/app/SavedBillsPage";
import SettingsPage from "@/components/app/SettingsPage";
import { AppToast } from "@/components/app/SharedComponents";

// ─── Sync hook ────────────────────────────────────────────────────────────────
// Watches state changes and pushes diffs to Supabase

function useSyncToCloud(state: AppState, dispatch: React.Dispatch<AppAction>) {
  const prevState = useRef<AppState | null>(null);

  useEffect(() => {
    const prev = prevState.current;
    prevState.current = state;

    if (!state.isLoggedIn || !state.user || !isSupabaseConfigured) return;
    if (!prev || !prev.isLoggedIn) return;

    const userId = state.user.id;

    // Customers
    if (state.customers !== prev.customers) {
      // Upsert new/changed
      state.customers.forEach(c => {
        const old = prev.customers.find(x => x.id === c.id);
        if (!old || JSON.stringify(old.fields) !== JSON.stringify(c.fields)) {
          upsertCustomer(userId, c);
        }
      });
      // Delete removed
      prev.customers.forEach(c => {
        if (!state.customers.find(x => x.id === c.id)) {
          deleteCustomer(c.id);
        }
      });
    }

    // Items
    if (state.items !== prev.items) {
      state.items.forEach(i => {
        const old = prev.items.find(x => x.id === i.id);
        if (!old || JSON.stringify(old.fields) !== JSON.stringify(i.fields)) {
          upsertItem(userId, i);
        }
      });
      prev.items.forEach(i => {
        if (!state.items.find(x => x.id === i.id)) {
          deleteItem(i.id);
        }
      });
    }

    // Bills
    if (state.bills !== prev.bills) {
      state.bills.forEach(b => {
        const old = prev.bills.find(x => x.id === b.id);
        if (!old) {
          upsertBill(userId, b);
        }
      });
      prev.bills.forEach(b => {
        if (!state.bills.find(x => x.id === b.id)) {
          deleteBill(b.id);
        }
      });
    }
  }, [state]);
}

// ─── Component ────────────────────────────────────────────────────────────────

const Index = () => {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  const [activeTab, setActiveTab] = useState("billing");
  const [toast, setToast] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useSyncToCloud(state, dispatch);

  const showToast = useCallback((msg: string) => {
    setToast(null);
    setTimeout(() => setToast(msg), 10);
  }, []);

  // ── Restore session on app load ──
  useEffect(() => {
    if (!isSupabaseConfigured) { setCheckingSession(false); return; }

    getCurrentSession().then(session => {
      if (session?.user) {
        const u = session.user;
        dispatch({ type: "LOGIN", user: { id: u.id, name: u.user_metadata?.name || u.email!.split("@")[0], email: u.email! } });
      }
      setCheckingSession(false);
    });

    // Listen for auth changes (e.g. token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") dispatch({ type: "LOGOUT" });
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load cloud data after login ──
  useEffect(() => {
    if (!state.isLoggedIn || !state.user || !isSupabaseConfigured) return;
    const userId = state.user.id;

    dispatch({ type: "SET_SYNC_STATUS", status: "syncing" });
    loadUserData(userId)
      .then(({ customers, items, bills }) => {
        dispatch({ type: "LOAD_CLOUD_DATA", customers, items, bills });
      })
      .catch(() => {
        dispatch({ type: "SET_SYNC_STATUS", status: "error" });
        showToast("⚠️ Cloud sync failed — working offline");
      });
  }, [state.isLoggedIn, state.user?.id]);

  const handleLogin = useCallback((user: { name: string; email: string; id: string }) => {
    dispatch({ type: "LOGIN", user });
  }, []);

  const handleLogout = useCallback(async () => {
    if (isSupabaseConfigured) await signOut();
    dispatch({ type: "LOGOUT" });
    showToast("Logged out.");
  }, []);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground font-mono">Loading...</span>
        </div>
      </div>
    );
  }

  if (!state.isLoggedIn) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="px-4 pt-3.5 pb-2.5 border-b border-border bg-background flex items-center justify-between sticky top-0 z-50">
        <h1 className="font-head text-xl font-extrabold tracking-tight">
          Bill<span className="text-primary">Stock</span>
        </h1>
        <div className="flex gap-2 items-center">
          {/* Sync indicator */}
          {isSupabaseConfigured && (
            <span className="flex items-center gap-1">
              {state.syncStatus === "syncing" && (
                <span className="w-1.5 h-1.5 rounded-full bg-secondary pulse-sync" title="Syncing..." />
              )}
              {state.syncStatus === "synced" && (
                <span className="w-1.5 h-1.5 rounded-full bg-success" title="Synced" />
              )}
              {state.syncStatus === "error" && (
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" title="Sync error" />
              )}
              {state.syncStatus === "offline" && (
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" title="Offline" />
              )}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{state.user?.name}</span>
        </div>
      </header>

      {/* Pages */}
      {activeTab === "stock" && <StockPage state={state} dispatch={dispatch} showToast={showToast} />}
      {activeTab === "billing" && <BillingPage state={state} dispatch={dispatch} showToast={showToast} />}
      {activeTab === "saved" && <SavedBillsPage state={state} dispatch={dispatch} showToast={showToast} onSwitchTab={setActiveTab} />}
      {activeTab === "settings" && (
        <SettingsPage state={state} dispatch={dispatch} showToast={showToast} onLogout={handleLogout} />
      )}

      {/* Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} queueCount={state.queue.length} />

      {/* Toast */}
      {toast && <AppToast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
};

export default Index;