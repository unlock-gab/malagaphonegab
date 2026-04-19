import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAdminLang } from "@/context/AdminLangContext";

export default function AdminLogin() {
  const { login, user } = useAuth();
  const [, navigate] = useLocation();
  const { t, lang, setLang } = useAdminLang();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      if (user.role === "admin") navigate("/admin");
      else navigate("/admin/pos");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || t("login_error"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-7">
          <div className="mx-auto mb-4 bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100" style={{ width: 260, height: 64 }}>
            <img src="/logo.jpg" alt="MALAGA PHONE" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">MALAGA <span className="text-blue-600">PHONE</span></h1>
          <p className="text-gray-500 text-sm mt-1">{t("login_subtitle")}</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-gray-800">{t("login_title")}</h2>
            <div className="flex gap-1 rounded-lg overflow-hidden border border-gray-200 text-[10px] font-bold">
              <button onClick={() => setLang("fr")}
                className={`px-2.5 py-1 transition-all ${lang === "fr" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>FR</button>
              <button onClick={() => setLang("ar")}
                className={`px-2.5 py-1 transition-all ${lang === "ar" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>AR</button>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2.5 text-xs mb-4 text-center"
              data-testid="login-error">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-600 text-xs font-semibold mb-1.5">{t("login_username")}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={t("login_username")}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                  data-testid="input-login-username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-600 text-xs font-semibold mb-1.5">{t("login_password")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t("login_password")}
                  autoComplete="current-password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                  data-testid="input-login-password"
                  required
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all mt-1"
              data-testid="button-login-submit">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />{t("login_loading")}</>
                : <><Lock className="w-4 h-4" />{t("login_button")}</>}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-5">MALAGA PHONE © {new Date().getFullYear()}</p>
      </motion.div>
    </div>
  );
}
