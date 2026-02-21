import { useReducer, useState, useCallback } from "react";
import { appReducer, INITIAL_STATE } from "@/lib/store";
import AuthScreen from "@/components/app/AuthScreen";
import BottomNav from "@/components/app/BottomNav";
import StockPage from "@/components/app/StockPage";
import BillingPage from "@/components/app/BillingPage";
import SavedBillsPage from "@/components/app/SavedBillsPage";
import SettingsPage from "@/components/app/SettingsPage";
import { AppToast } from "@/components/app/SharedComponents";

const Index = () => {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  const [activeTab, setActiveTab] = useState("billing");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(null);
    setTimeout(() => setToast(msg), 10);
  }, []);

  if (!state.isLoggedIn) {
    return (
      <AuthScreen
        onLogin={user => dispatch({ type: "LOGIN", user })}
      />
    );
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="px-4 pt-3.5 pb-2.5 border-b border-border bg-background flex items-center justify-between sticky top-0 z-50">
        <h1 className="font-head text-xl font-extrabold tracking-tight">
          Bill<span className="text-primary">Stock</span>
        </h1>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-muted-foreground">{state.user?.name}</span>
        </div>
      </header>

      {/* Pages */}
      {activeTab === "stock" && <StockPage state={state} dispatch={dispatch} showToast={showToast} />}
      {activeTab === "billing" && <BillingPage state={state} dispatch={dispatch} showToast={showToast} />}
      {activeTab === "saved" && <SavedBillsPage state={state} dispatch={dispatch} showToast={showToast} />}
      {activeTab === "settings" && <SettingsPage state={state} dispatch={dispatch} showToast={showToast} />}

      {/* Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} queueCount={state.queue.length} />

      {/* Toast */}
      {toast && <AppToast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
};

export default Index;
