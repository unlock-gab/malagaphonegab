import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, ShoppingCart, ChevronDown,
  Menu, Bell, Settings, Truck, Users, LogOut, Loader2,
  ShoppingBag, Building2, Tags, Star, Smartphone,
  TrendingUp, Boxes, Home, Receipt, ChevronRight, BarChart3, Shield, Zap,
  Languages,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useAdminLang } from "@/context/AdminLangContext";
import { ORDER_STATUSES } from "@shared/schema";

function buildNavSections(t: (k: any) => string) {
  return [
    {
      label: t("nav_home"),
      items: [
        { icon: LayoutDashboard, label: t("nav_dashboard"), href: "/admin" },
      ],
    },
    {
      label: t("nav_products_section"),
      items: [
        { icon: Smartphone,  label: t("nav_products"),    href: "/admin/products" },
        { icon: Tags,        label: t("nav_categories"),  href: "/admin/categories" },
        { icon: Star,        label: t("nav_brands"),      href: "/admin/brands" },
      ],
    },
    {
      label: t("nav_purchases_section"),
      items: [
        { icon: Building2,   label: t("nav_suppliers"),  href: "/admin/suppliers" },
        { icon: ShoppingBag, label: t("nav_purchases"),  href: "/admin/purchases" },
        { icon: Boxes,       label: t("nav_inventory"),  href: "/admin/inventory" },
      ],
    },
    {
      label: t("nav_sales_section"),
      items: [
        { icon: Receipt,    label: t("nav_expenses"),    href: "/admin/expenses" },
        { icon: TrendingUp, label: t("nav_profit"),      href: "/admin/profit" },
        { icon: BarChart3,  label: t("nav_reports"),     href: "/admin/reports" },
        { icon: Users,      label: t("nav_customers"),   href: "/admin/customers" },
        { icon: Shield,     label: t("nav_after_sale"),  href: "/admin/after-sale" },
      ],
    },
    {
      label: t("nav_admin_section"),
      items: [
        { icon: Users,     label: t("nav_confirmateurs"), href: "/admin/confirmateurs" },
        { icon: Truck,     label: t("nav_delivery"),      href: "/admin/delivery" },
        { icon: Building2, label: t("nav_shippers"),      href: "/admin/shippers" },
        { icon: Settings,  label: t("nav_settings"),      href: "/admin/settings" },
      ],
    },
  ];
}

function OrdersSubmenu({ counts, location, navigate, onClose, t, salesLabel }: {
  counts: Record<string, number>; location: string; navigate: (to: string) => void;
  onClose?: () => void; t: (k: any) => string; salesLabel: string;
}) {
  const isOnOrders = location.startsWith("/admin/orders");
  const [open, setOpen] = useState(isOnOrders);
  const currentSearch = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("status") || "all"
    : "all";

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-sm group transition-all ${
          isOnOrders
            ? "bg-blue-50 text-blue-700 font-semibold"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
        data-testid="nav-admin-orders"
      >
        <ShoppingCart className={`w-4 h-4 flex-shrink-0 ${isOnOrders ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`} />
        <span className="flex-1 text-start">{t("nav_orders")}</span>
        {(counts.all ?? 0) > 0 && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[18px] text-center ${
            isOnOrders ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
          }`}>{counts.all}</span>
        )}
        <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""} ${isOnOrders ? "text-blue-500" : "text-gray-400"}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="ms-5 mb-1 border-s-2 border-gray-100 ps-3 space-y-0.5 py-0.5">
              <button onClick={() => { navigate("/admin/orders"); onClose?.(); }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all ${
                  currentSearch === "all" && isOnOrders ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`} data-testid="nav-orders-status-all">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-gray-400" />
                <span className="flex-1 text-start">{t("nav_all_orders")}</span>
                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{counts.all ?? 0}</span>
              </button>
              {ORDER_STATUSES.map(s => (
                <button key={s.key}
                  onClick={() => { navigate(`/admin/orders?status=${s.key}`); onClose?.(); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all ${
                    currentSearch === s.key && isOnOrders ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`} data-testid={`nav-orders-status-${s.key}`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                  <span className="flex-1 text-start">{s.label}</span>
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{counts[s.key] ?? 0}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function safeHref(href: string): string {
  if (typeof href !== "string") return "#";
  const lower = href.toLowerCase().trim();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#";
  return href;
}

const renderNavItem = (item: { icon: any; label: string; href: string }, location: string, onClose?: () => void) => {
  const safe = safeHref(item.href);
  const active = safe === "/admin" ? location === "/admin" : location.startsWith(safe);
  return (
    <Link key={safe} href={safe}>
      <div onClick={onClose}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 cursor-pointer transition-all text-sm group ${
          active
            ? "bg-blue-50 text-blue-700 font-semibold"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
        data-testid={`nav-admin-${safe.split("/").pop()}`}
      >
        <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`} />
        <span className="flex-1">{item.label}</span>
        {active && <ChevronRight className="w-3 h-3 text-blue-400 opacity-60" />}
      </div>
    </Link>
  );
};

function NavContent({ location, orderCounts, navigate, onClose, t }: {
  location: string; orderCounts: Record<string, number>; navigate: (to: string) => void;
  onClose?: () => void; t: (k: any) => string;
}) {
  const navSections = buildNavSections(t);
  const isPOS = location === "/admin/pos";
  return (
    <div className="space-y-5">
      <Link href="/admin/pos">
        <div onClick={onClose}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm font-black shadow-sm border ${
            isPOS
              ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300"
          }`}
          data-testid="nav-admin-pos">
          <Zap className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{t("nav_pos")}</span>
        </div>
      </Link>

      {navSections.map((section, si) => (
        <div key={si}>
          <div className="text-gray-400 text-[9px] font-bold uppercase tracking-[0.12em] mb-1.5 px-3">
            {section.label}
          </div>
          {section.label === t("nav_sales_section")
            ? <>
                <OrdersSubmenu counts={orderCounts} location={location} navigate={navigate} onClose={onClose} t={t} salesLabel={section.label} />
                {section.items.map(item => renderNavItem(item, location, onClose))}
              </>
            : section.items.map(item => renderNavItem(item, location, onClose))
          }
        </div>
      ))}
    </div>
  );
}

function SidebarHeader({ t }: { t: (k: any) => string }) {
  return (
    <div className="px-3 py-3 border-b border-gray-100">
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-full h-10 rounded-lg overflow-hidden border border-gray-100 bg-white shadow-sm">
          <img src="/logo.jpg" alt="MALAGA PHONE" className="w-full h-full object-contain" />
        </div>
        <div className="text-center">
          <div className="text-gray-900 font-black text-xs tracking-tight leading-tight">MALAGA <span className="text-blue-600">PHONE</span></div>
          <div className="text-gray-400 text-[9px] leading-tight">{t("nav_admin_panel")}</div>
        </div>
      </div>
    </div>
  );
}

function LangSwitcher() {
  const { lang, setLang } = useAdminLang();
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <Languages className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <div className="flex flex-1 rounded-lg overflow-hidden border border-gray-200 text-[10px] font-bold">
        <button
          onClick={() => setLang("fr")}
          className={`flex-1 py-1 transition-all ${lang === "fr" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          data-testid="button-lang-fr"
        >
          FR
        </button>
        <button
          onClick={() => setLang("ar")}
          className={`flex-1 py-1 transition-all ${lang === "ar" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          data-testid="button-lang-ar"
        >
          AR
        </button>
      </div>
    </div>
  );
}

function SidebarFooter({ user, onLogout, t }: { user: any; onLogout: () => void; t: (k: any) => string }) {
  return (
    <div className="p-3 border-t border-gray-100">
      <LangSwitcher />
      <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
        <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center text-white font-black text-xs shrink-0">
          {user?.name?.charAt(0) || "A"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-800 text-xs font-bold truncate leading-tight">{user?.name}</p>
          <p className="text-gray-400 text-[10px] truncate leading-tight">@{user?.username}</p>
        </div>
      </div>
      <Link href="/">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer transition-all text-xs group" data-testid="nav-back-to-store">
          <Home className="w-3.5 h-3.5" />
          <span className="font-medium">{t("nav_back_to_store")}</span>
        </div>
      </Link>
      <button onClick={onLogout}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-all text-xs mt-0.5"
        data-testid="button-admin-logout">
        <LogOut className="w-3.5 h-3.5" />
        <span className="font-medium">{t("nav_logout")}</span>
      </button>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const { t, dir } = useAdminLang();

  const navSections = buildNavSections(t);

  const { data: orderCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/orders/counts"],
    refetchInterval: 30000,
    enabled: !!user && user.role === "admin",
  });

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
        <p className="text-gray-400 text-sm">{t("loading_checking")}</p>
      </div>
    </div>
  );

  if (!user) { navigate("/admin/login"); return null; }
  if (user.role !== "admin") { navigate("/confirmateur/orders"); return null; }

  const currentLabel = location === "/admin/pos"
    ? t("nav_pos")
    : location.startsWith("/admin/orders")
      ? t("nav_orders")
      : navSections.flatMap(s => s.items).find(n => n.href === location)?.label || t("nav_dashboard");

  const handleLogout = async () => { await logout(); navigate("/admin/login"); };

  return (
    <div className="min-h-screen bg-gray-50 flex" dir={dir}>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: dir === "rtl" ? "100%" : "-100%" }}
        animate={{ x: sidebarOpen ? 0 : (dir === "rtl" ? "100%" : "-100%") }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed ${dir === "rtl" ? "right-0" : "left-0"} top-0 bottom-0 w-60 bg-white border-gray-200 z-50 lg:hidden flex flex-col shadow-xl ${dir === "rtl" ? "border-l" : "border-r"}`}
      >
        <SidebarHeader t={t} />
        <nav className="flex-1 p-2.5 overflow-y-auto">
          <NavContent location={location} orderCounts={orderCounts} navigate={navigate} onClose={() => setSidebarOpen(false)} t={t} />
        </nav>
        <SidebarFooter user={user} onLogout={handleLogout} t={t} />
      </motion.aside>

      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:fixed ${dir === "rtl" ? "lg:right-0" : "lg:left-0"} lg:top-0 lg:bottom-0 lg:w-56 bg-white z-30 shadow-sm ${dir === "rtl" ? "border-l border-gray-200" : "border-r border-gray-200"}`}>
        <SidebarHeader t={t} />
        <nav className="flex-1 p-2.5 overflow-y-auto">
          <NavContent location={location} orderCounts={orderCounts} navigate={navigate} t={t} />
        </nav>
        <SidebarFooter user={user} onLogout={handleLogout} t={t} />
      </div>

      {/* Main area */}
      <div className={`flex-1 ${dir === "rtl" ? "lg:mr-56" : "lg:ml-56"}`}>
        {/* Top header */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 h-12 flex items-center justify-between px-4 sm:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400 hidden sm:block">MALAGA PHONE</span>
              <span className="text-gray-300 hidden sm:block">/</span>
              <span className="text-gray-700 font-semibold">{currentLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all relative">
              <Bell className="w-4 h-4" />
              {(orderCounts.new || 0) > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              )}
            </button>
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center text-white font-black text-xs shadow-sm">
              {user?.name?.charAt(0) || "A"}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 min-h-[calc(100vh-3rem)]">{children}</main>
      </div>
    </div>
  );
}
