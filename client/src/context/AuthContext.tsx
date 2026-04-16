import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

export type AuthUser = {
  id: string;
  username: string;
  role: "admin" | "confirmateur";
  name: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUser(data); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string): Promise<AuthUser> => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "خطأ في تسجيل الدخول");
    }
    const data = await res.json();
    setUser(data);
    return data;
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout", {});
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
