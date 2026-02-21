import { useState } from "react";

interface AuthScreenProps {
  onLogin: (user: { name: string; email: string }) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    if (tab === "signup" && !name.trim()) return;
    if (!email.trim() || !password.trim()) return;
    onLogin({ name: name.trim() || email.split("@")[0], email: email.trim() });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-[430px] mx-auto">
      <h1 className="font-head text-4xl font-extrabold tracking-tighter mb-1">
        Bill<span className="text-primary">Stock</span>
      </h1>
      <p className="text-[11px] text-muted-foreground tracking-[2px] uppercase mb-10">
        Bills & Inventory Manager
      </p>

      <div className="w-full bg-card border border-border rounded-lg p-6">
        {/* Tabs */}
        <div className="flex mb-6 border-b border-border">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 pb-2.5 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors ${
              tab === "login"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`flex-1 pb-2.5 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors ${
              tab === "signup"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3.5">
          {tab === "signup" && (
            <div>
              <label className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1.5 block">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-foreground font-mono text-[13px] outline-none focus:border-primary transition-colors"
              />
            </div>
          )}
          <div>
            <label className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-foreground font-mono text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-foreground font-mono text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={handleSubmit}
            className="w-full bg-primary text-primary-foreground font-semibold text-xs py-3 rounded-sm mt-2 active:scale-[0.98] transition-transform"
          >
            {tab === "login" ? "Login →" : "Create Account →"}
          </button>
        </div>
      </div>
    </div>
  );
}
