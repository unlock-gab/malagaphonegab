import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Search, ShoppingCart, Trash2, Plus, Minus, CheckCircle,
  Smartphone, Package, X, CreditCard, Banknote, ChevronLeft,
  User, Phone, Tag, Loader2, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import OrderInvoice from "@/components/OrderInvoice";
import type { Product, PhoneUnit, Order } from "@shared/schema";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("ar-DZ").format(Math.round(v)) + " د.ج";
}
function shortId(id: string) { return "#" + id.slice(-6).toUpperCase(); }

const PHONE_TYPES = new Set(["phone", "tablet"]);

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

// ─── Phone Unit Picker Dialog ─────────────────────────────────────────────────
function PhoneUnitPicker({ product, units, onSelect, onClose }: {
  product: Product;
  units: PhoneUnit[];
  onSelect: (unit: PhoneUnit) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const available = units.filter(u =>
    u.status === "available" &&
    (!search || (u.imei ?? "").includes(search))
  );

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="bg-white border-gray-200 max-w-md shadow-xl" dir="rtl">
        <DialogHeader className="border-b border-gray-100 pb-3">
          <DialogTitle className="text-gray-900 font-bold flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-600" />
            اختر وحدة IMEI — {product.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث بـ IMEI..." autoFocus
              className="bg-white border-gray-200 text-gray-900 pr-9 font-mono text-sm" />
          </div>

          {available.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Smartphone className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              {search ? "لا توجد وحدات مطابقة" : "لا توجد وحدات متاحة لهذا الموديل"}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {available.map(u => (
                <button key={u.id} onClick={() => onSelect(u)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-right group"
                  data-testid={`button-select-unit-${u.id}`}>
                  <div className="flex-1">
                    <p className="text-gray-900 font-mono text-sm font-semibold group-hover:text-blue-700">{u.imei}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {u.batteryHealth && (
                        <span className={`text-[10px] font-semibold ${parseInt(u.batteryHealth) >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                          🔋 {u.batteryHealth}%
                        </span>
                      )}
                      {u.condition && (
                        <span className="text-[10px] text-gray-400">
                          {{ new: "جديد", used_good: "مستعمل جيد", used_acceptable: "مستعمل مقبول", refurbished: "مجدد" }[u.condition] ?? u.condition}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Receipt (OrderInvoice renders its own fixed overlay) ─────────────────────
function POSReceipt({ order, onClose }: { order: Order; onClose: () => void }) {
  return <OrderInvoice order={order} onClose={onClose} />;
}

// ─── Main POS Page ────────────────────────────────────────────────────────────
export default function AdminPOS() {
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  // Data
  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: allPhoneUnits = [] } = useQuery<PhoneUnit[]>({ queryKey: ["/api/phone-units"] });

  // POS state
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // Focus search on mount
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Filtered products
  const filteredProducts = search.trim()
    ? products.filter(p => {
        const q = search.toLowerCase();
        return p.published && (
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q) ||
          // IMEI direct search — match against phone units
          (PHONE_TYPES.has(p.productType ?? "") && allPhoneUnits.some(u =>
            u.productId === p.id && u.status === "available" && (u.imei ?? "").includes(q)
          ))
        );
      })
    : products.filter(p => p.published && p.stock > 0).slice(0, 24);

  // If search looks like an IMEI, pre-select matching unit
  const handleImeiSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length >= 10) {
      const unit = allPhoneUnits.find(u => u.status === "available" && u.imei === trimmed);
      if (unit) {
        const prod = products.find(p => p.id === unit.productId);
        if (prod && prod.stock > 0) {
          addPhoneUnitToCart(prod, unit);
          setSearch("");
          return;
        } else if (prod && prod.stock <= 0) {
          toast({ title: "هذا الهاتف نفد من المخزون", variant: "destructive" });
          setSearch("");
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
    // Check not already in cart
    if (cart.some(c => c.phoneUnitId === unit.id)) {
      toast({ title: "هذه الوحدة موجودة في السلة بالفعل", variant: "destructive" });
      return;
    }
    const price = parseFloat(product.price?.toString() ?? "0");
    const cost = parseFloat(product.costPrice?.toString() ?? "0");
    setCart(prev => [...prev, {
      productId: product.id,
      productName: product.name + (unit.imei ? ` [${unit.imei}]` : ""),
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
      // Increment if not exceeding stock
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
      // Show IMEI picker only for phones with IMEI units registered
      setPickerProduct(product);
    } else {
      // Accessories OR phones without IMEI tracking → regular stock
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

  const removeItem = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

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
      // Reset POS
      setCart([]);
      setDiscount("");
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setSearch("");
      // Show receipt
      setReceiptOrder(order);
      toast({ title: `✓ تمت عملية البيع ${shortId(order.id)}` });
      searchRef.current?.focus();
    },
    onError: (e: any) => toast({ title: e.message || "فشلت عملية الدفع", variant: "destructive" }),
  });

  // ── Units for picker ──────────────────────────────────────────────────────
  const pickerUnits = pickerProduct
    ? allPhoneUnits.filter(u => u.productId === pickerProduct.id)
    : [];

  // ── IMEI tracking detection ───────────────────────────────────────────────
  // A product "has IMEI tracking" only if at least one phone unit is registered for it
  const hasImeiTracking = (product: Product) =>
    allPhoneUnits.some(u => u.productId === product.id);

  // ── Product availability badge ────────────────────────────────────────────
  const getAvailableCount = (product: Product) => {
    if (PHONE_TYPES.has(product.productType ?? "") && hasImeiTracking(product)) {
      const imeiAvailable = allPhoneUnits.filter(u => u.productId === product.id && u.status === "available").length;
      // Cap by product.stock to handle desync (e.g. stock deducted by non-IMEI order)
      return Math.min(imeiAvailable, product.stock);
    }
    return product.stock;
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-3rem)] -m-4 sm:-m-6 overflow-hidden" dir="rtl">

        {/* ── POS Header ─────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-gray-900 leading-tight">نقطة البيع <span className="text-blue-600">POS</span></h1>
              <p className="text-gray-400 text-[10px] leading-tight">بيع مباشر داخل المتجر</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold text-[10px]">
              {cart.length} منتج في السلة
            </span>
            <span className="text-gray-300">|</span>
            <span>{new Intl.DateTimeFormat("ar-DZ", { hour: "2-digit", minute: "2-digit" }).format(new Date())}</span>
          </div>
        </div>

        {/* ── Main Area ──────────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">

          {/* LEFT: Products ─────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden border-l border-gray-200">

            {/* Search bar */}
            <div className="p-3 border-b border-gray-100 bg-white">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ابحث بالاسم / SKU / رمز / IMEI — أو امسح الباركود..."
                  className="bg-gray-50 border-gray-200 text-gray-900 pr-10 text-sm h-10 font-medium placeholder:text-gray-400 focus:bg-white focus-visible:ring-blue-400"
                  data-testid="input-pos-search"
                  autoComplete="off"
                />
                {search && (
                  <button onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Product grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {loadingProducts ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Package className="w-10 h-10 text-gray-200 mb-2" />
                  <p className="text-sm font-medium">لا توجد منتجات مطابقة</p>
                  {search && <p className="text-xs mt-1 text-gray-300">جرّب بحثاً مختلفاً</p>}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredProducts.map(product => {
                    const isPhone = PHONE_TYPES.has(product.productType ?? "");
                    const available = getAvailableCount(product);
                    const outOfStock = available === 0;
                    const price = parseFloat(product.price?.toString() ?? "0");

                    return (
                      <button key={product.id}
                        onClick={() => !outOfStock && handleProductClick(product)}
                        disabled={outOfStock}
                        className={`relative flex flex-col text-right p-3 rounded-xl border-2 transition-all group text-sm shadow-sm ${
                          outOfStock
                            ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                            : "border-gray-200 bg-white hover:border-blue-400 hover:shadow-md hover:bg-blue-50/30 cursor-pointer active:scale-[0.97]"
                        }`}
                        data-testid={`button-pos-product-${product.id}`}>

                        {/* Product type badge */}
                        <span className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                          isPhone ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}>
                          {isPhone ? "📱 هاتف" : "📦 إكسسوار"}
                        </span>

                        {/* Product name */}
                        <p className="text-gray-900 font-bold text-xs leading-tight mt-4 line-clamp-2 min-h-8">{product.name}</p>

                        {/* Price */}
                        <p className="text-blue-700 font-black text-sm mt-1.5">{formatCurrency(price)}</p>

                        {/* Stock */}
                        <p className={`text-[10px] font-semibold mt-1 ${
                          outOfStock ? "text-red-500" : available <= 2 ? "text-amber-500" : "text-emerald-600"
                        }`}>
                          {outOfStock
                            ? "نفد"
                            : isPhone && hasImeiTracking(product)
                              ? `${available} وحدة متاحة`
                              : `${available} في المخزون`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Cart ─────────────────────────────────────────────── */}
          <div className="w-80 xl:w-96 bg-white flex flex-col shrink-0 shadow-xl">

            {/* Cart header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                السلة
                {cart.length > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full font-bold">{cart.length}</span>
                )}
              </h2>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-300">
                  <ShoppingCart className="w-8 h-8 mb-1.5" />
                  <p className="text-xs font-medium">السلة فارغة</p>
                  <p className="text-[10px] mt-0.5">انقر على منتج لإضافته</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {cart.map((item, idx) => (
                    <div key={idx} className="px-3 py-2.5 hover:bg-gray-50/50" data-testid={`cart-item-${idx}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 text-xs font-semibold leading-tight truncate">{item.productName}</p>
                          {item.imei && (
                            <p className="text-blue-500 text-[10px] font-mono mt-0.5">IMEI: {item.imei}</p>
                          )}
                          <p className="text-gray-500 text-[10px] mt-0.5">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
                        </div>
                        <button onClick={() => removeItem(idx)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-0.5 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        {/* Qty controls — only for accessories */}
                        {!item.phoneUnitId ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => changeQty(idx, -1)}
                              className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors">
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="text-xs font-bold text-gray-900 w-5 text-center">{item.quantity}</span>
                            <button onClick={() => changeQty(idx, 1)}
                              className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors">
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-blue-500 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">📱 x1</span>
                        )}
                        <p className="text-blue-700 font-black text-xs">{formatCurrency(item.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Checkout Panel ──────────────────────────────────────── */}
            <div className="border-t border-gray-200 p-3 space-y-2.5 bg-white">

              {/* Customer info */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)}
                    placeholder="اسم الزبون" className="bg-gray-50 border-gray-200 text-gray-900 text-xs h-8 pr-7 placeholder:text-gray-400"
                    data-testid="input-pos-customer-name" />
                </div>
                <div className="relative">
                  <Phone className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="رقم الهاتف" className="bg-gray-50 border-gray-200 text-gray-900 text-xs h-8 pr-7 placeholder:text-gray-400 font-mono"
                    data-testid="input-pos-customer-phone" />
                </div>
              </div>

              {/* Payment method */}
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 h-8 text-xs" data-testid="select-pos-payment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  <SelectItem value="cash" className="text-sm">
                    <span className="flex items-center gap-2"><Banknote className="w-3.5 h-3.5 text-emerald-600" />نقداً</span>
                  </SelectItem>
                  <SelectItem value="transfer" className="text-sm">
                    <span className="flex items-center gap-2"><CreditCard className="w-3.5 h-3.5 text-blue-600" />تحويل بنكي / CCP</span>
                  </SelectItem>
                  <SelectItem value="card" className="text-sm">
                    <span className="flex items-center gap-2"><CreditCard className="w-3.5 h-3.5 text-purple-600" />بطاقة بنكية</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Discount + Notes */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Tag className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)}
                    placeholder="خصم (د.ج)" min="0" className="bg-gray-50 border-gray-200 text-gray-900 text-xs h-8 pr-7 placeholder:text-gray-400"
                    data-testid="input-pos-discount" />
                </div>
                <Input value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="ملاحظات..." className="bg-gray-50 border-gray-200 text-gray-900 text-xs h-8 placeholder:text-gray-400"
                  data-testid="input-pos-notes" />
              </div>

              {/* Totals */}
              {cart.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 border border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>المجموع الفرعي</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600">
                      <span>خصم</span>
                      <span className="font-semibold">− {formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-200 pt-1.5">
                    <span>الإجمالي</span>
                    <span className="text-blue-700 text-base">{formatCurrency(total)}</span>
                  </div>
                </div>
              )}

              {/* Checkout button */}
              <Button
                onClick={() => checkoutMutation.mutate()}
                disabled={cart.length === 0 || checkoutMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm h-11 shadow-lg shadow-emerald-200 disabled:opacity-50 gap-2"
                data-testid="button-pos-checkout">
                {checkoutMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الدفع...</>
                  : <><CheckCircle className="w-4 h-4" />تأكيد البيع — {formatCurrency(total)}</>
                }
              </Button>

              {/* Clear cart */}
              {cart.length > 0 && (
                <button onClick={() => setCart([])}
                  className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors py-1 flex items-center justify-center gap-1">
                  <Trash2 className="w-3 h-3" /> مسح السلة
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Phone Unit Picker ──────────────────────────────────────────────── */}
      {pickerProduct && (
        <PhoneUnitPicker
          product={pickerProduct}
          units={pickerUnits}
          onSelect={unit => addPhoneUnitToCart(pickerProduct, unit)}
          onClose={() => setPickerProduct(null)}
        />
      )}

      {/* ── Receipt / Invoice ──────────────────────────────────────────────── */}
      {receiptOrder && (
        <POSReceipt
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </AdminLayout>
  );
}
