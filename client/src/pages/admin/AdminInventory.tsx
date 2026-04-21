import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Boxes, ArrowUpRight, ArrowDownRight, RotateCcw, AlertTriangle,
  RefreshCcw, Search, Minus, CheckCircle, XCircle, Package, Smartphone, Edit2, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import { useAdminLang } from "@/context/AdminLangContext";
import type { Product, InventoryMovement, PhoneUnit } from "@shared/schema";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("fr-DZ").format(Math.round(v)) + " DA";
}
function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  const datePart = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  const timePart = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
  return `${datePart} · ${timePart}`;
}

type StockFilter = "all" | "healthy" | "low" | "out";

function MovBadge({ type, getLabel }: { type: string; getLabel: (t: string) => string }) {
  const CONFIG: Record<string, { color: string; bg: string; icon: any; dir: "in" | "out" | "neutral" }> = {
    purchase_in:       { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",  icon: ArrowUpRight,   dir: "in" },
    order_out:         { color: "text-red-600",     bg: "bg-red-50 border-red-200",           icon: ArrowDownRight, dir: "out" },
    return_in:         { color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",         icon: RotateCcw,      dir: "in" },
    damaged_out:       { color: "text-orange-700",  bg: "bg-orange-50 border-orange-200",     icon: ArrowDownRight, dir: "out" },
    manual_adjustment: { color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",       icon: Minus,          dir: "neutral" },
    in:                { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",   icon: ArrowUpRight,   dir: "in" },
    out:               { color: "text-red-600",     bg: "bg-red-50 border-red-200",           icon: ArrowDownRight, dir: "out" },
    order_cancelled:   { color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",         icon: RotateCcw,      dir: "in" },
    purchase_deleted:  { color: "text-red-600",     bg: "bg-red-50 border-red-200",           icon: ArrowDownRight, dir: "out" },
    note:              { color: "text-gray-600",    bg: "bg-gray-50 border-gray-200",         icon: Minus,          dir: "neutral" },
  };
  const cfg = CONFIG[type] ?? { color: "text-gray-600", bg: "bg-gray-100 border-gray-200", icon: Minus };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />{getLabel(type)}
    </span>
  );
}

function EditPhoneUnitForm({ unit, products, onSave, onCancel, saving }: {
  unit: PhoneUnit; products: Product[];
  onSave: (data: any) => void; onCancel: () => void; saving: boolean;
}) {
  const { t, dir } = useAdminLang();
  const [form, setForm] = useState({
    status: unit.status ?? "available",
    batteryHealth: unit.batteryHealth ?? "",
    condition: unit.condition ?? "used_good",
    notes: unit.notes ?? "",
  });
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = "bg-white border-gray-200 text-gray-900 text-sm";

  return (
    <div className="space-y-3 pt-1" dir={dir}>
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs">
        <p className="text-blue-600 font-mono">{unit.imei}</p>
        <p className="text-blue-500 mt-0.5">{products.find(p => p.id === unit.productId)?.name ?? unit.productId}</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-600 text-xs font-semibold">{t("inv_unit_status")}</Label>
        <Select value={form.status} onValueChange={v => setF("status", v)}>
          <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border-gray-200 shadow-lg">
            <SelectItem value="available" className="text-sm">{t("unit_status_available")}</SelectItem>
            <SelectItem value="sold" className="text-sm">{t("unit_status_sold")}</SelectItem>
            <SelectItem value="returned" className="text-sm">{t("unit_status_returned")}</SelectItem>
            <SelectItem value="damaged" className="text-sm">{t("unit_status_damaged")}</SelectItem>
            <SelectItem value="inspection" className="text-sm">{t("unit_status_inspection")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold">{t("inv_battery_pct")}</Label>
          <Input type="number" min="0" max="100" value={form.batteryHealth}
            onChange={e => setF("batteryHealth", e.target.value)}
            placeholder="85" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold">{t("inv_physical_condition")}</Label>
          <Select value={form.condition} onValueChange={v => setF("condition", v)}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-lg">
              <SelectItem value="new" className="text-sm">{t("cond_new")}</SelectItem>
              <SelectItem value="used_good" className="text-sm">{t("cond_used_good")}</SelectItem>
              <SelectItem value="used_acceptable" className="text-sm">{t("cond_used_acceptable")}</SelectItem>
              <SelectItem value="refurbished" className="text-sm">{t("cond_refurbished")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-600 text-xs font-semibold">{t("inv_notes")}</Label>
        <Textarea value={form.notes} onChange={e => setF("notes", e.target.value)}
          className={`${inputCls} resize-none`} rows={2} placeholder={t("inv_notes_ph")} />
      </div>

      <DialogFooter className="gap-2 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel} className="border-gray-200 text-gray-600 text-sm">{t("cancel")}</Button>
        <Button onClick={() => onSave(form)} disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
          {saving ? t("inv_saving") : t("inv_save")}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminInventory() {
  const { t, dir } = useAdminLang();
  const { toast } = useToast();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [movSearch, setMovSearch] = useState("");
  const [movTypeFilter, setMovTypeFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [adj, setAdj] = useState({ productId: "", quantity: "", type: "in" as string, notes: "" });

  const [unitSearch, setUnitSearch] = useState("");
  const [unitStatusFilter, setUnitStatusFilter] = useState("all");
  const [editingUnit, setEditingUnit] = useState<PhoneUnit | null>(null);

  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: movements = [], isLoading: loadingMovements } = useQuery<InventoryMovement[]>({ queryKey: ["/api/inventory/movements"] });
  const { data: phoneUnits = [], isLoading: loadingUnits } = useQuery<PhoneUnit[]>({ queryKey: ["/api/phone-units"] });

  const adjustMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/inventory/adjust", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setAdjustOpen(false);
      setAdj({ productId: "", quantity: "", type: "in", notes: "" });
      toast({ title: t("stock_adjusted") });
    },
    onError: () => toast({ title: t("adjustment_failed"), variant: "destructive" }),
  });

  const updateUnitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/phone-units/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phone-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditingUnit(null);
      toast({ title: t("unit_updated") });
    },
    onError: () => toast({ title: t("update_unit_failed"), variant: "destructive" }),
  });

  const deleteUnitMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/phone-units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phone-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: t("unit_deleted") });
    },
    onError: () => toast({ title: t("delete_unit_failed"), variant: "destructive" }),
  });

  const movLabel = (type: string) => {
    const map: Record<string, string> = {
      purchase_in: t("mov_purchase_in"),
      order_out: t("mov_order_out"),
      return_in: t("mov_return_in"),
      damaged_out: t("mov_damaged_out"),
      manual_adjustment: t("mov_manual"),
      in: t("mov_purchase_in"),
      out: t("mov_order_out"),
      order_cancelled: t("mov_return_in"),
      purchase_deleted: t("mov_order_out"),
      note: "Note",
    };
    return map[type] ?? type;
  };

  const unitStatusLabel = (k: string) => {
    const map: Record<string, string> = {
      available: t("unit_status_available"),
      sold: t("unit_status_sold"),
      returned: t("unit_status_returned"),
      damaged: t("unit_status_damaged"),
      inspection: t("unit_status_inspection"),
    };
    return map[k] ?? k;
  };

  const unitStatusCls: Record<string, string> = {
    available:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    sold:       "bg-blue-50 text-blue-700 border-blue-200",
    returned:   "bg-amber-50 text-amber-700 border-amber-200",
    damaged:    "bg-red-50 text-red-600 border-red-200",
    inspection: "bg-purple-50 text-purple-700 border-purple-200",
  };

  const filteredUnits = phoneUnits.filter(u => {
    const matchSearch = !unitSearch ||
      (u.imei ?? "").includes(unitSearch) ||
      (u.supplierName ?? "").toLowerCase().includes(unitSearch.toLowerCase());
    const matchStatus = unitStatusFilter === "all" || u.status === unitStatusFilter;
    return matchSearch && matchStatus;
  });

  const unitProductName = (productId: string | null) => {
    if (!productId) return "—";
    return products.find(p => p.id === productId)?.name ?? productId;
  };

  const lastMovementByProduct: Record<string, string> = {};
  const lastMovTypeByProduct: Record<string, string> = {};
  movements.forEach(m => {
    if (!lastMovementByProduct[m.productId] || new Date(m.createdAt!) > new Date(lastMovementByProduct[m.productId])) {
      lastMovementByProduct[m.productId] = m.createdAt!.toString();
      lastMovTypeByProduct[m.productId] = m.type;
    }
  });

  const imeiSearchTerm = productSearch.trim();
  const imeiMatchMap: Record<string, string[]> = {};
  if (imeiSearchTerm.length >= 3) {
    phoneUnits.forEach(u => {
      if (u.imei.toLowerCase().includes(imeiSearchTerm.toLowerCase())) {
        if (!imeiMatchMap[u.productId!]) imeiMatchMap[u.productId!] = [];
        imeiMatchMap[u.productId!].push(u.imei);
      }
    });
  }

  const filteredProducts = products.filter(p => {
    const matchName = !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(productSearch.toLowerCase());
    const matchImei = !!imeiMatchMap[p.id];
    const matchSearch = matchName || matchImei;
    const min = p.minStock ?? 3;
    const matchStock =
      stockFilter === "all" ? true :
      stockFilter === "healthy" ? p.stock > min :
      stockFilter === "low" ? p.stock > 0 && p.stock <= min :
      stockFilter === "out" ? p.stock === 0 : true;
    const matchType = typeFilter === "all" || p.productType === typeFilter;
    return matchSearch && matchStock && matchType;
  });

  const filteredMovements = movements.filter(m => {
    const matchSearch = !movSearch ||
      m.productName.toLowerCase().includes(movSearch.toLowerCase()) ||
      (m.reference ?? "").toLowerCase().includes(movSearch.toLowerCase());
    const matchType = movTypeFilter === "all" || m.type === movTypeFilter;
    return matchSearch && matchType;
  });

  const outOfStock = products.filter(p => p.stock === 0).length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.minStock ?? 3)).length;
  const healthy = products.filter(p => p.stock > (p.minStock ?? 3)).length;
  const totalValue = products.reduce((s, p) => s + parseFloat(p.costPrice?.toString() || "0") * p.stock, 0);

  const stockFilterBtns = [
    { key: "all" as StockFilter,     label: t("stock_health_all"),  count: products.length, cls: "text-gray-600 border-gray-200 bg-white",           activeCls: "bg-blue-600 text-white border-blue-600" },
    { key: "healthy" as StockFilter, label: t("stock_health_good"), count: healthy,         cls: "text-emerald-700 border-emerald-200 bg-emerald-50", activeCls: "bg-emerald-600 text-white border-emerald-600" },
    { key: "low" as StockFilter,     label: t("stock_health_low"),  count: lowStock,        cls: "text-amber-700 border-amber-200 bg-amber-50",       activeCls: "bg-amber-600 text-white border-amber-600" },
    { key: "out" as StockFilter,     label: t("stock_health_out"),  count: outOfStock,      cls: "text-red-600 border-red-200 bg-red-50",             activeCls: "bg-red-600 text-white border-red-600" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4" dir={dir}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">{t("inventory_title")}</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {products.length} •{" "}
              <span className="text-emerald-600">{healthy} {t("stock_good")}</span>{" "}
              {lowStock > 0 && <><span className="text-gray-400">•</span> <span className="text-amber-600">{lowStock} {t("stock_low_label")}</span></>}{" "}
              {outOfStock > 0 && <><span className="text-gray-400">•</span> <span className="text-red-600">{outOfStock} {t("stock_out_label")}</span></>}{" "}
              • {t("inv_value")} <span className="text-blue-700 font-semibold">{formatCurrency(totalValue)}</span>
            </p>
          </div>
          <Button onClick={() => setAdjustOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm shadow-sm" data-testid="button-adjust-stock">
            <RefreshCcw className="w-4 h-4" /> {t("adjust_stock")}
          </Button>
        </div>

        {/* Low stock alert */}
        {(lowStock > 0 || outOfStock > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-amber-700 font-semibold text-sm">{lowStock + outOfStock} {t("products_need_attention")}</p>
              <p className="text-amber-600/80 text-xs mt-0.5 truncate">
                {products.filter(p => p.stock <= (p.minStock ?? 3)).map(p => p.name).join(" • ")}
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="products">
          <TabsList className="bg-gray-100 border border-gray-200">
            <TabsTrigger value="products" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-500 text-xs gap-1.5">
              <Boxes className="w-3.5 h-3.5" /> {t("tab_stock_table")}
            </TabsTrigger>
            <TabsTrigger value="movements" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-500 text-xs gap-1.5">
              <RefreshCcw className="w-3.5 h-3.5" /> {t("tab_movements")}
            </TabsTrigger>
            <TabsTrigger value="phone-units" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-500 text-xs gap-1.5">
              <Smartphone className="w-3.5 h-3.5" /> {t("tab_imei_units")}
              {phoneUnits.filter(u => u.status === "available").length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[10px] px-1 rounded-full">
                  {phoneUnits.filter(u => u.status === "available").length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* PRODUCTS TAB */}
          <TabsContent value="products" className="mt-4 space-y-3">
            <div className="flex gap-1.5 flex-wrap">
              {([
                { key: "all",       label: t("stock_filter_all"),     count: products.length },
                { key: "phone",     label: t("stock_filter_phones"),   count: products.filter(p => p.productType === "phone").length },
                { key: "tablet",    label: t("stock_filter_tablets"),  count: products.filter(p => p.productType === "tablet").length },
                { key: "accessory", label: t("stock_filter_acc"),      count: products.filter(p => p.productType === "accessory").length },
                { key: "other",     label: t("stock_filter_other"),    count: products.filter(p => p.productType === "other").length },
              ] as { key: string; label: string; count: number }[]).filter(b => b.count > 0 || b.key === "all").map(btn => (
                <button key={btn.key} onClick={() => setTypeFilter(btn.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    typeFilter === btn.key
                      ? "bg-blue-600 text-white border-blue-600"
                      : "text-gray-600 border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                  {btn.label} <span className="opacity-60 mr-1">{btn.count}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {stockFilterBtns.map(btn => (
                <button key={btn.key} onClick={() => setStockFilter(btn.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    stockFilter === btn.key ? btn.activeCls : btn.cls + " hover:border-gray-300"
                  }`}>
                  {btn.label} <span className="opacity-60 mr-1">{btn.count}</span>
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                placeholder={t("search_stock")} className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pr-9 text-sm h-9" />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs">
                      <th className="text-right p-3 font-semibold min-w-48">{t("col_product")}</th>
                      <th className="text-center p-3 font-semibold">{t("col_stock")}</th>
                      <th className="text-center p-3 font-semibold hidden sm:table-cell">{t("col_min_stock")}</th>
                      <th className="text-right p-3 font-semibold hidden md:table-cell">{t("col_unit_cost")}</th>
                      <th className="text-right p-3 font-semibold hidden lg:table-cell">{t("col_total_value")}</th>
                      <th className="text-right p-3 font-semibold hidden xl:table-cell">{t("col_last_move")}</th>
                      <th className="text-center p-3 font-semibold">{t("col_stock_status")}</th>
                      <th className="text-center p-3 font-semibold w-16">{t("col_adjust")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingProducts
                      ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td colSpan={8} className="p-3"><Skeleton className="h-7 rounded-md" /></td>
                        </tr>
                      ))
                      : filteredProducts.length === 0
                        ? <tr><td colSpan={8} className="text-center py-12">
                            <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">{t("no_matching_products")}</p>
                          </td></tr>
                        : filteredProducts.map(p => {
                          const cost = parseFloat(p.costPrice?.toString() || "0");
                          const isLow = p.stock > 0 && p.stock <= (p.minStock ?? 3);
                          const isOut = p.stock === 0;
                          const lastMov = lastMovementByProduct[p.id];
                          const lastMovType = lastMovTypeByProduct[p.id];
                          return (
                            <tr key={p.id} className={`border-b border-gray-50 transition-colors ${isOut ? "bg-red-50/40" : isLow ? "bg-amber-50/40" : "hover:bg-gray-50/70"}`}
                              data-testid={`row-inventory-${p.id}`}>
                              <td className="p-3">
                                <p className="text-gray-800 text-sm font-medium truncate max-w-48">{p.name}</p>
                                {p.sku && <p className="text-gray-400 text-[10px] font-mono">{p.sku}</p>}
                                {imeiMatchMap[p.id] && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {imeiMatchMap[p.id].map((imei, i) => (
                                      <span key={i} className="inline-flex items-center gap-1 font-mono text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">
                                        <Smartphone className="w-2.5 h-2.5" />{imei}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`font-black text-xl ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-gray-900"}`}>
                                  {p.stock}
                                </span>
                              </td>
                              <td className="p-3 text-center text-gray-500 text-sm hidden sm:table-cell">{p.minStock ?? 3}</td>
                              <td className="p-3 text-gray-500 text-xs hidden md:table-cell">{cost > 0 ? formatCurrency(cost) : "—"}</td>
                              <td className="p-3 text-gray-500 text-xs hidden lg:table-cell">
                                {cost > 0 ? formatCurrency(cost * p.stock) : "—"}
                              </td>
                              <td className="p-3 hidden xl:table-cell">
                                {lastMov
                                  ? <div>
                                      <p className="text-gray-400 text-[10px]">{formatDate(lastMov)}</p>
                                      {lastMovType && <MovBadge type={lastMovType} getLabel={movLabel} />}
                                    </div>
                                  : <span className="text-gray-300 text-xs">—</span>
                                }
                              </td>
                              <td className="p-3 text-center">
                                {isOut
                                  ? <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold"><XCircle className="w-3.5 h-3.5" />{t("stock_out_label")}</span>
                                  : isLow
                                    ? <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold"><AlertTriangle className="w-3.5 h-3.5" />{t("stock_low_label")}</span>
                                    : <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3.5 h-3.5" />{t("stock_good")}</span>
                                }
                              </td>
                              <td className="p-3 text-center">
                                <button onClick={() => { setAdj(a => ({ ...a, productId: p.id })); setAdjustOpen(true); }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title={t("col_adjust")}>
                                  <RefreshCcw className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* MOVEMENTS TAB */}
          <TabsContent value="movements" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input value={movSearch} onChange={e => setMovSearch(e.target.value)}
                  placeholder={t("search_movements")} className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pr-9 text-sm h-9" />
              </div>
              <Select value={movTypeFilter} onValueChange={setMovTypeFilter}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-700 w-44 text-xs h-9"><SelectValue placeholder={t("all_movement_types")} /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  <SelectItem value="all" className="text-gray-800 text-sm">{t("all_movement_types")}</SelectItem>
                  <SelectItem value="purchase_in" className="text-gray-800 text-sm">{t("mov_purchase_in")}</SelectItem>
                  <SelectItem value="order_out" className="text-gray-800 text-sm">{t("mov_order_out")}</SelectItem>
                  <SelectItem value="return_in" className="text-gray-800 text-sm">{t("mov_return_in")}</SelectItem>
                  <SelectItem value="damaged_out" className="text-gray-800 text-sm">{t("mov_damaged_out")}</SelectItem>
                  <SelectItem value="manual_adjustment" className="text-gray-800 text-sm">{t("mov_manual")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs">
                    <th className="text-right p-3 font-semibold min-w-40">{t("col_product")}</th>
                    <th className="text-center p-3 font-semibold">{t("col_type")}</th>
                    <th className="text-center p-3 font-semibold">{t("col_quantity")}</th>
                    <th className="text-right p-3 font-semibold hidden sm:table-cell">{t("col_reference")}</th>
                    <th className="text-right p-3 font-semibold hidden md:table-cell">{t("col_notes")}</th>
                    <th className="text-right p-3 font-semibold">{t("col_date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMovements
                    ? Array.from({ length: 6 }).map((_, i) => <tr key={i} className="border-b border-gray-50"><td colSpan={6} className="p-3"><Skeleton className="h-7 rounded-md" /></td></tr>)
                    : filteredMovements.length === 0
                      ? <tr><td colSpan={6} className="text-center py-10 text-gray-500 text-sm">
                          {movSearch || movTypeFilter !== "all" ? t("no_matching_movements") : t("no_movements_hint")}
                        </td></tr>
                      : filteredMovements.map(m => (
                        <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors" data-testid={`row-movement-${m.id}`}>
                          <td className="p-3 text-gray-800 text-xs font-medium">{m.productName}</td>
                          <td className="p-3 text-center"><MovBadge type={m.type} getLabel={movLabel} /></td>
                          <td className="p-3 text-center">
                            <span className={`font-bold text-sm ${m.quantity > 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500 text-xs font-mono hidden sm:table-cell">{m.reference ?? "—"}</td>
                          <td className="p-3 text-gray-500 text-xs hidden md:table-cell max-w-xs truncate">{m.notes ?? "—"}</td>
                          <td className="p-3 text-gray-400 text-xs">{formatDate(m.createdAt?.toString())}</td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* PHONE UNITS TAB */}
          <TabsContent value="phone-units" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input value={unitSearch} onChange={e => setUnitSearch(e.target.value)}
                  placeholder={t("search_imei")} className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pr-9 text-sm h-9 font-mono" />
              </div>
              <Select value={unitStatusFilter} onValueChange={setUnitStatusFilter}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-700 w-40 text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  <SelectItem value="all" className="text-gray-800 text-sm">{t("all_unit_statuses")}</SelectItem>
                  {["available","sold","returned","damaged","inspection"].map(k => (
                    <SelectItem key={k} value={k} className="text-gray-800 text-sm">{unitStatusLabel(k)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
              {["available","sold","returned","damaged","inspection"].map(k => {
                const cnt = phoneUnits.filter(u => u.status === k).length;
                return (
                  <span key={k} className={`px-2 py-1 rounded-full border ${unitStatusCls[k] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    {unitStatusLabel(k)}: <span className="font-bold">{cnt}</span>
                  </span>
                );
              })}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="text-right p-2.5 font-semibold">IMEI</th>
                    <th className="text-right p-2.5 font-semibold min-w-36">{t("col_product")}</th>
                    <th className="text-center p-2.5 font-semibold">{t("col_status")}</th>
                    <th className="text-right p-2.5 font-semibold hidden sm:table-cell">{t("col_supplier")}</th>
                    <th className="text-right p-2.5 font-semibold hidden md:table-cell">{t("col_cost")}</th>
                    <th className="text-center p-2.5 font-semibold hidden lg:table-cell">{t("col_battery")}</th>
                    <th className="text-center p-2.5 font-semibold w-16">{t("col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUnits
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-gray-50"><td colSpan={7} className="p-2.5"><Skeleton className="h-6 rounded" /></td></tr>
                      ))
                    : filteredUnits.length === 0
                      ? <tr><td colSpan={7} className="text-center py-10 text-gray-500">
                          <Smartphone className="w-7 h-7 text-gray-200 mx-auto mb-2" />
                          {unitSearch || unitStatusFilter !== "all" ? t("no_matching_units") : t("no_imei_hint")}
                        </td></tr>
                      : filteredUnits.map(u => (
                          <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/70" data-testid={`row-phone-unit-${u.id}`}>
                            <td className="p-2.5 font-mono text-gray-800 text-[11px] tracking-wider">{u.imei}</td>
                            <td className="p-2.5 text-gray-700">{unitProductName(u.productId)}</td>
                            <td className="p-2.5 text-center">
                              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${unitStatusCls[u.status ?? "available"] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                {unitStatusLabel(u.status ?? "available")}
                              </span>
                            </td>
                            <td className="p-2.5 text-gray-500 hidden sm:table-cell">{u.supplierName ?? "—"}</td>
                            <td className="p-2.5 text-gray-500 hidden md:table-cell">{u.purchaseCost ? formatCurrency(parseFloat(u.purchaseCost)) : "—"}</td>
                            <td className="p-2.5 text-center hidden lg:table-cell">
                              {u.batteryHealth ? <span className={`font-semibold ${parseInt(u.batteryHealth) >= 80 ? "text-emerald-600" : "text-amber-600"}`}>{u.batteryHealth}%</span> : "—"}
                            </td>
                            <td className="p-2.5 text-center">
                              <button onClick={() => setEditingUnit(u)} className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors mr-1" title={t("edit")}>
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => { if (confirm(t("confirm_delete_unit"))) deleteUnitMutation.mutate(u.id); }}
                                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title={t("delete")}>
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))
                  }
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Phone Unit Dialog */}
        {editingUnit && (
          <Dialog open onOpenChange={o => { if (!o) setEditingUnit(null); }}>
            <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-sm shadow-xl" dir={dir}>
              <DialogHeader className="border-b border-gray-100 pb-3">
                <DialogTitle className="text-gray-900 font-bold text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  {t("edit_imei_unit")}
                </DialogTitle>
              </DialogHeader>
              <EditPhoneUnitForm
                unit={editingUnit}
                products={products}
                onSave={data => updateUnitMutation.mutate({ id: editingUnit.id, data })}
                onCancel={() => setEditingUnit(null)}
                saving={updateUnitMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Adjust Stock Dialog */}
        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md shadow-xl" dir={dir}>
            <DialogHeader className="border-b border-gray-100 pb-3">
              <DialogTitle className="text-gray-900 font-bold">{t("adjust_stock_manual")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-gray-600 text-sm font-semibold">{t("adjust_product")}</Label>
                <Select value={adj.productId} onValueChange={v => setAdj(a => ({ ...a, productId: v }))}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900 text-sm" data-testid="select-adjust-product">
                    <SelectValue placeholder={t("select_product_ph")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 shadow-lg max-h-60">
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-gray-800 text-sm">
                        {p.name} <span className="text-gray-400 mr-2">({p.stock})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-600 text-sm font-semibold">{t("adjust_type")}</Label>
                  <Select value={adj.type} onValueChange={v => setAdj(a => ({ ...a, type: v }))}>
                    <SelectTrigger className="bg-white border-gray-200 text-gray-900 text-sm" data-testid="select-adjust-type"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-lg">
                      <SelectItem value="in" className="text-gray-800 text-sm">{t("adj_in")}</SelectItem>
                      <SelectItem value="out" className="text-gray-800 text-sm">{t("adj_out")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-600 text-sm font-semibold">{t("adjust_qty")}</Label>
                  <Input type="number" value={adj.quantity} onChange={e => setAdj(a => ({ ...a, quantity: e.target.value }))}
                    className="bg-white border-gray-200 text-gray-900 text-sm placeholder:text-gray-400" placeholder="0" min="1" data-testid="input-adjust-quantity" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-600 text-sm font-semibold">{t("adjust_reason")}</Label>
                <Textarea value={adj.notes} onChange={e => setAdj(a => ({ ...a, notes: e.target.value }))}
                  className="bg-white border-gray-200 text-gray-900 resize-none text-sm placeholder:text-gray-400" rows={2} placeholder={t("adjust_reason_ph")} />
              </div>
            </div>
            <DialogFooter className="mt-2 border-t border-gray-100 pt-4">
              <Button variant="outline" onClick={() => setAdjustOpen(false)} className="border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">{t("cancel")}</Button>
              <Button onClick={() => adjustMutation.mutate(adj)}
                disabled={!adj.productId || !adj.quantity || adjustMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm" data-testid="button-confirm-adjust">
                {adjustMutation.isPending ? t("saving") : t("confirm_adjust")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
