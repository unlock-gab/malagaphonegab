import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus, ShoppingBag, Trash2, Check, X, Building2, Calendar, Search, ChevronRight, Loader2, PackagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import type { Purchase, Supplier, Product } from "@shared/schema";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("ar-DZ").format(Math.round(v)) + " د.ج";
}
function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:   { label: "معلق",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "مكتمل", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "ملغي",  cls: "bg-red-50 text-red-600 border-red-200" },
};

interface PurchaseItem {
  productId: string;
  productName: string;
  productType?: string;
  quantity: number;
  unitCost: number;
  total: number;
  imeis?: string[]; // for phones/tablets
}

const PRODUCT_TYPES = [
  { value: "phone", label: "هاتف" },
  { value: "accessory", label: "إكسسوار" },
  { value: "tablet", label: "تابلت" },
  { value: "watch", label: "ساعة" },
  { value: "earphone", label: "سماعات" },
  { value: "other", label: "أخرى" },
];
const CONDITIONS = [
  { value: "new", label: "جديد" },
  { value: "used_good", label: "مستعمل جيد" },
  { value: "used_acceptable", label: "مستعمل مقبول" },
  { value: "refurbished", label: "مجدد" },
];

function QuickAddProductDialog({ onCreated, onClose }: {
  onCreated: (p: Product) => void; onClose: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", productType: "phone", condition: "new", price: "", costPrice: "", stock: "0" });
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const [saving, setSaving] = useState(false);
  const inputCls = "bg-white border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus-visible:ring-blue-400";

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    try {
      const res = await apiRequest("POST", "/api/products", {
        name: form.name,
        productType: form.productType,
        condition: form.condition,
        price: parseFloat(form.price) || 0,
        costPrice: parseFloat(form.costPrice) || 0,
        stock: parseInt(form.stock) || 0,
        published: true, featured: false,
        images: [], image: "",
      });
      const newProd: Product = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: `✓ تمت إضافة ${newProd.name}` });
      onCreated(newProd);
    } catch {
      toast({ title: "فشل إنشاء المنتج", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-sm shadow-xl" dir="rtl">
        <DialogHeader className="border-b border-gray-100 pb-3">
          <DialogTitle className="text-gray-900 flex items-center gap-2 text-sm font-bold">
            <PackagePlus className="w-4 h-4 text-blue-600" />
            إضافة منتج جديد للمخزون
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div>
            <Label className="text-gray-600 text-xs font-semibold mb-1.5 block">اسم المنتج *</Label>
            <Input value={form.name} onChange={e => setF("name", e.target.value)} className={inputCls} placeholder="مثال: iPhone 14 Pro 128GB" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-600 text-xs font-semibold mb-1.5 block">النوع</Label>
              <Select value={form.productType} onValueChange={v => setF("productType", v)}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-gray-800 text-sm">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-600 text-xs font-semibold mb-1.5 block">الحالة</Label>
              <Select value={form.condition} onValueChange={v => setF("condition", v)}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {CONDITIONS.map(c => <SelectItem key={c.value} value={c.value} className="text-gray-800 text-sm">{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-600 text-xs font-semibold mb-1.5 block">سعر البيع * (د.ج)</Label>
              <Input type="number" value={form.price} onChange={e => setF("price", e.target.value)} className={inputCls} placeholder="0" />
            </div>
            <div>
              <Label className="text-gray-600 text-xs font-semibold mb-1.5 block">سعر التكلفة (د.ج)</Label>
              <Input type="number" value={form.costPrice} onChange={e => setF("costPrice", e.target.value)} className={inputCls} placeholder="0" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">المخزون يُضاف تلقائياً عند اكتمال الشراء.</p>
        </div>
        <DialogFooter className="gap-2 border-t border-gray-100 pt-3">
          <Button variant="outline" onClick={onClose} className="border-gray-200 text-gray-600 text-sm">إلغاء</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.price}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة للمخزون"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductSearchPicker({ products, onSelect, onAddNew }: {
  products: Product[]; onSelect: (productId: string) => void; onAddNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative flex-1" ref={ref}>
      <div className="relative">
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="ابحث عن منتج..."
          className="w-full h-8 pr-8 pl-3 text-xs rounded-md border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          data-testid="input-product-search"
        />
      </div>
      {open && (
        <div className="absolute z-50 top-full right-0 left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && search && (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">لا توجد نتائج</div>
            )}
            {filtered.map(p => (
              <button key={p.id} type="button"
                onClick={() => { onSelect(p.id); setSearch(p.name); setOpen(false); }}
                className="w-full text-right px-3 py-2 text-xs text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between gap-2">
                <span className="font-medium truncate">{p.name}</span>
                <span className="text-gray-400 shrink-0">{p.stock} مخزون</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 p-1.5">
            <button type="button" onClick={() => { setOpen(false); onAddNew(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-semibold">
              <PackagePlus className="w-3.5 h-3.5" />
              إضافة منتج جديد للمخزون
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewPurchaseForm({ onSave, onCancel, loading, suppliers, products: initialProducts }: {
  onSave: (d: any) => void; onCancel: () => void; loading: boolean;
  suppliers: Supplier[]; products: Product[];
}) {
  const [form, setForm] = useState({
    supplierId: "", supplierName: "", referenceNumber: "", status: "pending",
    extraCosts: "", purchaseDate: new Date().toISOString().split("T")[0], notes: "",
  });
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [newItem, setNewItem] = useState({ productId: "", productName: "", productType: "", quantity: "1", unitCost: "" });
  const [newItemImeiText, setNewItemImeiText] = useState(""); // one IMEI per line
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { setProducts(initialProducts); }, [initialProducts]);

  const isPhone = (type?: string) => type === "phone" || type === "tablet";

  const addItem = () => {
    if (!newItem.productId || !newItem.unitCost) return;
    const qty = parseInt(newItem.quantity) || 1;
    const cost = parseFloat(newItem.unitCost) || 0;
    const imeis = isPhone(newItem.productType)
      ? newItemImeiText.split("\n").map(s => s.trim()).filter(Boolean)
      : undefined;
    setItems(i => [...i, {
      productId: newItem.productId,
      productName: newItem.productName,
      productType: newItem.productType,
      quantity: qty,
      unitCost: cost,
      total: qty * cost,
      imeis,
    }]);
    setNewItem({ productId: "", productName: "", productType: "", quantity: "1", unitCost: "" });
    setNewItemImeiText("");
  };
  const removeItem = (idx: number) => setItems(i => i.filter((_, j) => j !== idx));
  const updateItem = (idx: number, key: "quantity" | "unitCost", val: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const qty = key === "quantity" ? parseInt(val) || 1 : item.quantity;
      const cost = key === "unitCost" ? parseFloat(val) || 0 : item.unitCost;
      return { ...item, [key]: key === "quantity" ? qty : cost, total: qty * cost };
    }));
  };

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const extraCosts = parseFloat(form.extraCosts) || 0;
  const total = subtotal + extraCosts;

  const handleSupplierChange = (id: string) => {
    setF("supplierId", id);
    if (id !== "other") setF("supplierName", suppliers.find(s => s.id === id)?.name ?? "");
    else setF("supplierName", "");
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">المورد *</Label>
          <Select value={form.supplierId} onValueChange={handleSupplierChange}>
            <SelectTrigger className="bg-white border-gray-200 text-gray-900 text-sm" data-testid="select-purchase-supplier">
              <SelectValue placeholder="اختر مورداً" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-lg">
              {suppliers.map(s => <SelectItem key={s.id} value={s.id} className="text-gray-800 text-sm">{s.name}</SelectItem>)}
              <SelectItem value="other" className="text-gray-500 text-sm">مورد آخر (يدوي)</SelectItem>
            </SelectContent>
          </Select>
          {form.supplierId === "other" && (
            <Input value={form.supplierName} onChange={e => setF("supplierName", e.target.value)}
              placeholder="اسم المورد" className="bg-white border-gray-200 text-gray-900 text-sm mt-1.5" />
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">رقم المرجع</Label>
          <Input value={form.referenceNumber} onChange={e => setF("referenceNumber", e.target.value)}
            className="bg-white border-gray-200 text-gray-900 text-sm font-mono" placeholder="INV-001" data-testid="input-purchase-ref" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">تاريخ الشراء</Label>
          <Input type="date" value={form.purchaseDate} onChange={e => setF("purchaseDate", e.target.value)}
            className="bg-white border-gray-200 text-gray-900 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">الحالة</Label>
          <Select value={form.status} onValueChange={v => setF("status", v)}>
            <SelectTrigger className="bg-white border-gray-200 text-gray-900 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-lg">
              <SelectItem value="pending" className="text-amber-700 text-sm">معلق</SelectItem>
              <SelectItem value="completed" className="text-emerald-700 text-sm">مكتمل (يحدّث المخزون)</SelectItem>
              <SelectItem value="cancelled" className="text-red-600 text-sm">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showAddProduct && (
        <QuickAddProductDialog
          onClose={() => setShowAddProduct(false)}
          onCreated={prod => {
            setProducts(prev => [...prev, prod]);
            setNewItem(i => ({ ...i, productId: prod.id, productName: prod.name }));
            setShowAddProduct(false);
          }}
        />
      )}

      <div className="space-y-2">
        <Label className="text-gray-600 text-sm font-semibold">المنتجات</Label>
        <div className="grid grid-cols-[1fr_80px_100px_36px] gap-2">
          <ProductSearchPicker
            products={products}
            onSelect={id => {
              const prod = products.find(p => p.id === id);
              setNewItem(i => ({ ...i, productId: id, productName: prod?.name ?? "", productType: prod?.productType ?? "" }));
              setNewItemImeiText("");
            }}
            onAddNew={() => setShowAddProduct(true)}
          />
          <Input type="number" value={newItem.quantity}
            onChange={e => setNewItem(i => ({ ...i, quantity: e.target.value }))}
            className="bg-white border-gray-200 text-gray-900 text-xs h-8" placeholder="الكمية" min="1" data-testid="input-purchase-item-qty" />
          <Input type="number" value={newItem.unitCost}
            onChange={e => setNewItem(i => ({ ...i, unitCost: e.target.value }))}
            className="bg-white border-gray-200 text-gray-900 text-xs h-8" placeholder="سعر الوحدة" data-testid="input-purchase-item-cost" />
          <Button size="sm" onClick={addItem} disabled={!newItem.productId} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2 shadow-sm disabled:opacity-40" data-testid="button-add-purchase-item">
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        {/* IMEI input for phones/tablets */}
        {isPhone(newItem.productType) && newItem.productId && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1.5">
            <Label className="text-blue-700 text-xs font-bold flex items-center gap-1.5">
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">IMEI</span>
              أرقام IMEI (رقم واحد لكل سطر)
            </Label>
            <Textarea
              value={newItemImeiText}
              onChange={e => setNewItemImeiText(e.target.value)}
              placeholder={"353123456789012\n353987654321098\n..."}
              className="bg-white border-blue-200 text-gray-900 font-mono text-xs resize-none"
              rows={3}
              data-testid="textarea-purchase-item-imeis"
            />
            <p className="text-blue-600 text-[11px]">
              {newItemImeiText.split("\n").filter(s => s.trim()).length} رقم IMEI مُدخل
              {newItem.quantity && parseInt(newItem.quantity) > 0 && parseInt(newItem.quantity) !== newItemImeiText.split("\n").filter(s => s.trim()).length && (
                <span className="text-amber-600 mr-2">⚠ الكمية {newItem.quantity} لا تتطابق مع عدد IMEI</span>
              )}
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <th className="text-right p-2.5 font-semibold">المنتج</th>
                  <th className="text-center p-2.5 font-semibold w-20">الكمية</th>
                  <th className="text-right p-2.5 font-semibold w-28">سعر الوحدة</th>
                  <th className="text-right p-2.5 font-semibold w-28">الإجمالي</th>
                  <th className="w-8 p-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <>
                  <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/70">
                    <td className="p-2.5 text-gray-800 font-medium">
                      {item.productName}
                      {item.imeis && item.imeis.length > 0 && (
                        <span className="mr-2 text-[10px] bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-mono">
                          {item.imeis.length} IMEI
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <Input type="number" value={item.quantity} min="1"
                        onChange={e => updateItem(idx, "quantity", e.target.value)}
                        className="bg-white border-gray-200 text-gray-900 text-xs h-7 w-16 mx-auto text-center" />
                    </td>
                    <td className="p-2">
                      <Input type="number" value={item.unitCost}
                        onChange={e => updateItem(idx, "unitCost", e.target.value)}
                        className="bg-white border-gray-200 text-gray-900 text-xs h-7 text-right" />
                    </td>
                    <td className="p-2.5 text-emerald-700 font-bold">{formatCurrency(item.total)}</td>
                    <td className="p-2.5">
                      <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                  {item.imeis && item.imeis.length > 0 && (
                    <tr key={`${idx}-imeis`} className="border-b border-blue-50 bg-blue-50/30">
                      <td colSpan={5} className="px-3 pb-2 text-[10px] text-blue-600 font-mono">
                        {item.imeis.map((im, i) => (
                          <span key={i} className="ml-2 bg-white border border-blue-100 px-1 rounded">{im}</span>
                        ))}
                      </td>
                    </tr>
                  )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {items.length > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>المجموع الفرعي ({items.length} منتج)</span>
              <span className="text-gray-800 font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <Label className="text-gray-500">تكاليف إضافية (شحن، جمارك...)</Label>
              <Input type="number" value={form.extraCosts} onChange={e => setF("extraCosts", e.target.value)}
                className="bg-white border-gray-200 text-gray-900 text-xs h-7 w-28 text-right" placeholder="0" />
            </div>
            <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-200 pt-2">
              <span>الإجمالي الكلي</span>
              <span className="text-blue-700">{formatCurrency(total)}</span>
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-xs">
            أضف منتجات لهذا الشراء باستخدام القائمة أعلاه
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-600 text-sm font-semibold">ملاحظات</Label>
        <Textarea value={form.notes} onChange={e => setF("notes", e.target.value)}
          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none text-sm" rows={2} />
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onCancel} className="border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">إلغاء</Button>
        <Button onClick={() => onSave({
            ...form,
            supplierId: form.supplierId === "other" ? null : form.supplierId || null,
            supplierName: form.supplierName || suppliers.find(s => s.id === form.supplierId)?.name || "",
            subtotal: subtotal.toFixed(2), extraCosts: extraCosts.toFixed(2), total: total.toFixed(2),
            purchaseDate: new Date(form.purchaseDate),
            items: items.map(i => ({ ...i, unitCost: i.unitCost.toFixed(2), total: i.total.toFixed(2) })),
          })}
          disabled={loading || !form.supplierName || items.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm" data-testid="button-save-purchase">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الحفظ...</> : "حفظ الشراء"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function ViewPurchaseDialog({ purchase, onClose, onComplete, onCancel: onCancelPur, onDelete }: {
  purchase: any; onClose: () => void;
  onComplete: () => void; onCancel: () => void; onDelete: () => void;
}) {
  const sc = STATUS_CONFIG[purchase.status] ?? STATUS_CONFIG.pending;
  const items = (purchase.items ?? []) as PurchaseItem[];
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" dir="rtl">
        <DialogHeader className="border-b border-gray-100 pb-3">
          <DialogTitle className="text-gray-900 flex items-center gap-2 text-sm font-bold">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            {purchase.supplierName} — {purchase.referenceNumber ?? ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm pt-1">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <p className="text-gray-400 mb-1">الحالة</p>
              <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full border ${sc.cls}`}>{sc.label}</span>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <p className="text-gray-400 mb-1">التاريخ</p>
              <p className="text-gray-700">{formatDate(purchase.purchaseDate)}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <p className="text-gray-400 mb-1">الإجمالي</p>
              <p className="text-blue-700 font-bold">{formatCurrency(parseFloat(purchase.total || "0"))}</p>
            </div>
          </div>
          {items.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="text-right p-2.5 font-semibold">المنتج</th>
                    <th className="text-center p-2.5 font-semibold">الكمية</th>
                    <th className="text-right p-2.5 font-semibold">سعر الوحدة</th>
                    <th className="text-right p-2.5 font-semibold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/70">
                      <td className="p-2.5 text-gray-800">{item.productName}</td>
                      <td className="p-2.5 text-center text-gray-600">{item.quantity}</td>
                      <td className="p-2.5 text-gray-600">{formatCurrency(parseFloat(item.unitCost || "0"))}</td>
                      <td className="p-2.5 text-emerald-700 font-bold">{formatCurrency(parseFloat(item.total || "0"))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {purchase.notes && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">ملاحظات</p>
              <p className="text-gray-700 text-xs">{purchase.notes}</p>
            </div>
          )}
          {purchase.status === "pending" && (
            <div className="flex gap-2">
              <Button onClick={onComplete} className="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-sm shadow-none">
                <Check className="w-4 h-4 ml-2" /> إتمام (يحدّث المخزون)
              </Button>
              <Button onClick={onCancelPur} variant="outline" className="border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 text-sm">
                <X className="w-4 h-4 ml-1" /> إلغاء
              </Button>
            </div>
          )}
          <Button onClick={onDelete} variant="outline" className="w-full border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 text-sm">
            <Trash2 className="w-4 h-4 ml-2" /> حذف الشراء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPurchases() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [viewPurchase, setViewPurchase] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: purchases = [], isLoading } = useQuery<Purchase[]>({ queryKey: ["/api/purchases"] });
  const { data: suppliers = [] } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/purchases", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      setOpen(false); toast({ title: "تم إنشاء الشراء" });
    },
    onError: (e: any) => toast({ title: "فشل إنشاء الشراء", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/purchases/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      setViewPurchase(null);
      toast({ title: "تم تحديث الحالة" });
    },
    onError: () => toast({ title: "فشل التحديث", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/purchases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      setViewPurchase(null);
      toast({ title: "تم الحذف" });
    },
    onError: () => toast({ title: "فشل الحذف", variant: "destructive" }),
  });

  const filtered = purchases.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.supplierName.toLowerCase().includes(q) || (p.referenceNumber ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalCompleted = purchases.filter(p => p.status === "completed").reduce((s, p) => s + parseFloat(p.total as string || "0"), 0);
  const pendingCount = purchases.filter(p => p.status === "pending").length;

  return (
    <AdminLayout>
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">المشتريات</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {purchases.length} عملية • قيمة مكتملة:{" "}
              <span className="text-emerald-700 font-semibold">{formatCurrency(totalCompleted)}</span>
              {pendingCount > 0 && <> • <span className="text-amber-600">{pendingCount} معلق</span></>}
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm shadow-sm" data-testid="button-add-purchase">
            <Plus className="w-4 h-4" /> شراء جديد
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالمورد أو المرجع..." className="bg-white border-gray-200 text-gray-900 pr-9 text-sm h-9" />
          </div>
          <div className="flex gap-1.5">
            {[{ k: "all", l: "الكل" }, { k: "pending", l: "معلق" }, { k: "completed", l: "مكتمل" }, { k: "cancelled", l: "ملغي" }].map(btn => (
              <button key={btn.k} onClick={() => setStatusFilter(btn.k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  statusFilter === btn.k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}>{btn.l}</button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs">
                    <th className="text-right p-3 font-semibold">المورد</th>
                    <th className="text-right p-3 font-semibold hidden sm:table-cell">المرجع</th>
                    <th className="text-right p-3 font-semibold hidden md:table-cell">التاريخ</th>
                    <th className="text-right p-3 font-semibold hidden lg:table-cell">المنتجات</th>
                    <th className="text-right p-3 font-semibold">الإجمالي</th>
                    <th className="text-center p-3 font-semibold">الحالة</th>
                    <th className="text-center p-3 font-semibold w-28 hidden sm:table-cell">إجراء</th>
                    <th className="text-center p-3 font-semibold w-12 sm:hidden">عرض</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-16">
                      <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <ShoppingBag className="w-7 h-7 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-semibold">لا توجد مشتريات</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {search || statusFilter !== "all" ? "جرب تغيير الفلتر" : "أنشئ أول شراء لزيادة المخزون من الموردين"}
                      </p>
                      {!search && statusFilter === "all" && (
                        <Button onClick={() => setOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm shadow-sm">
                          <Plus className="w-4 h-4" /> شراء جديد
                        </Button>
                      )}
                    </td></tr>
                  ) : filtered.map(pur => {
                    const sc = STATUS_CONFIG[pur.status] ?? STATUS_CONFIG.pending;
                    const items = ((pur as any).items ?? []) as any[];
                    return (
                      <tr key={pur.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors cursor-pointer"
                        onClick={() => setViewPurchase(pur)} data-testid={`row-purchase-${pur.id}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <p className="text-gray-800 font-semibold text-sm">{pur.supplierName}</p>
                          </div>
                        </td>
                        <td className="p-3 text-gray-400 text-xs font-mono hidden sm:table-cell">{pur.referenceNumber ?? "—"}</td>
                        <td className="p-3 text-gray-400 text-xs hidden md:table-cell">{formatDate(pur.purchaseDate?.toString())}</td>
                        <td className="p-3 text-gray-400 text-xs hidden lg:table-cell">
                          {items.length > 0 ? `${items.length} منتج` : "—"}
                        </td>
                        <td className="p-3">
                          <span className="text-blue-700 font-bold">{formatCurrency(parseFloat(pur.total as string || "0"))}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.cls}`}>{sc.label}</span>
                        </td>
                        <td className="p-3 hidden sm:table-cell" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 justify-center">
                            {pur.status === "pending" && (
                              <>
                                <Button size="sm" onClick={() => statusMutation.mutate({ id: pur.id, status: "completed" })}
                                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-none text-xs h-7 px-2"
                                  disabled={statusMutation.isPending} data-testid={`button-complete-purchase-${pur.id}`}>
                                  <Check className="w-3 h-3 ml-0.5" /> إتمام
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: pur.id, status: "cancelled" })}
                                  className="border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 text-xs h-7 px-2"
                                  disabled={statusMutation.isPending} data-testid={`button-cancel-purchase-${pur.id}`}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            <button onClick={() => { if (confirm("حذف؟")) deleteMutation.mutate(pur.id); }}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              data-testid={`button-delete-purchase-${pur.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center sm:hidden">
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl" dir="rtl">
            <DialogHeader className="border-b border-gray-100 pb-3">
              <DialogTitle className="text-gray-900 flex items-center gap-2 font-bold">
                <ShoppingBag className="w-4 h-4 text-blue-600" /> شراء جديد
              </DialogTitle>
            </DialogHeader>
            <div className="pt-1">
              <NewPurchaseForm onSave={data => createMutation.mutate(data)} onCancel={() => setOpen(false)}
                loading={createMutation.isPending} suppliers={suppliers} products={products} />
            </div>
          </DialogContent>
        </Dialog>

        {viewPurchase && (
          <ViewPurchaseDialog
            purchase={viewPurchase}
            onClose={() => setViewPurchase(null)}
            onComplete={() => statusMutation.mutate({ id: viewPurchase.id, status: "completed" })}
            onCancel={() => statusMutation.mutate({ id: viewPurchase.id, status: "cancelled" })}
            onDelete={() => { if (confirm("حذف الشراء؟")) deleteMutation.mutate(viewPurchase.id); }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
