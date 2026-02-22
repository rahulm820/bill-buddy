import { useState } from "react";
import { signInWithEmail, signUpWithEmail } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";

interface AuthScreenProps {
  onLogin: (user: { name: string; email: string; id: string }) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (tab === "signup" && !name.trim()) { setError("Name is required"); return; }
    if (!email.trim() || !password.trim()) { setError("Email and password required"); return; }
    if (password.length < 6) { setError("Password must be 6+ characters"); return; }

    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Offline / demo mode — skip real auth
        onLogin({ name: name.trim() || email.split("@")[0], email: email.trim(), id: "offline-user" });
        return;
      }

      if (tab === "signup") {
        const data = await signUpWithEmail(email.trim(), password, name.trim());
        if (data.user) {
          onLogin({
            id: data.user.id,
            name: data.user.user_metadata?.name || name.trim(),
            email: data.user.email!,
          });
        } else {
          setError("Check your email to confirm your account.");
        }
      } else {
        const data = await signInWithEmail(email.trim(), password);
        if (data.user) {
          onLogin({
            id: data.user.id,
            name: data.user.user_metadata?.name || email.split("@")[0],
            email: data.user.email!,
          });
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-[430px] mx-auto">
      <h1 className="font-head text-4xl font-extrabold tracking-tighter mb-1">
        Bill<span className="text-primary">Stock</span>
      </h1>
      <p className="text-[11px] text-muted-foreground tracking-[2px] uppercase mb-10">
        Bills & Inventory Manager
      </p>

      {!isSupabaseConfigured && (
        <div className="w-full mb-4 px-3 py-2 bg-secondary/10 border border-secondary/30 rounded-sm text-[11px] text-secondary font-mono">
          ⚠️ Running in demo mode — data is not persisted to cloud. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync.
        </div>
      )}

      <div className="w-full bg-card border border-border rounded-lg p-6">
        {/* Tabs */}
        <div className="flex mb-6 border-b border-border">
          {(["login", "signup"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className={`flex-1 pb-2.5 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors ${
                tab === t ? "text-primary border-primary" : "text-muted-foreground border-transparent"
              }`}
            >
              {t === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>

        <div className="space-y-3.5">
          {tab === "signup" && (
            <div>
              <label className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1.5 block">Name</label>
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
            <label className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-foreground font-mono text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-[1.5px] uppercase text-muted-foreground mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-foreground font-mono text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && (
            <div className="text-[11px] text-destructive font-mono bg-destructive/10 border border-destructive/30 rounded-sm px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold text-xs py-3 rounded-sm mt-2 active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="inline-block w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            )}
            {tab === "login" ? "Login →" : "Create Account →"}
          </button>
        </div>
      </div>
    </div>
  );
}