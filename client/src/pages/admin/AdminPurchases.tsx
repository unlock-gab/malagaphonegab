import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus, ShoppingBag, Trash2, Check, X, Building2, Search, ChevronRight,
  Loader2, PackagePlus, Package, Smartphone, ChevronDown, UserRound, Save,
  Handshake, Percent, Wallet, History, BadgeDollarSign, Clock, CreditCard,
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
import { useAdminLang } from "@/context/AdminLangContext";
import type { Purchase, Supplier, Product, Partner } from "@shared/schema";

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

const PAY_STATUS: Record<string, { label: string; cls: string }> = {
  unpaid:          { label: "غير مدفوع",    cls: "bg-red-50 text-red-600 border-red-200" },
  partially_paid:  { label: "مدفوع جزئياً", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  paid:            { label: "مدفوع كامل",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "cash",     label: "نقداً" },
  { value: "transfer", label: "تحويل بنكي" },
  { value: "cheque",   label: "شيك" },
  { value: "other",    label: "أخرى" },
];

function getPaymentStatus(total: number, paid: number) {
  if (paid <= 0) return "unpaid";
  if (paid >= total - 0.01) return "paid";
  return "partially_paid";
}

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
  onCreated: (p: Product, imeis: string[]) => void; onClose: () => void;
}) {
  const { dir } = useAdminLang();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", productType: "phone", condition: "new", price: "", costPrice: "" });
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const [imeiText, setImeiText] = useState("");
  const [saving, setSaving] = useState(false);
  const inputCls = "bg-white border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus-visible:ring-blue-400";

  const needsImei = form.productType === "phone" || form.productType === "tablet";
  const imeiList = imeiText.split("\n").map(s => s.trim()).filter(Boolean);
  const imeiMissing = needsImei && imeiList.length === 0;

  const handleSave = async () => {
    if (!form.name || !form.price || imeiMissing) return;
    setSaving(true);
    try {
      const res = await apiRequest("POST", "/api/products", {
        name: form.name,
        productType: form.productType,
        condition: form.condition,
        price: parseFloat(form.price) || 0,
        costPrice: parseFloat(form.costPrice) || 0,
        stock: 0,
        published: true, featured: false,
        images: [], image: "",
      });
      const newProd: Product = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: `✓ تمت إضافة ${newProd.name}` });
      onCreated(newProd, needsImei ? imeiList : []);
    } catch {
      toast({ title: "فشل إنشاء المنتج", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-sm shadow-xl" dir={dir}>
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
              <Select value={form.productType} onValueChange={v => { setF("productType", v); setImeiText(""); }}>
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

          {/* IMEI — إجباري للهواتف والتابلتات */}
          {needsImei && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5 text-orange-600">
                <Smartphone className="w-3.5 h-3.5" />
                رقم IMEI * <span className="text-[10px] text-gray-400 font-normal">(سطر واحد لكل IMEI)</span>
              </Label>
              <textarea
                value={imeiText}
                onChange={e => setImeiText(e.target.value)}
                rows={Math.max(2, imeiList.length + 1)}
                placeholder={"358000000000001\n358000000000002"}
                className={`w-full rounded-md border text-sm font-mono px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  imeiMissing && imeiText !== ""
                    ? "border-red-400 bg-red-50"
                    : imeiList.length > 0
                    ? "border-green-400 bg-green-50"
                    : "border-orange-300 bg-orange-50"
                }`}
                data-testid="input-quick-product-imei"
              />
              <div className="flex items-center justify-between mt-1">
                {imeiList.length > 0 ? (
                  <span className="text-[10px] text-green-600 font-semibold">✓ {imeiList.length} IMEI مُدخل</span>
                ) : (
                  <span className="text-[10px] text-orange-500">أدخل رقم IMEI واحد على الأقل</span>
                )}
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-400">المخزون يُضاف تلقائياً عند اكتمال الشراء.</p>
        </div>
        <DialogFooter className="gap-2 border-t border-gray-100 pt-3">
          <Button variant="outline" onClick={onClose} className="border-gray-200 text-gray-600 text-sm">إلغاء</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.name || !form.price || imeiMissing}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm disabled:opacity-50"
            data-testid="btn-quick-product-save"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة للمخزون"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductSearchPicker({ products, onSelect, onAddNew, selectedName, onClear }: {
  products: Product[]; onSelect: (productId: string) => void; onAddNew: () => void;
  selectedName?: string; onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Sync displayed text when external selection changes (e.g. QuickAdd)
  useEffect(() => {
    if (selectedName !== undefined) setSearch(selectedName);
  }, [selectedName]);

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
          onChange={e => {
            const val = e.target.value;
            setSearch(val);
            setOpen(true);
            // Clear parent selection when text is fully removed
            if (!val.trim()) onClear?.();
          }}
          onClick={() => setOpen(true)}
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

// ─── Supplier Combobox with search & quick-save ────────────────────────────────
function SupplierCombobox({ suppliers, supplierId, supplierName, onSelect }: {
  suppliers: Supplier[];
  supplierId: string;
  supplierName: string;
  onSelect: (supplierId: string | null, supplierName: string) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search.trim()
    ? suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : suppliers;

  const exactMatch = suppliers.find(s => s.name.toLowerCase() === search.trim().toLowerCase());
  const showCreate = search.trim().length > 0 && !exactMatch;

  const displayValue = supplierId
    ? (suppliers.find(s => s.id === supplierId)?.name ?? supplierName)
    : supplierName;

  const handleCreate = async () => {
    if (!search.trim() || saving) return;
    setSaving(true);
    try {
      const res = await apiRequest("POST", "/api/suppliers", { name: search.trim() });
      const newS: Supplier = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      onSelect(newS.id, newS.name);
      setSearch("");
      setOpen(false);
      toast({ title: `✓ تم حفظ "${newS.name}" في قاعدة البيانات` });
    } catch {
      toast({ title: "فشل حفظ المورد", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          value={open ? search : displayValue}
          onChange={e => { setSearch(e.target.value); setOpen(true); if (!e.target.value) onSelect("", ""); }}
          onClick={() => { setOpen(true); setSearch(""); }}
          placeholder="ابحث عن مورد أو اكتب اسماً جديداً..."
          className="w-full h-9 pr-8 pl-8 text-sm rounded-md border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          data-testid="input-supplier-search"
        />
        <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {/* Selected tag */}
      {!open && displayValue && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {supplierId ? (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">محفوظ</span>
          ) : (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">يدوي</span>
          )}
        </div>
      )}
      {open && (
        <div className="absolute z-50 top-full right-0 left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && !showCreate && (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">لا يوجد موردون. اكتب اسماً لإضافته</div>
            )}
            {filtered.map(s => (
              <button key={s.id} type="button"
                onClick={() => { onSelect(s.id, s.name); setSearch(""); setOpen(false); }}
                className={`w-full text-right px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  s.id === supplierId ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-800 hover:bg-gray-50"
                }`}>
                <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="flex-1 truncate">{s.name}</span>
                {s.id === supplierId && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </button>
            ))}
          </div>
          {showCreate && (
            <div className="border-t border-gray-100 p-1.5 space-y-1">
              <button type="button" onClick={handleCreate} disabled={saving}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors font-semibold border border-emerald-200">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                حفظ "{search.trim()}" كمورد في قاعدة البيانات
              </button>
              <button type="button"
                onClick={() => { onSelect("", search.trim()); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">
                <UserRound className="w-3.5 h-3.5" />
                استخدام "{search.trim()}" بدون حفظ (مؤقت)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewPurchaseForm({ onSave, onCancel, loading, suppliers, products: initialProducts, partners }: {
  onSave: (d: any) => void; onCancel: () => void; loading: boolean;
  suppliers: Supplier[]; products: Product[]; partners: Partner[];
}) {
  const { dir } = useAdminLang();
  const [form, setForm] = useState({
    supplierId: "", supplierName: "", referenceNumber: "", status: "pending",
    extraCosts: "", purchaseDate: new Date().toISOString().split("T")[0], notes: "",
  });
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>("");
  const [partnerPercentage, setPartnerPercentage] = useState<string>("");
  const [partnerSearchOpen, setPartnerSearchOpen] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState("");
  const partnerRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [newItem, setNewItem] = useState({ productId: "", productName: "", productType: "", quantity: "1", unitCost: "" });
  const [newItemImeiText, setNewItemImeiText] = useState("");
  const [pickerKey, setPickerKey] = useState(0);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (partnerRef.current && !partnerRef.current.contains(e.target as Node)) setPartnerSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectPartner = (p: Partner) => {
    setPartnerId(p.id);
    setPartnerName(p.name);
    setPartnerPercentage(parseFloat(p.defaultShare || "50").toString());
    setPartnerSearch(p.name);
    setPartnerSearchOpen(false);
  };
  const clearPartner = () => {
    setPartnerId(null);
    setPartnerName("");
    setPartnerPercentage("");
    setPartnerSearch("");
  };

  const filteredPartners = partnerSearch.trim()
    ? partners.filter(p => p.name.toLowerCase().includes(partnerSearch.toLowerCase()))
    : partners;

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
    setPickerKey(k => k + 1);
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

  return (
    <div className="space-y-4" dir={dir}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">المورد *</Label>
          <SupplierCombobox
            suppliers={suppliers}
            supplierId={form.supplierId}
            supplierName={form.supplierName}
            onSelect={(id, name) => {
              setF("supplierId", id ?? "");
              setF("supplierName", name);
            }}
          />
          {form.supplierName && !form.supplierId && (
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <UserRound className="w-3 h-3" /> مورد يدوي — لن يُحفظ في قاعدة البيانات
            </p>
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
          onCreated={(prod, imeis) => {
            setProducts(prev => [...prev, prod]);
            setNewItem(i => ({
              ...i,
              productId: prod.id,
              productName: prod.name,
              productType: prod.productType ?? "",
            }));
            if (imeis && imeis.length > 0) setNewItemImeiText(imeis.join("\n"));
            setShowAddProduct(false);
          }}
        />
      )}

      <div className="space-y-2">
        <Label className="text-gray-600 text-sm font-semibold">المنتجات</Label>
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_72px_100px_36px] gap-2">
          <span className="text-[10px] text-gray-400 font-semibold pr-1">المنتج</span>
          <span className="text-[10px] text-gray-400 font-semibold text-center">الكمية</span>
          <span className="text-[10px] text-gray-400 font-semibold">سعر الوحدة (د.ج)</span>
          <span />
        </div>
        <div className="grid grid-cols-[1fr_72px_100px_36px] gap-2 items-center">
          <ProductSearchPicker
            key={pickerKey}
            products={products}
            selectedName={newItem.productName}
            onSelect={id => {
              const prod = products.find(p => p.id === id);
              setNewItem(i => ({ ...i, productId: id, productName: prod?.name ?? "", productType: prod?.productType ?? "" }));
              setNewItemImeiText("");
            }}
            onClear={() => {
              setNewItem(i => ({ ...i, productId: "", productName: "", productType: "" }));
              setNewItemImeiText("");
            }}
            onAddNew={() => setShowAddProduct(true)}
          />
          <Input
            type="number"
            value={newItem.quantity}
            onChange={e => setNewItem(i => ({ ...i, quantity: e.target.value }))}
            className="bg-white border-gray-200 text-gray-900 text-xs h-8 text-center"
            placeholder="1"
            min="1"
            data-testid="input-purchase-item-qty"
          />
          <Input
            type="number"
            value={newItem.unitCost}
            onChange={e => setNewItem(i => ({ ...i, unitCost: e.target.value }))}
            className={`bg-white text-gray-900 text-xs h-8 ${!newItem.unitCost && newItem.productId ? "border-orange-300 focus-visible:ring-orange-400" : "border-gray-200"}`}
            placeholder="أدخل السعر"
            data-testid="input-purchase-item-cost"
          />
          <Button
            size="sm"
            onClick={addItem}
            disabled={!newItem.productId || !newItem.unitCost}
            title={!newItem.productId ? "اختر منتجاً أولاً" : !newItem.unitCost ? "أدخل سعر الوحدة" : "إضافة للقائمة"}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="button-add-purchase-item"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        {/* Helper hint */}
        {newItem.productId && !newItem.unitCost && (
          <p className="text-[11px] text-orange-500 flex items-center gap-1 mt-0.5">
            ↑ أدخل سعر الوحدة لتفعيل زر الإضافة
          </p>
        )}

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

      {/* ── Partner Section ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-gray-600 text-sm font-semibold flex items-center gap-1.5">
          <Handshake className="w-3.5 h-3.5 text-blue-500" />
          الشريك في هذا الشراء
          <span className="text-gray-400 font-normal text-xs">(اختياري)</span>
        </Label>
        <div className="relative" ref={partnerRef}>
          <div className="relative">
            <Handshake className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              value={partnerSearch}
              onChange={e => { setPartnerSearch(e.target.value); setPartnerSearchOpen(true); if (!e.target.value) clearPartner(); }}
              onClick={() => setPartnerSearchOpen(true)}
              placeholder="اختر شريكاً أو ابحث عن اسمه..."
              className="w-full h-9 pr-8 pl-8 text-sm rounded-md border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              data-testid="input-partner-search"
            />
            {partnerName && (
              <button type="button" onClick={clearPartner}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {partnerSearchOpen && (
            <div className="absolute z-50 top-full right-0 left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              <div className="max-h-40 overflow-y-auto">
                {filteredPartners.length === 0 && (
                  <div className="px-3 py-3 text-xs text-gray-400 text-center">
                    {partners.length === 0 ? "لا يوجد شركاء بعد — أضف شريكاً من صفحة الشركاء" : "لا توجد نتائج"}
                  </div>
                )}
                {filteredPartners.map(p => (
                  <button key={p.id} type="button" onClick={() => selectPartner(p)}
                    className="w-full text-right px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between gap-2">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                      {parseFloat(p.defaultShare || "50").toFixed(0)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Percentage override — shown only when a partner is selected */}
        {partnerName && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Handshake className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-900 truncate">{partnerName}</p>
                <p className="text-xs text-blue-500">شريك في هذا الشراء</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Label className="text-xs text-blue-700 font-medium whitespace-nowrap">الحصة:</Label>
              <div className="relative w-20">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={partnerPercentage}
                  onChange={e => setPartnerPercentage(e.target.value)}
                  className="bg-white border-blue-200 text-blue-900 text-sm h-8 pl-6 text-right"
                  data-testid="input-partner-percentage"
                />
                <Percent className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-600 text-sm font-semibold">ملاحظات</Label>
        <Textarea value={form.notes} onChange={e => setF("notes", e.target.value)}
          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none text-sm" rows={2} />
      </div>

      <DialogFooter className="gap-2 flex-wrap">
        <Button variant="outline" onClick={onCancel} className="border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">إلغاء</Button>
        <Button onClick={() => onSave({
            ...form, status: "pending",
            supplierId: form.supplierId || null,
            supplierName: form.supplierName || suppliers.find(s => s.id === form.supplierId)?.name || "",
            subtotal: subtotal.toFixed(2), extraCosts: extraCosts.toFixed(2), total: total.toFixed(2),
            purchaseDate: new Date(form.purchaseDate),
            partnerId: partnerId || null,
            partnerName: partnerName || null,
            partnerPercentage: partnerName && partnerPercentage ? partnerPercentage : null,
            items: items.map(i => ({ ...i, unitCost: i.unitCost.toFixed(2), total: i.total.toFixed(2) })),
          })}
          disabled={loading || !form.supplierName || items.length === 0}
          variant="outline"
          className="border-gray-200 text-gray-600 hover:bg-gray-50 text-sm" data-testid="button-save-purchase-pending">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ معلق"}
        </Button>
        <Button onClick={() => onSave({
            ...form, status: "completed",
            supplierId: form.supplierId || null,
            supplierName: form.supplierName || suppliers.find(s => s.id === form.supplierId)?.name || "",
            subtotal: subtotal.toFixed(2), extraCosts: extraCosts.toFixed(2), total: total.toFixed(2),
            purchaseDate: new Date(form.purchaseDate),
            partnerId: partnerId || null,
            partnerName: partnerName || null,
            partnerPercentage: partnerName && partnerPercentage ? partnerPercentage : null,
            items: items.map(i => ({ ...i, unitCost: i.unitCost.toFixed(2), total: i.total.toFixed(2) })),
          })}
          disabled={loading || !form.supplierName || items.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm shadow-sm" data-testid="button-save-purchase-complete">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الحفظ...</> : <><Check className="w-4 h-4 ml-2" />حفظ وإتمام ← يضيف للمخزون</>}
        </Button>
      </DialogFooter>
    </div>
  );
}

function VersementModal({ purchase, onClose }: { purchase: any; onClose: () => void }) {
  const { dir } = useAdminLang();
  const { toast } = useToast();
  const total = parseFloat(purchase.total || "0");

  const { data: rawPayments, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/purchases", purchase.id, "payments"],
    queryFn: async () => {
      const r = await fetch(`/api/purchases/${purchase.id}/payments`, { credentials: "include" });
      if (!r.ok) throw new Error("فشل تحميل الدفعات");
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
  });
  const payments = Array.isArray(rawPayments) ? rawPayments : [];

  const totalPaid = payments.reduce((s: number, p: any) => s + parseFloat(p.amount || "0"), 0);
  const remaining = Math.max(0, total - totalPaid);
  const payStatus = getPaymentStatus(total, totalPaid);
  const ps = PAY_STATUS[payStatus];

  const [form, setForm] = useState({ amount: "", paymentMethod: "cash", date: new Date().toISOString().split("T")[0], notes: "" });
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/purchases/${purchase.id}/payments`, {
      amount: parseFloat(form.amount),
      paymentMethod: form.paymentMethod,
      paymentDate: new Date(form.date),
      notes: form.notes || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases", purchase.id, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases/payments-summary"] });
      refetch();
      setForm(f => ({ ...f, amount: "", notes: "" }));
      toast({ title: "✓ تم تسجيل الدفعة" });
    },
    onError: (e: any) => toast({ title: "فشل", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/purchase-payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases", purchase.id, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases/payments-summary"] });
      refetch();
      toast({ title: "تم الحذف" });
    },
  });

  const amountVal = parseFloat(form.amount) || 0;
  const canSubmit = amountVal > 0 && amountVal <= remaining + 0.01;

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg max-h-[92vh] overflow-y-auto shadow-xl" dir={dir}>
        <DialogHeader className="border-b border-gray-100 pb-3">
          <DialogTitle className="text-gray-900 flex items-center gap-2 text-sm font-bold">
            <Wallet className="w-4 h-4 text-blue-600" />
            دفعات المورد — {purchase.supplierName}
            {purchase.referenceNumber && <span className="text-gray-400 font-mono text-xs">#{purchase.referenceNumber}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-400 mb-1">الإجمالي</p>
              <p className="text-sm font-black text-blue-700">{formatCurrency(total)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-400 mb-1">مدفوع</p>
              <p className="text-sm font-black text-emerald-700">{formatCurrency(totalPaid)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center border ${remaining > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
              <p className={`text-xs mb-1 ${remaining > 0 ? "text-red-400" : "text-gray-400"}`}>متبقي</p>
              <p className={`text-sm font-black ${remaining > 0 ? "text-red-600" : "text-gray-400"}`}>{formatCurrency(remaining)}</p>
            </div>
          </div>

          {/* Payment status badge */}
          <div className="flex items-center justify-center">
            <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${ps.cls}`}>{ps.label}</span>
          </div>

          {/* Add versement form */}
          {remaining > 0.01 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                <BadgeDollarSign className="w-3.5 h-3.5 text-blue-600" /> إضافة دفعة جديدة
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">المبلغ * (د.ج)</Label>
                  <Input
                    type="number" min="1" step="1"
                    value={form.amount} onChange={e => setF("amount", e.target.value)}
                    placeholder={`أقصى: ${Math.round(remaining)}`}
                    className="bg-white border-gray-200 text-gray-900 text-sm h-8"
                    data-testid="input-versement-amount"
                  />
                </div>
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">طريقة الدفع</Label>
                  <Select value={form.paymentMethod} onValueChange={v => setF("paymentMethod", v)}>
                    <SelectTrigger className="bg-white border-gray-200 text-gray-900 text-sm h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-lg">
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value} className="text-sm text-gray-800">{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">التاريخ</Label>
                  <Input type="date" value={form.date} onChange={e => setF("date", e.target.value)}
                    className="bg-white border-gray-200 text-gray-900 text-sm h-8" />
                </div>
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">ملاحظة (اختياري)</Label>
                  <Input value={form.notes} onChange={e => setF("notes", e.target.value)}
                    className="bg-white border-gray-200 text-gray-900 text-sm h-8" placeholder="ملاحظة..." />
                </div>
              </div>
              {amountVal > 0 && amountVal > remaining + 0.01 && (
                <p className="text-xs text-red-500">المبلغ أكبر من المتبقي ({formatCurrency(remaining)})</p>
              )}
              <Button onClick={() => addMutation.mutate()} disabled={!canSubmit || addMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-8 shadow-sm"
                data-testid="button-add-versement">
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-3.5 h-3.5 ml-2" />تسجيل الدفعة</>}
              </Button>
            </div>
          )}

          {/* Versement history */}
          <div>
            <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5 mb-2">
              <History className="w-3.5 h-3.5 text-blue-600" /> سجل الدفعات
            </p>
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-xs py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...
              </div>
            ) : payments.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-xs">
                لا توجد دفعات مسجّلة بعد
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                      <th className="text-right p-2.5 font-semibold">التاريخ</th>
                      <th className="text-right p-2.5 font-semibold">المبلغ</th>
                      <th className="text-right p-2.5 font-semibold hidden sm:table-cell">الطريقة</th>
                      <th className="text-right p-2.5 font-semibold hidden sm:table-cell">ملاحظة</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id} className="border-b border-gray-50 last:border-0">
                        <td className="p-2.5">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-3 h-3 text-gray-300" />
                            <span>{formatDate(p.paymentDate)}</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-emerald-700 font-bold">
                          {formatCurrency(parseFloat(p.amount || "0"))}
                        </td>
                        <td className="p-2.5 text-gray-500 hidden sm:table-cell">
                          {PAYMENT_METHODS.find(m => m.value === p.paymentMethod)?.label ?? p.paymentMethod ?? "—"}
                        </td>
                        <td className="p-2.5 text-gray-400 hidden sm:table-cell">{p.notes || "—"}</td>
                        <td className="p-2.5">
                          <button onClick={() => { if (confirm("حذف؟")) deleteMutation.mutate(p.id); }}
                            className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewPurchaseDialog({ purchase, onClose, onComplete, onCancel: onCancelPur, onDelete, onVersement }: {
  purchase: any; onClose: () => void;
  onComplete: () => void; onCancel: () => void; onDelete: () => void;
  onVersement?: () => void;
}) {
  const { dir } = useAdminLang();
  const { data: full, isLoading } = useQuery<any>({
    queryKey: ["/api/purchases", purchase.id],
    queryFn: () => fetch(`/api/purchases/${purchase.id}`, { credentials: "include" }).then(r => r.json()),
  });

  const data = full ?? purchase;
  const sc = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.pending;
  const items = (data.items ?? []) as PurchaseItem[];
  const extraCosts = parseFloat(data.extraCosts || "0");

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" dir={dir}>
        <DialogHeader className="border-b border-gray-100 pb-3">
          <DialogTitle className="text-gray-900 flex items-center gap-2 text-sm font-bold">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            تفاصيل الشراء — {data.supplierName}
            {data.referenceNumber ? <span className="text-gray-400 font-mono text-xs">#{data.referenceNumber}</span> : null}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm pt-1">
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <p className="text-gray-400 mb-1">الحالة</p>
              <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full border ${sc.cls}`}>{sc.label}</span>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <p className="text-gray-400 mb-1">التاريخ</p>
              <p className="text-gray-700">{formatDate(data.purchaseDate)}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <p className="text-gray-400 mb-1">الإجمالي</p>
              <p className="text-blue-700 font-bold">{formatCurrency(parseFloat(data.total || "0"))}</p>
            </div>
          </div>

          {/* ── Partner badge ── */}
          {data.partnerName && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Handshake className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-500 mb-0.5">شريك في هذا الشراء</p>
                <p className="text-sm font-bold text-blue-900">{data.partnerName}</p>
              </div>
              {data.partnerPercentage && (
                <div className="text-center">
                  <p className="text-2xl font-black text-blue-700">{parseFloat(data.partnerPercentage).toFixed(0)}%</p>
                  <p className="text-xs text-blue-400">الحصة</p>
                </div>
              )}
            </div>
          )}

          {/* ── Items table ── */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" /> جاري تحميل المنتجات…
            </div>
          ) : items.length > 0 ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-3 py-2 flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-gray-600">المنتجات المشتراة ({items.length})</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="text-right p-2.5 font-semibold">المنتج</th>
                    <th className="text-center p-2.5 font-semibold">الكمية</th>
                    <th className="text-right p-2.5 font-semibold">سعر الوحدة</th>
                    <th className="text-right p-2.5 font-semibold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, i: number) => {
                    const imeis: string[] = item.imeis ?? [];
                    return (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="p-2.5">
                          <p className="text-gray-800 font-medium">{item.productName}</p>
                          {imeis.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {imeis.map((imei, j) => (
                                <span key={j} className="inline-block font-mono text-[10px] bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5 ml-1">
                                  {imei}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-center text-gray-600">{item.quantity}</td>
                        <td className="p-2.5 text-gray-600">{formatCurrency(parseFloat(item.unitCost || "0"))}</td>
                        <td className="p-2.5 text-emerald-700 font-bold">{formatCurrency(parseFloat(item.total || "0"))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Subtotal / extra costs / total footer */}
              <div className="bg-gray-50 border-t border-gray-100 px-3 py-2 space-y-1 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>المجموع الفرعي</span>
                  <span>{formatCurrency(parseFloat(data.subtotal || "0"))}</span>
                </div>
                {extraCosts > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>تكاليف إضافية</span>
                    <span>{formatCurrency(extraCosts)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-1 mt-1">
                  <span>الإجمالي الكلي</span>
                  <span className="text-blue-700">{formatCurrency(parseFloat(data.total || "0"))}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-xs">
              لا توجد منتجات مسجّلة لهذا الشراء
            </div>
          )}

          {/* ── Notes ── */}
          {data.notes && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">ملاحظات</p>
              <p className="text-gray-700 text-xs">{data.notes}</p>
            </div>
          )}

          {/* ── Actions ── */}
          {onVersement && (
            <Button onClick={onVersement} className="w-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm shadow-none" data-testid="button-view-versements">
              <Wallet className="w-4 h-4 ml-2" /> دفعات المورد (Versements)
            </Button>
          )}
          {data.status === "pending" && (
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
  const { dir } = useAdminLang();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [viewPurchase, setViewPurchase] = useState<any | null>(null);
  const [versementPurchase, setVersementPurchase] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: purchases = [], isLoading } = useQuery<Purchase[]>({ queryKey: ["/api/purchases"] });
  const { data: suppliers = [] } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: partners = [] } = useQuery<Partner[]>({ queryKey: ["/api/partners"] });
  const { data: rawSummaries } = useQuery<{ purchaseId: string; totalPaid: number }[]>({
    queryKey: ["/api/purchases/payments-summary"],
    queryFn: async () => {
      const r = await fetch("/api/purchases/payments-summary", { credentials: "include" });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
  });
  const paymentSummaries = Array.isArray(rawSummaries) ? rawSummaries : [];

  const paidMap = Object.fromEntries(paymentSummaries.map(s => [s.purchaseId, s.totalPaid]));

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/purchases", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setOpen(false);
      toast({ title: "✓ تم حفظ الشراء" });
    },
    onError: (e: any) => toast({ title: "فشل إنشاء الشراء", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/purchases/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setViewPurchase(null);
      toast({ title: "✓ تم الإتمام وتحديث المخزون" });
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
      <div className="space-y-4" dir={dir}>
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
                    <th className="text-right p-3 font-semibold">الإجمالي</th>
                    <th className="text-right p-3 font-semibold hidden md:table-cell">مدفوع</th>
                    <th className="text-right p-3 font-semibold hidden md:table-cell">متبقي</th>
                    <th className="text-center p-3 font-semibold hidden lg:table-cell">حالة الدفع</th>
                    <th className="text-center p-3 font-semibold">الحالة</th>
                    <th className="text-center p-3 font-semibold w-32 hidden sm:table-cell">إجراء</th>
                    <th className="text-center p-3 font-semibold w-12 sm:hidden">عرض</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-16">
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
                    const purTotal = parseFloat(pur.total as string || "0");
                    const purPaid = paidMap[pur.id] ?? 0;
                    const purRemaining = Math.max(0, purTotal - purPaid);
                    const payStatusKey = getPaymentStatus(purTotal, purPaid);
                    const ps = PAY_STATUS[payStatusKey];
                    return (
                      <tr key={pur.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors cursor-pointer"
                        onClick={() => setViewPurchase(pur)} data-testid={`row-purchase-${pur.id}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-gray-800 font-semibold text-sm">{pur.supplierName}</p>
                              {(pur as any).partnerName && (
                                <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                                  <Handshake className="w-3 h-3" />
                                  {(pur as any).partnerName}
                                  {(pur as any).partnerPercentage && ` — ${parseFloat((pur as any).partnerPercentage).toFixed(0)}%`}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-gray-400 text-xs font-mono hidden sm:table-cell">{pur.referenceNumber ?? "—"}</td>
                        <td className="p-3 text-gray-400 text-xs hidden md:table-cell">{formatDate(pur.purchaseDate?.toString())}</td>
                        <td className="p-3">
                          <span className="text-blue-700 font-bold text-sm">{formatCurrency(purTotal)}</span>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span className="text-emerald-700 font-semibold text-xs">{formatCurrency(purPaid)}</span>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span className={`font-semibold text-xs ${purRemaining > 0 ? "text-red-600" : "text-gray-400"}`}>
                            {formatCurrency(purRemaining)}
                          </span>
                        </td>
                        <td className="p-3 text-center hidden lg:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${ps.cls}`}>{ps.label}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.cls}`}>{sc.label}</span>
                        </td>
                        <td className="p-3 hidden sm:table-cell" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 justify-center flex-wrap">
                            <Button size="sm" onClick={() => setVersementPurchase(pur)}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-none text-xs h-7 px-2"
                              data-testid={`button-versement-${pur.id}`}>
                              <Wallet className="w-3 h-3 ml-0.5" /> دفعة
                            </Button>
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
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl" dir={dir}>
            <DialogHeader className="border-b border-gray-100 pb-3">
              <DialogTitle className="text-gray-900 flex items-center gap-2 font-bold">
                <ShoppingBag className="w-4 h-4 text-blue-600" /> شراء جديد
              </DialogTitle>
            </DialogHeader>
            <div className="pt-1">
              <NewPurchaseForm onSave={data => createMutation.mutate(data)} onCancel={() => setOpen(false)}
                loading={createMutation.isPending} suppliers={suppliers} products={products} partners={partners} />
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
            onVersement={() => { setViewPurchase(null); setVersementPurchase(viewPurchase); }}
          />
        )}

        {versementPurchase && (
          <VersementModal purchase={versementPurchase} onClose={() => setVersementPurchase(null)} />
        )}
      </div>
    </AdminLayout>
  );
}
