import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Truck, Save, Search, Home, Building2, RotateCcw, TrendingUp, TrendingDown, Eye, EyeOff } from "lucide-react";
import { ALGERIAN_WILAYAS, DEFAULT_DELIVERY_PRICES, DeliveryPrices } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import AdminLayout from "./AdminLayout";
import { useAdminLang } from "@/context/AdminLangContext";

export default function AdminDelivery() {
  const { toast } = useToast();
  const { t, dir } = useAdminLang();
  const [search, setSearch] = useState("");
  const [prices, setPrices] = useState<DeliveryPrices>({ ...DEFAULT_DELIVERY_PRICES });
  const [showDeliveryPrice, setShowDeliveryPrice] = useState(true);

  const { data: settings } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });

  useEffect(() => {
    if (settings?.deliveryPrices) {
      try {
        const parsed = JSON.parse(settings.deliveryPrices);
        setPrices({ ...DEFAULT_DELIVERY_PRICES, ...parsed });
      } catch {}
    }
    if (settings?.showDeliveryPrice !== undefined) {
      setShowDeliveryPrice(settings.showDeliveryPrice !== "false");
    }
  }, [settings]);

  const toggleVisibilityMutation = useMutation({
    mutationFn: async (value: boolean) => {
      const res = await apiRequest("PATCH", "/api/settings", { showDeliveryPrice: String(value) });
      return res.json();
    },
    onSuccess: (_, value) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: value ? t("success") : t("success") });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/settings", { deliveryPrices: JSON.stringify(prices) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: t("success") });
    },
    onError: () => toast({ title: t("failed"), variant: "destructive" }),
  });

  const resetToDefault = () => {
    setPrices({ ...DEFAULT_DELIVERY_PRICES });
    toast({ title: t("success") });
  };

  const updatePrice = (wilaya: string, type: "home" | "desk", value: string) => {
    const num = parseInt(value) || 0;
    setPrices(prev => ({ ...prev, [wilaya]: { ...(prev[wilaya] || { home: 0, desk: 0 }), [type]: num } }));
  };

  const filteredWilayas = ALGERIAN_WILAYAS.filter(w => w.includes(search));

  const homeValues = ALGERIAN_WILAYAS.filter(w => (prices[w]?.home || 0) > 0);
  const deskValues = ALGERIAN_WILAYAS.filter(w => (prices[w]?.desk || 0) > 0);
  const avgHome = homeValues.length > 0 ? Math.round(homeValues.reduce((s, w) => s + (prices[w]?.home || 0), 0) / homeValues.length) : 0;
  const avgDesk = deskValues.length > 0 ? Math.round(deskValues.reduce((s, w) => s + (prices[w]?.desk || 0), 0) / deskValues.length) : 0;
  const unavailableCount = ALGERIAN_WILAYAS.filter(w => (prices[w]?.home || 0) === 0 && (prices[w]?.desk || 0) === 0).length;

  return (
    <AdminLayout>
      <div className="space-y-5" dir={dir}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-lg font-black text-gray-900">{t("delivery_title")}</h1>
            <p className="text-gray-500 text-xs mt-0.5">{t("delivery_sub")}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { const v = !showDeliveryPrice; setShowDeliveryPrice(v); toggleVisibilityMutation.mutate(v); }}
              disabled={toggleVisibilityMutation.isPending}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all text-sm font-medium ${showDeliveryPrice ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-gray-200 bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              data-testid="button-toggle-delivery-visibility">
              {showDeliveryPrice ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showDeliveryPrice ? t("visible") : t("hidden")}
            </button>
            <button onClick={resetToDefault}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all text-sm font-medium"
              data-testid="button-reset-delivery">
              <RotateCcw className="w-4 h-4" /> {t("reset")}
            </button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm text-sm" data-testid="button-save-delivery">
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center">
                <Home className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-gray-500 text-sm">{t("home_delivery")}</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{avgHome} <span className="text-sm text-gray-400 font-normal">{t("dzd")}</span></p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-gray-500 text-sm">{t("office_delivery")}</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{avgDesk} <span className="text-sm text-gray-400 font-normal">{t("dzd")}</span></p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-gray-500 text-sm">{t("unavailable")}</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{unavailableCount} <span className="text-sm text-gray-400 font-normal">{t("wilaya")}</span></p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder={t("search")} value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl ps-10 pe-4 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 text-sm"
                data-testid="input-delivery-search" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-start py-3 px-4 text-gray-500 font-semibold text-xs">#</th>
                  <th className="text-start py-3 px-4 text-gray-500 font-semibold text-xs">{t("wilaya")}</th>
                  <th className="text-start py-3 px-4 text-gray-500 font-semibold text-xs">
                    <span className="flex items-center gap-1.5"><Home className="w-3.5 h-3.5 text-emerald-600" />{t("home_delivery")} ({t("dzd")})</span>
                  </th>
                  <th className="text-start py-3 px-4 text-gray-500 font-semibold text-xs">
                    <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-blue-600" />{t("office_delivery")} ({t("dzd")})</span>
                  </th>
                  <th className="text-start py-3 px-4 text-gray-500 font-semibold text-xs">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredWilayas.map((wilaya) => {
                  const wp = prices[wilaya] || { home: 0, desk: 0 };
                  const isUnavailable = wp.home === 0 && wp.desk === 0;
                  const globalIdx = ALGERIAN_WILAYAS.indexOf(wilaya) + 1;
                  return (
                    <tr key={wilaya} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors" data-testid={`row-delivery-${wilaya}`}>
                      <td className="py-2.5 px-4"><span className="text-gray-400 text-xs font-mono">{String(globalIdx).padStart(2, "0")}</span></td>
                      <td className="py-2.5 px-4"><span className="text-gray-800 font-semibold text-sm">{wilaya}</span></td>
                      <td className="py-2.5 px-4">
                        <input type="number" min="0" max="9999" value={wp.home}
                          onChange={e => updatePrice(wilaya, "home", e.target.value)}
                          className="w-28 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 text-center"
                          data-testid={`input-home-${wilaya}`} />
                      </td>
                      <td className="py-2.5 px-4">
                        <input type="number" min="0" max="9999" value={wp.desk}
                          onChange={e => updatePrice(wilaya, "desk", e.target.value)}
                          className="w-28 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 text-center"
                          data-testid={`input-desk-${wilaya}`} />
                      </td>
                      <td className="py-2.5 px-4">
                        {isUnavailable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 text-xs rounded-lg font-medium">
                            <TrendingDown className="w-3 h-3" /> {t("unavailable")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs rounded-lg font-medium">
                            <TrendingUp className="w-3 h-3" /> {t("available")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredWilayas.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">{t("no_results")}</div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
            <span className="text-gray-500 text-sm">{filteredWilayas.length} {t("wilaya")}</span>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm text-sm">
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
