import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, TrendingUp, Package, DollarSign, Percent,
  Calendar, Download, ChevronDown, ShoppingCart,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";

interface TopProductRow {
  productId: string | null;
  productName: string;
  qtySold: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("ar-DZ").format(Math.round(v)) + " د.ج";
}

const PRESETS = [
  { label: "آخر 7 أيام", days: 7 },
  { label: "آخر 30 يوماً", days: 30 },
  { label: "آخر 90 يوماً", days: 90 },
  { label: "هذا العام", days: 365 },
  { label: "كل الوقت", days: 0 },
];

function getFromDate(days: number): string {
  if (days === 0) return "";
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export default function AdminReports() {
  const [preset, setPreset] = useState(30);
  const [showPresets, setShowPresets] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const from = useCustom ? customFrom : (preset > 0 ? getFromDate(preset) : "");
  const to = useCustom ? customTo : "";

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const { data: rows = [], isLoading } = useQuery<TopProductRow[]>({
    queryKey: ["/api/reports/top-products", from, to],
    queryFn: async () => {
      const res = await fetch(`/api/reports/top-products?${params}`);
      return res.json();
    },
  });

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalMargin = totalRevenue - totalCost;
  const totalQty = rows.reduce((s, r) => s + r.qtySold, 0);
  const avgMarginPct = totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0;

  const maxRevenue = rows.length > 0 ? Math.max(...rows.map(r => r.revenue)) : 1;

  const presetLabel = useCustom ? "نطاق مخصص" : (PRESETS.find(p => p.days === preset)?.label || "");

  return (
    <AdminLayout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              تقرير المنتجات
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">أكثر المنتجات مبيعاً وهامش الربح لكل منتج</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Preset picker */}
            <div className="relative">
              <button
                onClick={() => setShowPresets(o => !o)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-blue-300 transition-all shadow-sm"
                data-testid="btn-period-picker"
              >
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {presetLabel}
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showPresets && (
                <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 min-w-[160px]">
                  {PRESETS.map(p => (
                    <button key={p.days} onClick={() => { setPreset(p.days); setUseCustom(false); setShowPresets(false); }}
                      className={`w-full text-right px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${preset === p.days && !useCustom ? "text-blue-700 font-semibold" : "text-gray-700"}`}>
                      {p.label}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={() => { setUseCustom(true); setShowPresets(false); }}
                    className={`w-full text-right px-4 py-2 text-sm hover:bg-gray-50 ${useCustom ? "text-blue-700 font-semibold" : "text-gray-700"}`}>
                    نطاق مخصص
                  </button>
                </div>
              )}
            </div>

            {useCustom && (
              <div className="flex items-center gap-2">
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
                  data-testid="input-from-date" />
                <span className="text-gray-400 text-sm">—</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
                  data-testid="input-to-date" />
              </div>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: DollarSign, label: "إجمالي الإيرادات", value: formatCurrency(totalRevenue), color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: TrendingUp, label: "إجمالي الربح", value: formatCurrency(totalMargin), color: "text-blue-600", bg: "bg-blue-50" },
            { icon: ShoppingCart, label: "عدد الوحدات المباعة", value: totalQty.toLocaleString("ar"), color: "text-violet-600", bg: "bg-violet-50" },
            { icon: Percent, label: "متوسط هامش الربح", value: `${avgMarginPct}%`, color: "text-amber-600", bg: "bg-amber-50" },
          ].map(card => (
            <div key={card.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              {isLoading ? <Skeleton className="h-6 w-24 mb-1" /> : <p className="text-xl font-black text-gray-900">{card.value}</p>}
              <p className="text-gray-500 text-xs mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-gray-800 text-sm font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              المنتجات الأكثر مبيعاً
              {!isLoading && <span className="text-gray-400 text-xs font-normal">({rows.length} منتج)</span>}
            </h3>
          </div>

          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <BarChart3 className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-gray-500 font-semibold">لا توجد بيانات مبيعات</p>
              <p className="text-gray-400 text-sm mt-0.5">ستظهر البيانات بعد تسليم الطلبات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs">
                    <th className="text-right px-5 py-3 font-semibold w-8">#</th>
                    <th className="text-right px-5 py-3 font-semibold">المنتج</th>
                    <th className="text-right px-5 py-3 font-semibold">الكمية المباعة</th>
                    <th className="text-right px-5 py-3 font-semibold">الإيرادات</th>
                    <th className="text-right px-5 py-3 font-semibold">التكلفة</th>
                    <th className="text-right px-5 py-3 font-semibold">الربح</th>
                    <th className="text-right px-5 py-3 font-semibold">الهامش</th>
                    <th className="px-5 py-3">الأداء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r, i) => (
                    <tr key={r.productId || r.productName} className="hover:bg-gray-50/70 transition-colors" data-testid={`row-product-${i}`}>
                      <td className="px-5 py-3 text-gray-400 text-xs font-bold">{i + 1}</td>
                      <td className="px-5 py-3">
                        <span className="text-gray-800 font-semibold text-sm">{r.productName}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-violet-700 font-bold text-sm">
                          <Package className="w-3.5 h-3.5 text-violet-400" />
                          {r.qtySold}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700 font-semibold">{formatCurrency(r.revenue)}</td>
                      <td className="px-5 py-3 text-gray-500">{formatCurrency(r.cost)}</td>
                      <td className="px-5 py-3">
                        <span className={`font-bold ${r.margin >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                          {formatCurrency(r.margin)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                          r.marginPct >= 30 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          r.marginPct >= 15 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-red-50 text-red-600 border border-red-200"
                        }`}>
                          {r.marginPct}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="w-full max-w-[100px]">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all"
                              style={{ width: `${Math.round((r.revenue / maxRevenue) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Margin guide */}
        <div className="flex items-center gap-4 text-xs text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm flex-wrap">
          <span className="font-semibold text-gray-700">دليل الهامش:</span>
          {[
            { color: "bg-emerald-500", label: "≥ 30% — ممتاز" },
            { color: "bg-amber-500", label: "15-29% — جيد" },
            { color: "bg-red-500", label: "< 15% — منخفض" },
          ].map(g => (
            <div key={g.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${g.color}`} />
              <span>{g.label}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
