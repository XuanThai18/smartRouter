"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, Zap, Lock, Mail, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Vui lòng nhập đầy đủ email và mật khẩu."); return; }

    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email:    email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email hoặc mật khẩu không đúng. Vui lòng thử lại.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "hsl(var(--bg))" }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.04]"
          style={{ background: "hsl(var(--primary))", filter: "blur(80px)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-[0.03]"
          style={{ background: "hsl(var(--green))", filter: "blur(80px)" }}
        />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius)] mb-4"
            style={{ background: "hsl(var(--primary-dim))" }}>
            <Zap className="w-6 h-6" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: "hsl(var(--text))" }}>
            SmartRoute
          </h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--text-muted))" }}>
            Hệ thống điều phối thông minh
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-[var(--radius)] p-6 border"
          style={{
            background: "hsl(var(--bg-card))",
            borderColor: "hsl(var(--border))",
          }}
        >
          <h2 className="text-sm font-semibold mb-5" style={{ color: "hsl(var(--text))" }}>
            Đăng nhập hệ thống
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "hsl(var(--text-muted))" }}>
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                  style={{ color: "hsl(var(--text-muted))" }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@smartroute.vn"
                  autoComplete="email"
                  className="input !pl-9"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "hsl(var(--text-muted))" }}>
                Mật khẩu
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                  style={{ color: "hsl(var(--text-muted))" }}
                />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input !pl-9 !pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "hsl(var(--text-muted))" }}
                  tabIndex={-1}
                >
                  {showPw
                    ? <EyeOff className="w-3.5 h-3.5" />
                    : <Eye    className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="text-xs px-3 py-2.5 rounded-[var(--radius)] border fade-in"
                style={{
                  color: "hsl(var(--red))",
                  background: "hsl(var(--red-dim))",
                  borderColor: "hsl(0 74% 54% / 0.3)",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Đang xác thực...</>
                : <><LogIn  className="w-4 h-4" />Đăng nhập</>
              }
            </button>
          </form>
        </div>

        {/* Hint */}
        <p className="text-center text-[11px] mt-4" style={{ color: "hsl(var(--text-muted))" }}>
          Demo: <span style={{ color: "hsl(var(--text-sub))" }}>admin@smartroute.vn</span>
          {" "}/ <span style={{ color: "hsl(var(--text-sub))" }}>admin123</span>
        </p>
      </div>
    </div>
  );
}
