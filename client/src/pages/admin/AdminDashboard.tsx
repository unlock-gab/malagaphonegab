import AdminLayout from "./AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Package, ShoppingCart, TrendingUp, AlertTriangle, DollarSign,
  Users, ArrowUpRight, ArrowDownRight, Clock, Truck, Activity,
  BarChart3, ChevronRight, CreditCard,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ORDER_STATUSES } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAdminLang } from "@/context/AdminLangContext";

interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  newOrdersCount: number;
  totalRevenue: number;
  netProfit: number;
  partnerShare: number;
  ownerShare: number;
  totalClientCredit: number;
  recentOrders: any[];
  lowStockProducts: any[];
  recentMovements: any[];
  recentPurchases: any[];
  monthlyRevenue: { month: string; revenue: number; profit: number }[];
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("fr-FR", { style: "decimal", maximumFractionDigits: 0 }).format(v) + " DA";
}

function KpiCard({ icon: Icon, label, value, sub, iconBg, iconColor, href }: {
  icon: any; label: string; value: string | number; sub?: string;
  iconBg: string; iconColor: string; href?: string;
}) {
  const content = (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100" />
      </div>
      <p className="text-2xl font-black text-gray-900 leading-none mb-1.5">{value}</p>
      <p className="text-gray-500 text-xs font-medium">{label}</p>
      {sub && <p className="text-gray-400 text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUSES.find(s => s.key === status);
  if (!s) return <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ${s.badge}`}>
      <span className={`w-1 h-1 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function PanelHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel?: string }) {
  const { t } = useAdminLang();
  return (
    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-100">
      <h3 className="text-gray-800 text-sm font-bold">{title}</h3>
      <Link href={href}>
        <span className="text-gray-400 hover:text-blue-600 text-xs transition-colors flex items-center gap-0.5">
          {linkLabel || t("view_all")}
          <ChevronRight className="w-3 h-3" />
        </span>
      </Link>
    </div>
  );
}

export default function AdminDashboard() {
  const { t, dir } = useAdminLang();
  const { data: stats, isLoading } = useQuery<DashboardStats>({ queryKey: ["/api/dashboard"], refetchInterval: 30000 });
  const hasChart = (stats?.monthlyRevenue?.length ?? 0) > 0;

  const MOVEMENT_LABELS: Record<string, { label: string; color: string; icon: any }> = {
    purchase_in:       { label: t("move_purchase_in"),       color: "text-emerald-600", icon: ArrowUpRight },
    order_out:         { label: t("move_order_out"),         color: "text-red-500",     icon: ArrowDownRight },
    return_in:         { label: t("move_return_in"),         color: "text-blue-600",    icon: ArrowUpRight },
    damaged_out:       { label: t("move_damaged_out"),       color: "text-orange-600",  icon: ArrowDownRight },
    manual_adjustment: { label: t("move_manual_adjustment"), color: "text-amber-600",   icon: Activity },
    in:                { label: t("move_in"),                color: "text-emerald-600", icon: ArrowUpRight },
    out:               { label: t("move_out"),               color: "text-red-500",     icon: ArrowDownRight },
    adjustment:        { label: t("move_adjustment"),        color: "text-amber-600",   icon: Activity },
  };

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return t("now_label");
    if (m < 60) return `${t("ago")} ${m}${t("minutes")}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${t("ago")} ${h}${t("hours")}`;
    return `${t("ago")} ${Math.floor(h / 24)}${t("days")}`;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg" dir={dir}>
        <p className="text-gray-700 font-semibold mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-gray-600">
              {p.name === "revenue" ? t("revenue_label") : t("profit_label")}: <strong>{formatCurrency(p.value)}</strong>
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">{t("dashboard_title")}</h1>
            <p className="text-gray-500 text-xs mt-0.5">{t("dashboard_sub")}</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
            <Activity className="w-3 h-3 text-emerald-500" />
            <span>{t("live")}</span>
          </div>
        </div>

        {/* KPI Cards — top row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            : <>
              <KpiCard icon={DollarSign}    label={t("total_revenue")}    value={formatCurrency(stats?.totalRevenue ?? 0)}  iconBg="bg-emerald-50" iconColor="text-emerald-600" sub={t("from_delivered")} href="/admin/profit" />
              <KpiCard icon={TrendingUp}    label={t("net_profit")}       value={formatCurrency(stats?.netProfit ?? 0)}     iconBg="bg-violet-50"  iconColor="text-violet-600" href="/admin/profit" />
              <KpiCard icon={ShoppingCart}  label={t("new_orders")}       value={stats?.newOrdersCount ?? 0}                iconBg="bg-blue-50"    iconColor="text-blue-600"   sub={t("awaiting_confirmation")} href="/admin/orders" />
              <KpiCard icon={AlertTriangle} label={t("low_stock")}        value={stats?.lowStockCount ?? 0}                 iconBg="bg-amber-50"   iconColor="text-amber-600"  sub={t("near_out_of_stock")} href="/admin/inventory" />
            </>
          }
        </div>

        {/* KPI Cards — second row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            : <>
              <KpiCard icon={Package}    label={t("total_products")}         value={stats?.totalProducts ?? 0}              iconBg="bg-slate-100"  iconColor="text-slate-600"  href="/admin/products" />
              <KpiCard icon={Truck}      label={t("recent_purchases_count")} value={stats?.recentPurchases?.length ?? 0} iconBg="bg-orange-50"  iconColor="text-orange-600" sub={t("purchase_invoice")} href="/admin/purchases" />
              <KpiCard icon={Users}      label={t("partner_share")}          value={formatCurrency(stats?.partnerShare ?? 0)} iconBg="bg-pink-50"  iconColor="text-pink-600" href="/admin/profit" />
              <KpiCard icon={CreditCard} label="Crédit Client"               value={formatCurrency(stats?.totalClientCredit ?? 0)} iconBg="bg-red-50" iconColor="text-red-600" href="/admin/client-credits" />
            </>
          }
        </div>

        {/* Revenue Chart */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-gray-800 text-sm font-bold">{t("monthly_revenue_profit")}</h3>
              <p className="text-gray-400 text-[10px] mt-0.5">{t("monthly_chart_sub")}</p>
            </div>
            <BarChart3 className="w-4 h-4 text-gray-300" />
          </div>
          {isLoading ? (
            <Skeleton className="h-44 rounded-xl" />
          ) : !hasChart ? (
            <div className="flex flex-col items-center justify-center h-44 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                <BarChart3 className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-gray-500 text-xs font-medium">{t("no_data_yet")}</p>
              <p className="text-gray-400 text-[10px] mt-1">{t("chart_first_delivery")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.monthlyRevenue ?? []} barGap={4} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} width={55}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[3, 3, 0, 0]} name="revenue" opacity={0.85} />
                <Bar dataKey="profit"  fill="#059669" radius={[3, 3, 0, 0]} name="profit"  opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom 3 panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* Recent Orders */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <PanelHeader title={t("recent_orders_title")} href="/admin/orders" />
            <div className="space-y-1.5">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
                : !stats?.recentOrders?.length
                  ? <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-2">
                        <ShoppingCart className="w-4 h-4 text-gray-300" />
                      </div>
                      <p className="text-gray-400 text-xs font-medium">{t("no_orders_yet")}</p>
                    </div>
                  : stats.recentOrders.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-800 text-xs font-semibold truncate">{o.customerName}</p>
                        <p className="text-gray-400 text-[10px]">{o.wilaya} · {formatCurrency(parseFloat(o.total || "0"))}</p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <PanelHeader title={t("stock_alerts")} href="/admin/inventory" linkLabel={t("manage")} />
            <div className="space-y-1.5">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
                : !stats?.lowStockProducts?.length
                  ? <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-2">
                        <Package className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-gray-600 text-xs font-medium">{t("stock_ok")}</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">{t("no_low_stock")}</p>
                    </div>
                  : stats.lowStockProducts.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100">
                      <p className="text-gray-700 text-xs font-medium truncate flex-1 me-2">{p.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                        p.stock === 0
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {p.stock === 0 ? t("out_of_stock") : `${p.stock} ${t("remaining")}`}
                      </span>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Recent Inventory Movements */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <PanelHeader title={t("stock_movements_title")} href="/admin/inventory" />
            <div className="space-y-1.5">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
                : !stats?.recentMovements?.length
                  ? <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-2">
                        <Clock className="w-4 h-4 text-gray-300" />
                      </div>
                      <p className="text-gray-400 text-xs">{t("no_movements_yet")}</p>
                    </div>
                  : stats.recentMovements.map((m: any) => {
                      const cfg = MOVEMENT_LABELS[m.type] ?? MOVEMENT_LABELS.adjustment;
                      const MIcon = cfg.icon;
                      return (
                        <div key={m.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-100">
                          <MIcon className={`w-3.5 h-3.5 shrink-0 ${cfg.color}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-gray-700 text-xs truncate font-medium">{m.productName}</p>
                            <p className="text-gray-400 text-[10px]">{cfg.label} · {timeAgo(m.createdAt)}</p>
                          </div>
                          <span className={`text-xs font-bold shrink-0 ${m.quantity > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {m.quantity > 0 ? "+" : ""}{m.quantity}
                          </span>
                        </div>
                      );
                    })
              }
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
