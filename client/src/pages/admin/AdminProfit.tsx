import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, Users, BarChart3, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import AdminLayout from "./AdminLayout";
import type { ProfitRecord } from "@shared/schema";
import { useAdminLang } from "@/context/AdminLangContext";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("ar-DZ").format(Math.round(v)) + " د.ج";
}
function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}
function shortId(id: string) { return "#" + id.slice(-6).toUpperCase(); }

function KPI({ icon: Icon, label, value, sub, iconBg, iconColor }: {
  icon: any; label: string; value: string; sub?: string; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900 leading-none mb-1.5">{value}</p>
      <p className="text-gray-500 text-xs font-medium">{label}</p>
      {sub && <p className="text-gray-400 text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminProfit() {
  const { t } = useAdminLang();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "month" | "custom">("all");

  const { data: records = [], isLoading } = useQuery<ProfitRecord[]>({ queryKey: ["/api/profit"] });

  const thisMonth = () => {
    const now = new Date();
    setDateFrom(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    setDateTo(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`);
    setActiveFilter("month");
  };
  const clearFilter = () => { setDateFrom(""); setDateTo(""); setActiveFilter("all"); };

  const filtered = useMemo(() => {
    if (!dateFrom && !dateTo) return records;
    return records.filter(r => {
      const d = new Date(r.createdAt!);
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [records, dateFrom, dateTo]);

  const totalRevenue   = filtered.reduce((s, r) => s + parseFloat(r.revenue as string || "0"), 0);
  const totalCost      = filtered.reduce((s, r) => s + parseFloat(r.productCost as string || "0"), 0);
  const totalExpenses  = filtered.reduce((s, r) => s + parseFloat(r.allocatedExpenses as string || "0"), 0);
  const totalNetProfit = filtered.reduce((s, r) => s + parseFloat(r.netProfit as string || "0"), 0);
  const totalPartner   = filtered.reduce((s, r) => s + parseFloat(r.partnerShare as string || "0"), 0);
  const totalOwner     = filtered.reduce((s, r) => s + parseFloat(r.ownerShare as string || "0"), 0);
  const margin = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : "0";

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-black text-gray-900">{t("profit_title")}</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            {filtered.length} {t("status_delivered")}
            {(dateFrom || dateTo) && <span className="text-blue-600 font-medium"> • {t("filter_custom")}</span>}
          </p>
        </div>

        {/* Date Filter */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700 text-sm font-semibold">{t("filter_custom")}</span>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-gray-500 text-xs block mb-1">{t("from_date")}</Label>
                <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setActiveFilter("custom"); }}
                  className="bg-white border-gray-200 text-gray-900 text-sm h-8 w-36" data-testid="input-date-from" />
              </div>
              <div>
                <Label className="text-gray-500 text-xs block mb-1">{t("to_date")}</Label>
                <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setActiveFilter("custom"); }}
                  className="bg-white border-gray-200 text-gray-900 text-sm h-8 w-36" data-testid="input-date-to" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={thisMonth}
                className={`text-xs h-8 ${activeFilter === "month" ? "bg-blue-600 text-white" : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"}`}
                data-testid="button-filter-month">{t("filter_this_month")}</Button>
              {(dateFrom || dateTo) && (
                <Button size="sm" variant="outline" onClick={clearFilter}
                  className="border-gray-200 text-gray-500 hover:bg-gray-50 text-xs h-8" data-testid="button-filter-clear">{t("cancel")}</Button>
              )}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : <>
            <KPI icon={DollarSign} label={t("total_revenue")} value={formatCurrency(totalRevenue)} sub={`${filtered.length} ${t("nav_orders")}`} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <KPI icon={TrendingUp} label={t("net_profit")} value={formatCurrency(totalNetProfit)} sub={`${t("margin")} ${margin}%`} iconBg="bg-teal-50" iconColor="text-teal-600" />
            <KPI icon={Users} label={t("partner_share")} value={formatCurrency(totalPartner)} sub="33.33%" iconBg="bg-pink-50" iconColor="text-pink-600" />
            <KPI icon={Users} label={t("owner_share")} value={formatCurrency(totalOwner)} sub="66.67%" iconBg="bg-indigo-50" iconColor="text-indigo-600" />
          </>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Summary */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <h3 className="text-gray-800 text-sm font-bold flex items-center gap-2 mb-4 pb-2.5 border-b border-gray-100">
              <BarChart3 className="w-4 h-4 text-blue-600" /> {t("profit_title")}
            </h3>
            {isLoading ? <Skeleton className="h-40 rounded-lg" /> : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs">
                  <span className="text-gray-600 font-medium">{t("revenue_label")}</span>
                  <span className="text-emerald-700 font-bold">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs">
                  <span className="text-gray-600 font-medium">{t("cost_col")}</span>
                  <span className="text-red-600 font-bold">− {formatCurrency(totalCost)}</span>
                </div>
                {totalExpenses > 0 && (
                  <div className="flex items-center justify-between p-2.5 bg-orange-50 border border-orange-100 rounded-lg text-xs">
                    <span className="text-gray-600 font-medium">{t("expenses_col")}</span>
                    <span className="text-orange-700 font-bold">− {formatCurrency(totalExpenses)}</span>
                  </div>
                )}
                <div className="h-px bg-gray-100 my-1" />
                <div className="flex items-center justify-between p-2.5 bg-teal-50 border border-teal-200 rounded-lg text-sm">
                  <div>
                    <p className="text-teal-700 font-bold">{t("net_profit")}</p>
                    <p className="text-teal-600/60 text-[10px]">{t("margin")} {margin}%</p>
                  </div>
                  <span className="text-teal-700 font-black">{formatCurrency(totalNetProfit)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-pink-50 border border-pink-100 rounded-lg text-center">
                    <p className="text-pink-600 text-[10px] font-semibold mb-1">{t("partner_share")}</p>
                    <p className="text-pink-700 font-black text-sm">{formatCurrency(totalPartner)}</p>
                  </div>
                  <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-center">
                    <p className="text-indigo-600 text-[10px] font-semibold mb-1">{t("owner_share")}</p>
                    <p className="text-indigo-700 font-black text-sm">{formatCurrency(totalOwner)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detailed Records */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm lg:col-span-2 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-gray-800 text-sm font-bold">{t("profit_sub")} ({filtered.length})</h3>
            </div>
            {isLoading ? <div className="p-4"><Skeleton className="h-40 rounded-lg" /></div> :
              filtered.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-5 h-5 text-gray-300" />
                  </div>
                  <p className="text-gray-600 text-sm font-semibold">{t("no_profit_records")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                        <th className="text-start p-3 font-semibold">{t("order_ref")}</th>
                        <th className="text-start p-3 font-semibold">{t("date")}</th>
                        <th className="text-start p-3 font-semibold">{t("revenue_col")}</th>
                        <th className="text-start p-3 font-semibold hidden md:table-cell">{t("cost_col")}</th>
                        <th className="text-start p-3 font-semibold hidden lg:table-cell">{t("expenses_col")}</th>
                        <th className="text-start p-3 font-semibold">{t("net_profit_col")}</th>
                        <th className="text-start p-3 font-semibold hidden sm:table-cell">{t("partner_col")}</th>
                        <th className="text-start p-3 font-semibold hidden md:table-cell">{t("owner_col")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(r => {
                        const np = parseFloat(r.netProfit as string);
                        return (
                          <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors" data-testid={`row-profit-${r.id}`}>
                            <td className="p-3 font-mono text-gray-400">{shortId(r.orderId)}</td>
                            <td className="p-3 text-gray-500">{formatDate(r.createdAt?.toString())}</td>
                            <td className="p-3 text-emerald-700 font-semibold">{formatCurrency(parseFloat(r.revenue as string))}</td>
                            <td className="p-3 text-red-600 hidden md:table-cell">− {formatCurrency(parseFloat(r.productCost as string))}</td>
                            <td className="p-3 text-orange-700 hidden lg:table-cell">
                              {parseFloat(r.allocatedExpenses as string) > 0
                                ? `− ${formatCurrency(parseFloat(r.allocatedExpenses as string))}`
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="p-3">
                              <span className={`font-bold ${np >= 0 ? "text-teal-700" : "text-red-600"}`}>
                                {formatCurrency(np)}
                              </span>
                            </td>
                            <td className="p-3 text-pink-600 hidden sm:table-cell">{formatCurrency(parseFloat(r.partnerShare as string))}</td>
                            <td className="p-3 text-indigo-600 hidden md:table-cell">{formatCurrency(parseFloat(r.ownerShare as string))}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-blue-50 border-t border-blue-100 font-bold text-xs">
                        <td className="p-3 text-gray-700" colSpan={2}>{t("total")}</td>
                        <td className="p-3 text-emerald-700">{formatCurrency(totalRevenue)}</td>
                        <td className="p-3 text-red-600 hidden md:table-cell">− {formatCurrency(totalCost)}</td>
                        <td className="p-3 text-orange-700 hidden lg:table-cell">
                          {totalExpenses > 0 ? `− ${formatCurrency(totalExpenses)}` : "—"}
                        </td>
                        <td className="p-3 text-teal-700">{formatCurrency(totalNetProfit)}</td>
                        <td className="p-3 text-pink-600 hidden sm:table-cell">{formatCurrency(totalPartner)}</td>
                        <td className="p-3 text-indigo-600 hidden md:table-cell">{formatCurrency(totalOwner)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
