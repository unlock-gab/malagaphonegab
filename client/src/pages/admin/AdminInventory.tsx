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
import type { Product, InventoryMovement, PhoneUnit } from "@shared/schema";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("ar-DZ").format(Math.round(v)) + " د.ج";
}
function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

const MOVEMENT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; dir: "in" | "out" | "neutral" }> = {
  purchase_in:       { label: "استلام شراء", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",  icon: ArrowUpRight,   dir: "in" },
  order_out:         { label: "صادر طلب",    color: "text-red-600",     bg: "bg-red-50 border-red-200",           icon: ArrowDownRight, dir: "out" },
  return_in:         { label: "مرتجع",        color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",         icon: RotateCcw,      dir: "in" },
  damaged_out:       { label: "تالف/مفقود",  color: "text-orange-700",  bg: "bg-orange-50 border-orange-200",     icon: ArrowDownRight, dir: "out" },
  manual_adjustment: { label: "تعديل يدوي",  color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",       icon: Minus,          dir: "neutral" },
  in:                { label: "وارد",         color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",   icon: ArrowUpRight,   dir: "in" },
  out:               { label: "صادر",        color: "text-red-600",     bg: "bg-red-50 border-red-200",           icon: ArrowDownRight, dir: "out" },
  order_cancelled:   { label: "إلغاء طلب",   color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",         icon: RotateCcw,      dir: "in" },
  purchase_deleted:  { label: "حذف شراء",   color: "text-red-600",     bg: "bg-red-50 border-red-200",           icon: ArrowDownRight, dir: "out" },
  note:              { label: "ملاحظة",      color: "text-gray-600",    bg: "bg-gray-50 border-gray-200",         icon: Minus,          dir: "neutral" },
};

function MovBadge({ type }: { type: string }) {
  const cfg = MOVEMENT_CONFIG[type] ?? { label: type, color: "text-gray-600", bg: "bg-gray-100 border-gray-200", icon: Minus };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />{cfg.label}
    </span>
  );
}

type StockFilter = "all" | "healthy" | "low" | "out";

const UNIT_STATUS: Record<string, { label: string; cls: string }> = {
  available:  { label: "متاح",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  sold:       { label: "مباع",        cls: "bg-blue-50 text-blue-700 border-blue-200" },
  returned:   { label: "مرتجع",       cls: "bg-amber-50 text-amber-700 border-amber-200" },
  damaged:    { label: "تالف",        cls: "bg-red-50 text-red-600 border-red-200" },
  inspection: { label: "قيد الفحص",  cls: "bg-purple-50 text-purple-700 border-purple-200" },
};

function EditPhoneUnitForm({ unit, products, onSave, onCancel, saving }: {
  unit: PhoneUnit; products: Product[];
  onSave: (data: any) => void; onCancel: () => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    status: unit.status ?? "available",
    batteryHealth: unit.batteryHealth ?? "",
    condition: unit.condition ?? "used_good",
    notes: unit.notes ?? "",
  });
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = "bg-white border-gray-200 text-gray-900 text-sm";

  return (
    <div className="space-y-3 pt-1" dir="rtl">
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs">
        <p className="text-blue-600 font-mono">{unit.imei}</p>
        <p className="text-blue-500 mt-0.5">{products.find(p => p.id === unit.productId)?.name ?? unit.productId}</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-600 text-xs font-semibold">الحالة</Label>
        <Select value={form.status} onValueChange={v => setF("status", v)}>
          <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border-gray-200 shadow-lg">
            {Object.entries(UNIT_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-sm">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold">صحة البطارية (%)</Label>
          <Input type="number" min="0" max="100" value={form.batteryHealth}
            onChange={e => setF("batteryHealth", e.target.value)}
            placeholder="مثال: 85" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold">الحالة الجسدية</Label>
          <Select value={form.condition} onValueChange={v => setF("condition", v)}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-lg">
              <SelectItem value="new" className="text-sm">جديد</SelectItem>
              <SelectItem value="used_good" className="text-sm">مستعمل جيد</SelectItem>
              <SelectItem value="used_acceptable" className="text-sm">مستعمل مقبول</SelectItem>
              <SelectItem value="refurbished" className="text-sm">مجدد</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-600 text-xs font-semibold">ملاحظات</Label>
        <Textarea value={form.notes} onChange={e => setF("notes", e.target.value)}
          className={`${inputCls} resize-none`} rows={2} placeholder="أي ملاحظات..." />
      </div>

      <DialogFooter className="gap-2 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel} className="border-gray-200 text-gray-600 text-sm">إلغاء</Button>
        <Button onClick={() => onSave(form)} disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
          {saving ? "جاري..." : "حفظ"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminInventory() {
  const { toast } = useToast();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [movSearch, setMovSearch] = useState("");
  const [movTypeFilter, setMovTypeFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [adj, setAdj] = useState({ productId: "", quantity: "", type: "in" as string, notes: "" });

  // Phone Units (IMEI) state
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
      toast({ title: "✓ تم تعديل المخزون" });
    },
    onError: () => toast({ title: "فشل التعديل", variant: "destructive" }),
  });

  const updateUnitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/phone-units/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phone-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditingUnit(null);
      toast({ title: "✓ تم تحديث الوحدة" });
    },
    onError: () => toast({ title: "فشل التحديث", variant: "destructive" }),
  });

  const deleteUnitMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/phone-units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phone-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "✓ تم حذف الوحدة" });
    },
    onError: () => toast({ title: "فشل الحذف", variant: "destructive" }),
  });

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

  const filteredProducts = products.filter(p => {
    const matchSearch = !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(productSearch.toLowerCase());
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

  const stockFilterBtns: { key: StockFilter; label: string; count: number; cls: string; activeCls: string }[] = [
    { key: "all",     label: "الكل",          count: products.length, cls: "text-gray-600 border-gray-200 bg-white",           activeCls: "bg-blue-600 text-white border-blue-600" },
    { key: "healthy", label: "✓ مخزون جيد",  count: healthy,         cls: "text-emerald-700 border-emerald-200 bg-emerald-50", activeCls: "bg-emerald-600 text-white border-emerald-600" },
    { key: "low",     label: "⚠ منخفض",      count: lowStock,        cls: "text-amber-700 border-amber-200 bg-amber-50",       activeCls: "bg-amber-600 text-white border-amber-600" },
    { key: "out",     label: "✕ نفد",         count: outOfStock,      cls: "text-red-600 border-red-200 bg-red-50",             activeCls: "bg-red-600 text-white border-red-600" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">المخزون</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {products.length} منتج •{" "}
              <span className="text-emerald-600">{healthy} جيد</span>{" "}
              {lowStock > 0 && <><span className="text-gray-400">•</span> <span className="text-amber-600">{lowStock} منخفض</span></>}{" "}
              {outOfStock > 0 && <><span className="text-gray-400">•</span> <span className="text-red-600">{outOfStock} نفد</span></>}{" "}
              • القيمة: <span className="text-blue-700 font-semibold">{formatCurrency(totalValue)}</span>
            </p>
          </div>
          <Button onClick={() => setAdjustOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm shadow-sm" data-testid="button-adjust-stock">
            <RefreshCcw className="w-4 h-4" /> تعديل مخزون
          </Button>
        </div>

        {/* Low stock alert */}
        {(lowStock > 0 || outOfStock > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-amber-700 font-semibold text-sm">{lowStock + outOfStock} منتج يحتاج انتباهاً</p>
              <p className="text-amber-600/80 text-xs mt-0.5 truncate">
                {products.filter(p => p.stock <= (p.minStock ?? 3)).map(p => p.name).join(" • ")}
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="products">
          <TabsList className="bg-gray-100 border border-gray-200">
            <TabsTrigger value="products" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-500 text-xs gap-1.5">
              <Boxes className="w-3.5 h-3.5" /> جدول المخزون
            </TabsTrigger>
            <TabsTrigger value="movements" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-500 text-xs gap-1.5">
              <RefreshCcw className="w-3.5 h-3.5" /> سجل الحركات
            </TabsTrigger>
            <TabsTrigger value="phone-units" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-500 text-xs gap-1.5">
              <Smartphone className="w-3.5 h-3.5" /> وحدات IMEI
              {phoneUnits.filter(u => u.status === "available").length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[10px] px-1 rounded-full">
                  {phoneUnits.filter(u => u.status === "available").length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* PRODUCTS TAB */}
          <TabsContent value="products" className="mt-4 space-y-3">
            {/* Category type filter */}
            <div className="flex gap-1.5 flex-wrap">
              {([
                { key: "all",       label: "📦 الكل",          count: products.length },
                { key: "phone",     label: "📱 هواتف",         count: products.filter(p => p.productType === "phone").length },
                { key: "tablet",    label: "💻 تابلت",          count: products.filter(p => p.productType === "tablet").length },
                { key: "accessory", label: "🎧 اكسسوارات",     count: products.filter(p => p.productType === "accessory").length },
                { key: "other",     label: "🔧 أخرى",          count: products.filter(p => p.productType === "other").length },
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

            {/* Stock status filter */}
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
                placeholder="بحث بالاسم أو SKU..." className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pr-9 text-sm h-9" />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs">
                      <th className="text-right p-3 font-semibold min-w-48">المنتج</th>
                      <th className="text-center p-3 font-semibold">المخزون</th>
                      <th className="text-center p-3 font-semibold hidden sm:table-cell">الحد الأدنى</th>
                      <th className="text-right p-3 font-semibold hidden md:table-cell">تكلفة الوحدة</th>
                      <th className="text-right p-3 font-semibold hidden lg:table-cell">القيمة الإجمالية</th>
                      <th className="text-right p-3 font-semibold hidden xl:table-cell">آخر حركة</th>
                      <th className="text-center p-3 font-semibold">الحالة</th>
                      <th className="text-center p-3 font-semibold w-16">تعديل</th>
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
                            <p className="text-gray-500 text-sm">لا توجد منتجات مطابقة</p>
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
                                      {lastMovType && <MovBadge type={lastMovType} />}
                                    </div>
                                  : <span className="text-gray-300 text-xs">—</span>
                                }
                              </td>
                              <td className="p-3 text-center">
                                {isOut
                                  ? <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold"><XCircle className="w-3.5 h-3.5" />نفد</span>
                                  : isLow
                                    ? <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold"><AlertTriangle className="w-3.5 h-3.5" />منخفض</span>
                                    : <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3.5 h-3.5" />جيد</span>
                                }
                              </td>
                              <td className="p-3 text-center">
                                <button onClick={() => { setAdj(a => ({ ...a, productId: p.id })); setAdjustOpen(true); }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="تعديل المخزون">
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
                  placeholder="بحث بالمنتج أو المرجع..." className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pr-9 text-sm h-9" />
              </div>
              <Select value={movTypeFilter} onValueChange={setMovTypeFilter}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-700 w-40 text-xs h-9"><SelectValue placeholder="كل الأنواع" /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  <SelectItem value="all" className="text-gray-800 text-sm">كل الأنواع</SelectItem>
                  <SelectItem value="purchase_in" className="text-gray-800 text-sm">استلام شراء</SelectItem>
                  <SelectItem value="order_out" className="text-gray-800 text-sm">صادر طلب</SelectItem>
                  <SelectItem value="return_in" className="text-gray-800 text-sm">مرتجع</SelectItem>
                  <SelectItem value="damaged_out" className="text-gray-800 text-sm">تالف/مفقود</SelectItem>
                  <SelectItem value="manual_adjustment" className="text-gray-800 text-sm">تعديل يدوي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs">
                    <th className="text-right p-3 font-semibold min-w-40">المنتج</th>
                    <th className="text-center p-3 font-semibold">النوع</th>
                    <th className="text-center p-3 font-semibold">الكمية</th>
                    <th className="text-right p-3 font-semibold hidden sm:table-cell">المرجع</th>
                    <th className="text-right p-3 font-semibold hidden md:table-cell">ملاحظات</th>
                    <th className="text-right p-3 font-semibold">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMovements
                    ? Array.from({ length: 6 }).map((_, i) => <tr key={i} className="border-b border-gray-50"><td colSpan={6} className="p-3"><Skeleton className="h-7 rounded-md" /></td></tr>)
                    : filteredMovements.length === 0
                      ? <tr><td colSpan={6} className="text-center py-10 text-gray-500 text-sm">
                          {movSearch || movTypeFilter !== "all" ? "لا توجد حركات مطابقة" : "لا توجد حركات بعد — تُسجَّل تلقائياً عند الشراء أو إتمام الطلبات"}
                        </td></tr>
                      : filteredMovements.map(m => (
                        <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors" data-testid={`row-movement-${m.id}`}>
                          <td className="p-3 text-gray-800 text-xs font-medium">{m.productName}</td>
                          <td className="p-3 text-center"><MovBadge type={m.type} /></td>
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
                  placeholder="بحث بـ IMEI أو مورد..." className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pr-9 text-sm h-9 font-mono" />
              </div>
              <Select value={unitStatusFilter} onValueChange={setUnitStatusFilter}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-700 w-36 text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  <SelectItem value="all" className="text-gray-800 text-sm">كل الحالات</SelectItem>
                  {Object.entries(UNIT_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-gray-800 text-sm">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
              {Object.entries(UNIT_STATUS).map(([k, v]) => {
                const cnt = phoneUnits.filter(u => u.status === k).length;
                return (
                  <span key={k} className={`px-2 py-1 rounded-full border ${v.cls}`}>
                    {v.label}: <span className="font-bold">{cnt}</span>
                  </span>
                );
              })}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="text-right p-2.5 font-semibold">IMEI</th>
                    <th className="text-right p-2.5 font-semibold min-w-36">المنتج</th>
                    <th className="text-center p-2.5 font-semibold">الحالة</th>
                    <th className="text-right p-2.5 font-semibold hidden sm:table-cell">المورد</th>
                    <th className="text-right p-2.5 font-semibold hidden md:table-cell">التكلفة</th>
                    <th className="text-center p-2.5 font-semibold hidden lg:table-cell">البطارية</th>
                    <th className="text-center p-2.5 font-semibold w-16">إجراء</th>
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
                          {unitSearch || unitStatusFilter !== "all" ? "لا توجد وحدات مطابقة" : "لا توجد وحدات IMEI — تُضاف تلقائياً عند إتمام شراء هاتف"}
                        </td></tr>
                      : filteredUnits.map(u => {
                          const st = UNIT_STATUS[u.status ?? "available"] ?? UNIT_STATUS.available;
                          return (
                            <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/70" data-testid={`row-phone-unit-${u.id}`}>
                              <td className="p-2.5 font-mono text-gray-800 text-[11px] tracking-wider">{u.imei}</td>
                              <td className="p-2.5 text-gray-700">{unitProductName(u.productId)}</td>
                              <td className="p-2.5 text-center">
                                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                              </td>
                              <td className="p-2.5 text-gray-500 hidden sm:table-cell">{u.supplierName ?? "—"}</td>
                              <td className="p-2.5 text-gray-500 hidden md:table-cell">{u.purchaseCost ? formatCurrency(parseFloat(u.purchaseCost)) : "—"}</td>
                              <td className="p-2.5 text-center hidden lg:table-cell">
                                {u.batteryHealth ? <span className={`font-semibold ${parseInt(u.batteryHealth) >= 80 ? "text-emerald-600" : "text-amber-600"}`}>{u.batteryHealth}%</span> : "—"}
                              </td>
                              <td className="p-2.5 text-center">
                                <button onClick={() => setEditingUnit(u)} className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors mr-1" title="تعديل">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button onClick={() => { if (confirm("هل تريد حذف هذه الوحدة؟")) deleteUnitMutation.mutate(u.id); }}
                                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="حذف">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                  }
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Phone Unit Dialog */}
        {editingUnit && (
          <Dialog open onOpenChange={o => { if (!o) setEditingUnit(null); }}>
            <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-sm shadow-xl" dir="rtl">
              <DialogHeader className="border-b border-gray-100 pb-3">
                <DialogTitle className="text-gray-900 font-bold text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  تعديل وحدة IMEI
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

        {/* Adjust Dialog */}
        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md shadow-xl" dir="rtl">
            <DialogHeader className="border-b border-gray-100 pb-3">
              <DialogTitle className="text-gray-900 font-bold">تعديل المخزون يدوياً</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-gray-600 text-sm font-semibold">المنتج *</Label>
                <Select value={adj.productId} onValueChange={v => setAdj(a => ({ ...a, productId: v }))}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900 text-sm" data-testid="select-adjust-product">
                    <SelectValue placeholder="اختر منتجاً..." />
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
                  <Label className="text-gray-600 text-sm font-semibold">نوع التعديل</Label>
                  <Select value={adj.type} onValueChange={v => setAdj(a => ({ ...a, type: v }))}>
                    <SelectTrigger className="bg-white border-gray-200 text-gray-900 text-sm" data-testid="select-adjust-type"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-lg">
                      <SelectItem value="in" className="text-gray-800 text-sm">➕ إضافة (استلام)</SelectItem>
                      <SelectItem value="out" className="text-gray-800 text-sm">➖ خصم (تالف/خسارة)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-600 text-sm font-semibold">الكمية *</Label>
                  <Input type="number" value={adj.quantity} onChange={e => setAdj(a => ({ ...a, quantity: e.target.value }))}
                    className="bg-white border-gray-200 text-gray-900 text-sm placeholder:text-gray-400" placeholder="0" min="1" data-testid="input-adjust-quantity" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-600 text-sm font-semibold">سبب التعديل</Label>
                <Textarea value={adj.notes} onChange={e => setAdj(a => ({ ...a, notes: e.target.value }))}
                  className="bg-white border-gray-200 text-gray-900 resize-none text-sm placeholder:text-gray-400" rows={2} placeholder="مثال: استلام من مورد جديد، أو وجد كسر في المنتج..." />
              </div>
            </div>
            <DialogFooter className="mt-2 border-t border-gray-100 pt-4">
              <Button variant="outline" onClick={() => setAdjustOpen(false)} className="border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">إلغاء</Button>
              <Button onClick={() => adjustMutation.mutate(adj)}
                disabled={!adj.productId || !adj.quantity || adjustMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm" data-testid="button-confirm-adjust">
                {adjustMutation.isPending ? "جاري..." : "تأكيد التعديل"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
