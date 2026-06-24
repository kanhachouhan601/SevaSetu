import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LanguageSelector from "../components/LanguageSelector";
import { Heart, Mail, Lock, Eye, EyeOff, ChevronRight } from "lucide-react";

export default function Login() {
  // ✅ FIX: useAuth se login lo — navigate khud karta hai AuthContext
  const { login, loading, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError("");

    // ✅ FIX: login() already navigates to correct dashboard via AuthContext
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || "Invalid email or password.");
    }
    // No manual navigate needed — AuthContext handles it
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end">
          <LanguageSelector compact />
        </div>
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-lg shadow-sky-200 mb-4">
            <Heart className="h-8 w-8 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">SevaSetu</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <div className="rounded-2xl bg-white shadow-xl border border-sky-100 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-sky-400 via-sky-500 to-teal-500" />
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {(error || authError) && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error || authError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Mail className="h-3.5 w-3.5 text-gray-400" /> Email Address
              </label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100" />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Lock className="h-3.5 w-3.5 text-gray-400" /> Password
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-11 text-sm outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100" />
                <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || !email.trim() || !password.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-sky-600 hover:to-teal-600 disabled:opacity-50">
              {loading ? "Signing in…" : <>Login <ChevronRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="px-8 pb-8 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <Link to="/register" className="font-semibold text-sky-600 hover:text-sky-700">Register here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
