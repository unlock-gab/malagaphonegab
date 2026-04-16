import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Search, ShoppingCart, Trash2, Plus, Minus, CheckCircle,
  Smartphone, Package, X, CreditCard, Banknote, ChevronLeft,
  User, Phone, Tag, Loader2, Zap, Printer, ReceiptText, Battery,
  ScanLine, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import { useAdminLang } from "@/context/AdminLangContext";
import OrderInvoice from "@/components/OrderInvoice";
import type { Product, PhoneUnit, Order } from "@shared/schema";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("ar-DZ").format(Math.round(v)) + " د.ج";
}
function shortId(id: string) { return "#" + id.slice(-6).toUpperCase(); }

const PHONE_TYPES = new Set(["phone", "tablet"]);

const CONDITION_LABELS: Record<string, string> = {
  new: "جديد",
  used_good: "مستعمل جيد",
  used_acceptable: "مستعمل مقبول",
  refurbished: "مجدد",
};

interface CartItem {
  productId: string;
  productName: string;
  productType: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  total: number;
  phoneUnitId?: string;
  imei?: string;
}

// ─── Live Clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-gray-500 text-xs tabular-nums font-mono">
      {time.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

// ─── Phone Unit Picker Dialog ─────────────────────────────────────────────────
function PhoneUnitPicker({ product, units, onSelect, onClose }: {
  product: Product;
  units: PhoneUnit[];
  onSelect: (unit: PhoneUnit) => void;
  onClose: () => void;
}) {
  const { dir } = useAdminLang();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const available = units.filter(u =>
    u.status === "available" &&
    (!search || (u.imei ?? "").toLowerCase().includes(search.toLowerCase()))
  );
  const soldCount = units.filter(u => u.status === "sold").length;

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="bg-white border-gray-200 max-w-lg shadow-2xl" dir={dir}>
        <DialogHeader className="border-b border-gray-100 pb-4">
          <DialogTitle className="text-gray-900 font-bold flex items-center gap-2 text-base">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
              <Smartphone className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="leading-tight">{product.name}</p>
              <p className="text-xs text-gray-400 font-normal mt-0.5">
                {available.length} وحدة متاحة{soldCount > 0 ? ` · ${soldCount} مباعة` : ""}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <ScanLine className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث بـ IMEI أو امسح بالباركود..."
              className="bg-gray-50 border-gray-200 text-gray-900 pr-10 font-mono text-sm h-10 focus-visible:ring-blue-400"
              data-testid="input-unit-picker-search"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {available.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-gray-500 text-sm font-medium">
                {search ? "لا توجد وحدات مطابقة" : "لا توجد وحدات متاحة لهذا الموديل"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto -mx-1 px-1">
              {available.map(u => {
                const batteryNum = u.batteryHealth ? parseInt(String(u.batteryHealth)) : null;
                const batteryColor = batteryNum == null ? "" : batteryNum >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-200" : batteryNum >= 60 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-red-600 bg-red-50 border-red-200";
                return (
                  <button key={u.id} onClick={() => onSelect(u)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-right group active:scale-[0.99]"
                    data-testid={`button-select-unit-${u.id}`}>

                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-mono text-sm font-bold group-hover:text-blue-700 tracking-wide">
                        {u.imei}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {u.condition && (
                          <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                            {CONDITION_LABELS[u.condition] ?? u.condition}
                          </span>
                        )}
                        {batteryNum != null && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${batteryColor} flex items-center gap-0.5`}>
                            <Battery className="w-2.5 h-2.5" />
                            {batteryNum}%
                          </span>
                        )}
                        {u.purchaseCost && (
                          <span className="text-[10px] text-gray-400">
                            تكلفة: {formatCurrency(parseFloat(String(u.purchaseCost)))}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-blue-700 font-black text-sm">
                        {formatCurrency(parseFloat(product.price?.toString() ?? "0"))}
                      </span>
                      <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Success Screen ────────────────────────────────────────────────────────────
function SaleSuccess({ order, onPrint, onNew }: { order: Order; onPrint: () => void; onNew: () => void }) {
  const { dir } = useAdminLang();
  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center" dir={dir}>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-9 h-9 text-emerald-600" />
        </div>
        <h2 className="text-gray-900 text-xl font-black mb-1">تمت عملية البيع!</h2>
        <p className="text-gray-400 text-sm mb-6">فاتورة رقم {shortId(order.id)}</p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-right space-y-2 border border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">الزبون</span>
            <span className="font-semibold text-gray-800">{(order as any).customerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">المبلغ</span>
            <span className="font-black text-blue-700 text-base">{formatCurrency(parseFloat(String(order.total)))}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={onPrint}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 h-11"
            data-testid="button-pos-print-receipt">
            <Printer className="w-4 h-4" />
            طباعة الفاتورة
          </Button>
          <Button variant="outline" onClick={onNew}
            className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold h-11 gap-2"
            data-testid="button-pos-new-sale">
            <Zap className="w-4 h-4 text-blue-500" />
            بيع جديد
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main POS Page ────────────────────────────────────────────────────────────
export default function AdminPOS() {
  const { dir } = useAdminLang();
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: allPhoneUnits = [] } = useQuery<PhoneUnit[]>({ queryKey: ["/api/phone-units"] });

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  // ── IMEI tracking helpers ─────────────────────────────────────────────────
  const hasImeiTracking = (product: Product) =>
    allPhoneUnits.some(u => u.productId === product.id);

  const getAvailableCount = (product: Product) => {
    if (PHONE_TYPES.has(product.productType ?? "") && hasImeiTracking(product)) {
      const imeiAvailable = allPhoneUnits.filter(u => u.productId === product.id && u.status === "available").length;
      return Math.min(imeiAvailable, product.stock);
    }
    return product.stock;
  };

  // ── Search & filter ───────────────────────────────────────────────────────
  const filteredProducts = search.trim()
    ? products.filter(p => {
        const q = search.toLowerCase();
        return p.published && (
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q) ||
          (PHONE_TYPES.has(p.productType ?? "") && allPhoneUnits.some(u =>
            u.productId === p.id && u.status === "available" && (u.imei ?? "").includes(q)
          ))
        );
      })
    : products.filter(p => p.published).slice(0, 50);

  const handleImeiSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length >= 10) {
      const unit = allPhoneUnits.find(u => u.status === "available" && u.imei === trimmed);
      if (unit) {
        const prod = products.find(p => p.id === unit.productId);
        if (prod) {
          if (getAvailableCount(prod) > 0) {
            addPhoneUnitToCart(prod, unit);
            setSearch("");
          } else {
            toast({ title: "هذا الهاتف نفد من المخزون", variant: "destructive" });
            setSearch("");
          }
          return;
        }
      }
    }
  }, [allPhoneUnits, products]);

  useEffect(() => {
    if (search.length >= 15) handleImeiSearch(search);
  }, [search, handleImeiSearch]);

  // ── Cart actions ──────────────────────────────────────────────────────────
  const addPhoneUnitToCart = (product: Product, unit: PhoneUnit) => {
    if (cart.some(c => c.phoneUnitId === unit.id)) {
      toast({ title: "هذه الوحدة موجودة في السلة بالفعل", variant: "destructive" });
      return;
    }
    const price = parseFloat(product.price?.toString() ?? "0");
    const cost = parseFloat(product.costPrice?.toString() ?? "0");
    setCart(prev => [...prev, {
      productId: product.id,
      productName: product.name,
      productType: product.productType ?? "phone",
      unitPrice: price,
      costPrice: cost,
      quantity: 1,
      total: price,
      phoneUnitId: unit.id,
      imei: unit.imei ?? undefined,
    }]);
    setPickerProduct(null);
    toast({ title: `✓ تمت إضافة ${product.name}` });
  };

  const addAccessoryToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast({ title: "المنتج غير متوفر في المخزون", variant: "destructive" });
      return;
    }
    const existing = cart.findIndex(c => c.productId === product.id && !c.phoneUnitId);
    const price = parseFloat(product.price?.toString() ?? "0");
    const cost = parseFloat(product.costPrice?.toString() ?? "0");
    if (existing >= 0) {
      const cur = cart[existing];
      if (cur.quantity >= product.stock) {
        toast({ title: "لا يمكن تجاوز المخزون المتاح", variant: "destructive" });
        return;
      }
      setCart(prev => prev.map((c, i) => i === existing
        ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * price }
        : c
      ));
    } else {
      setCart(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        productType: product.productType ?? "accessory",
        unitPrice: price,
        costPrice: cost,
        quantity: 1,
        total: price,
      }]);
    }
  };

  const handleProductClick = (product: Product) => {
    if (PHONE_TYPES.has(product.productType ?? "") && hasImeiTracking(product)) {
      setPickerProduct(product);
    } else {
      addAccessoryToCart(product);
    }
  };

  const changeQty = (idx: number, delta: number) => {
    setCart(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      const newQty = Math.max(1, c.quantity + delta);
      return { ...c, quantity: newQty, total: newQty * c.unitPrice };
    }));
  };

  const removeItem = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, c) => s + c.total, 0);
  const discountAmount = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);

  // ── Checkout mutation ─────────────────────────────────────────────────────
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("السلة فارغة");
      const items = cart.map(c => ({
        productId: c.productId,
        productName: c.productName,
        quantity: c.quantity,
        unitPrice: c.unitPrice.toFixed(2),
        costPrice: c.costPrice.toFixed(2),
        total: c.total.toFixed(2),
        phoneUnitId: c.phoneUnitId ?? null,
        imei: c.imei ?? null,
      }));
      const res = await apiRequest("POST", "/api/admin/orders", {
        customerName: customerName || "زبون متجر",
        customerPhone: customerPhone || "0000000000",
        wilaya: "الجزائر",
        commune: "متجر",
        address: "كاشير - بيع مباشر",
        deliveryType: "pickup",
        deliveryPrice: "0",
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        discount: discountAmount.toFixed(2),
        paymentMethod,
        paymentStatus: "paid",
        status: "delivered",
        source: "pos",
        notes: notes || null,
        items,
      });
      return res.json();
    },
    onSuccess: (order: Order) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/counts"] });
      setCart([]);
      setDiscount("");
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setSearch("");
      setCompletedOrder(order);
      setShowSuccess(true);
      searchRef.current?.focus();
    },
    onError: (e: any) => toast({ title: e.message || "فشلت عملية الدفع", variant: "destructive" }),
  });

  const pickerUnits = pickerProduct
    ? allPhoneUnits.filter(u => u.productId === pickerProduct.id)
    : [];

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-3rem)] -m-4 sm:-m-6 overflow-hidden bg-gray-50" dir={dir}>

        {/* ══ POS Header ═══════════════════════════════════════════════════ */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between gap-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
              <ReceiptText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-gray-900 leading-tight">
                نقطة البيع <span className="text-blue-600">POS</span>
              </h1>
              <p className="text-gray-400 text-[10px] leading-tight">بيع مباشر داخل المتجر</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {cart.length > 0 && (
              <span className="bg-blue-600 text-white text-[11px] px-2.5 py-1 rounded-full font-bold shadow-sm shadow-blue-200">
                {cart.length} {cart.length === 1 ? "منتج" : "منتجات"}
              </span>
            )}
            <LiveClock />
          </div>
        </div>

        {/* ══ Main Layout ══════════════════════════════════════════════════ */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── LEFT: Products Panel ──────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Search bar */}
            <div className="p-4 bg-white border-b border-gray-200 shadow-sm">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ابحث بالاسم / SKU / IMEI — أو امسح الباركود مباشرة..."
                  className="bg-gray-50 border-gray-200 text-gray-900 pr-11 text-[15px] h-12 font-medium placeholder:text-gray-400 focus:bg-white focus-visible:ring-blue-400 rounded-xl"
                  data-testid="input-pos-search"
                  autoComplete="off"
                />
                {search && (
                  <button onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Product grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingProducts ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-56 text-gray-400">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Package className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">لا توجد منتجات مطابقة</p>
                  {search && <p className="text-xs mt-1 text-gray-400">جرّب بحثاً مختلفاً</p>}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredProducts.map(product => {
                    const isPhone = PHONE_TYPES.has(product.productType ?? "");
                    const available = getAvailableCount(product);
                    const outOfStock = available === 0;
                    const isImeiTracked = isPhone && hasImeiTracking(product);
                    const price = parseFloat(product.price?.toString() ?? "0");

                    return (
                      <button key={product.id}
                        onClick={() => !outOfStock && handleProductClick(product)}
                        disabled={outOfStock}
                        className={`relative flex flex-col text-right p-3 rounded-xl border-2 transition-all group shadow-sm ${
                          outOfStock
                            ? "border-gray-100 bg-white opacity-40 cursor-not-allowed"
                            : isPhone
                              ? "border-blue-100 bg-white hover:border-blue-400 hover:shadow-md hover:bg-blue-50/30 cursor-pointer active:scale-[0.97]"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md cursor-pointer active:scale-[0.97]"
                        }`}
                        data-testid={`button-pos-product-${product.id}`}>

                        {/* Type badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                            isPhone
                              ? "bg-blue-50 text-blue-600 border-blue-200"
                              : "bg-gray-50 text-gray-500 border-gray-200"
                          }`}>
                            {isPhone ? "هاتف" : "إكسسوار"}
                          </span>
                          {outOfStock && (
                            <span className="text-[9px] font-bold bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded-full">نفد</span>
                          )}
                        </div>

                        {/* Name */}
                        <p className="text-gray-900 font-bold text-xs leading-tight line-clamp-2 flex-1 min-h-7">{product.name}</p>

                        {/* Price */}
                        <p className="text-blue-700 font-black text-sm mt-2">{formatCurrency(price)}</p>

                        {/* Stock */}
                        <p className={`text-[10px] font-semibold mt-0.5 ${
                          outOfStock ? "text-red-400" : available <= 2 ? "text-amber-500" : "text-emerald-600"
                        }`}>
                          {outOfStock ? "نفد من المخزون"
                            : isImeiTracked ? `${available} وحدة`
                            : `${available} متوفر`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Cart Panel ─────────────────────────────────────────── */}
          <div className="w-80 xl:w-[22rem] bg-white flex flex-col shrink-0 border-r border-gray-200 shadow-xl">

            {/* Cart header */}
            <div className="px-4 py-3.5 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-gray-800 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  السلة
                  {cart.length > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] w-5 h-5 rounded-full font-bold flex items-center justify-center">{cart.length}</span>
                  )}
                </h2>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])}
                    className="text-[10px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                    data-testid="button-pos-clear-cart">
                    <Trash2 className="w-3 h-3" /> مسح
                  </button>
                )}
              </div>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-300 gap-2">
                  <ShoppingCart className="w-10 h-10" />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-400">السلة فارغة</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">انقر على منتج لإضافته</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {cart.map((item, idx) => (
                    <div key={idx} className="px-4 py-3 hover:bg-gray-50/50 transition-colors" data-testid={`cart-item-${idx}`}>
                      {/* Item header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 text-xs font-bold leading-tight truncate">{item.productName}</p>
                          {item.imei && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">IMEI</span>
                              <span className="text-blue-600 text-[10px] font-mono font-semibold">{item.imei}</span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => removeItem(idx)}
                          className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 flex items-center justify-center transition-colors shrink-0"
                          data-testid={`button-remove-cart-item-${idx}`}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Qty + Total */}
                      <div className="flex items-center justify-between mt-2">
                        {!item.phoneUnitId ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => changeQty(idx, -1)}
                              className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                              data-testid={`button-decrease-qty-${idx}`}>
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-black text-gray-900 w-6 text-center tabular-nums">{item.quantity}</span>
                            <button onClick={() => changeQty(idx, 1)}
                              className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                              data-testid={`button-increase-qty-${idx}`}>
                              <Plus className="w-3 h-3" />
                            </button>
                            <span className="text-[10px] text-gray-400 mr-1">× {formatCurrency(item.unitPrice)}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                            📱 وحدة واحدة
                          </span>
                        )}
                        <p className="text-gray-900 font-black text-sm">{formatCurrency(item.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Checkout Panel ───────────────────────────────────────── */}
            <div className="border-t border-gray-200 bg-white">

              {/* Customer info */}
              <div className="px-4 pt-3 pb-2 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">معلومات الزبون (اختياري)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)}
                      placeholder="الاسم" className="bg-gray-50 border-gray-200 text-gray-800 text-xs h-9 pr-7 placeholder:text-gray-400 rounded-lg"
                      data-testid="input-pos-customer-name" />
                  </div>
                  <div className="relative">
                    <Phone className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="الهاتف" className="bg-gray-50 border-gray-200 text-gray-800 text-xs h-9 pr-7 placeholder:text-gray-400 font-mono rounded-lg"
                      data-testid="input-pos-customer-phone" />
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="px-4 pb-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { value: "cash", label: "نقداً", icon: <Banknote className="w-3.5 h-3.5" />, color: "emerald" },
                    { value: "transfer", label: "تحويل", icon: <CreditCard className="w-3.5 h-3.5" />, color: "blue" },
                    { value: "card", label: "بطاقة", icon: <CreditCard className="w-3.5 h-3.5" />, color: "purple" },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setPaymentMethod(opt.value)}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-[10px] font-bold transition-all ${
                        paymentMethod === opt.value
                          ? opt.color === "emerald"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : opt.color === "blue"
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100"
                      }`}
                      data-testid={`button-payment-${opt.value}`}>
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount + Notes */}
              <div className="px-4 pb-2 grid grid-cols-2 gap-2">
                <div className="relative">
                  <Tag className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)}
                    placeholder="خصم د.ج" min="0"
                    className="bg-gray-50 border-gray-200 text-gray-800 text-xs h-9 pr-7 placeholder:text-gray-400 rounded-lg"
                    data-testid="input-pos-discount" />
                </div>
                <Input value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="ملاحظة..."
                  className="bg-gray-50 border-gray-200 text-gray-800 text-xs h-9 placeholder:text-gray-400 rounded-lg"
                  data-testid="input-pos-notes" />
              </div>

              {/* Totals */}
              {cart.length > 0 && (
                <div className="mx-4 mb-3 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>مجموع البضاعة</span>
                      <span className="font-semibold text-gray-700 tabular-nums">{formatCurrency(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs text-emerald-600">
                        <span>خصم</span>
                        <span className="font-bold tabular-nums">− {formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-blue-600 px-3 py-2.5 flex items-center justify-between">
                    <span className="text-white text-sm font-bold">الإجمالي</span>
                    <span className="text-white font-black text-lg tabular-nums">{formatCurrency(total)}</span>
                  </div>
                </div>
              )}

              {/* Checkout button */}
              <div className="px-4 pb-4">
                <Button
                  onClick={() => checkoutMutation.mutate()}
                  disabled={cart.length === 0 || checkoutMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm h-12 shadow-lg shadow-emerald-200/60 disabled:opacity-40 gap-2 rounded-xl"
                  data-testid="button-pos-checkout">
                  {checkoutMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />جاري الدفع...</>
                  ) : cart.length === 0 ? (
                    <><ShoppingCart className="w-4 h-4 opacity-50" />أضف منتجاً للمتابعة</>
                  ) : (
                    <><CheckCircle className="w-5 h-5" />تأكيد البيع — {formatCurrency(total)}</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Phone Unit Picker ─────────────────────────────────────────────────── */}
      {pickerProduct && (
        <PhoneUnitPicker
          product={pickerProduct}
          units={pickerUnits}
          onSelect={unit => addPhoneUnitToCart(pickerProduct, unit)}
          onClose={() => setPickerProduct(null)}
        />
      )}

      {/* ── Post-sale Success Screen ──────────────────────────────────────────── */}
      {showSuccess && completedOrder && (
        <SaleSuccess
          order={completedOrder}
          onPrint={() => {
            setShowSuccess(false);
            setReceiptOrder(completedOrder);
          }}
          onNew={() => {
            setShowSuccess(false);
            setCompletedOrder(null);
            searchRef.current?.focus();
          }}
        />
      )}

      {/* ── Receipt / Invoice ─────────────────────────────────────────────────── */}
      {receiptOrder && (
        <OrderInvoice order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}
    </AdminLayout>
  );
}
