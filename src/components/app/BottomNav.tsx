import { Dispatch } from "react";
import { AppAction } from "@/lib/store";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  queueCount: number;
}

const tabs = [
  { id: "stock", icon: "📦", label: "Stock" },
  { id: "billing", icon: "🧾", label: "Billing" },
  { id: "saved", icon: "💾", label: "Saved" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

export default function BottomNav({ activeTab, onTabChange, queueCount }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border flex z-[100]">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 pb-4 bg-transparent border-none text-[9px] font-mono cursor-pointer transition-colors relative ${
            activeTab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="text-xl leading-none">{t.icon}</span>
          <span>{t.label}</span>
          {t.id === "billing" && queueCount > 0 && (
            <span className="absolute top-1.5 right-[calc(50%-18px)] bg-secondary text-secondary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {queueCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
