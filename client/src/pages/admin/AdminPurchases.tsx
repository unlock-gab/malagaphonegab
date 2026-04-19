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
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " DA";
}
function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}
function formatDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:   { label: "En attente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Complété",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Annulé",     cls: "bg-red-50 text-red-600 border-red-200" },
};

const PAY_STATUS: Record<string, { label: string; cls: string }> = {
  unpaid:          { label: "Non payé",     cls: "bg-red-50 text-red-600 border-red-200" },
  partially_paid:  { label: "Part. payé",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  paid:            { label: "Payé",         cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "cash",     label: "Espèces" },
  { value: "transfer", label: "Virement" },
  { value: "cheque",   label: "Chèque" },
  { value: "other",    label: "Autre" },
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
  { value: "phone", label: "Téléphone" },
  { value: "accessory", label: "Accessoire" },
  { value: "tablet", label: "Tablette" },
  { value: "watch", label: "Montre" },
  { value: "earphone", label: "Écouteurs" },
  { value: "other", label: "Autre" },
];
const CONDITIONS = [
  { value: "new", label: "Neuf" },
  { value: "used_good", label: "Bon état" },
  { value: "used_acceptable", label: "Acceptable" },
  { value: "refurbished", label: "Reconditionné" },
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
      toast({ title: `✓ Produit "${newProd.name}" ajouté` });
      onCreated(newProd, needsImei ? imeiList : []);
    } catch {
      toast({ title: "Échec création produit", variant: "destructive" });
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
            Ajouter un produit au stock
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div>
            <Label className="text-gray-600 text-xs font-semibold mb-1.5 block">Nom du produit *</Label>
            <Input value={form.name} onChange={e => setF("name", e.target.value)} className={inputCls} placeholder="Ex: iPhone 14 Pro 128GB" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-600 text-xs font-semibold mb-1.5 block">Type</Label>
              <Select value={form.productType} onValueChange={v => { setF("productType", v); setImeiText(""); }}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-gray-800 text-sm">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-600 text-xs font-semibold mb-1.5 block">État</Label>
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
              <Label className="text-gray-600 text-xs font-semibold mb-1.5 block">Prix de vente * (DA)</Label>
              <Input type="number" value={form.price} onChange={e => setF("price", e.target.value)} className={inputCls} placeholder="0" />
            </div>
            <div>
              <Label className="text-gray-600 text-xs font-semibold mb-1.5 block">Prix de revient (DA)</Label>
              <Input type="number" value={form.costPrice} onChange={e => setF("costPrice", e.target.value)} className={inputCls} placeholder="0" />
            </div>
          </div>

          {/* IMEI — requis pour téléphones et tablettes */}
          {needsImei && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5 text-orange-600">
                <Smartphone className="w-3.5 h-3.5" />
                N° IMEI * <span className="text-[10px] text-gray-400 font-normal">(un par ligne)</span>
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
                  <span className="text-[10px] text-green-600 font-semibold">✓ {imeiList.length} IMEI saisi(s)</span>
                ) : (
                  <span className="text-[10px] text-orange-500">Saisir au moins un IMEI</span>
                )}
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-400">Le stock est ajouté automatiquement à la complétion de l'achat.</p>
        </div>
        <DialogFooter className="gap-2 border-t border-gray-100 pt-3">
          <Button variant="outline" onClick={onClose} className="border-gray-200 text-gray-600 text-sm">Annuler</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.name || !form.price || imeiMissing}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm disabled:opacity-50"
            data-testid="btn-quick-product-save"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajouter au stock"}
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
          placeholder="Rechercher un produit..."
          className="w-full h-8 pr-8 pl-3 text-xs rounded-md border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          data-testid="input-product-search"
        />
      </div>
      {open && (
        <div className="absolute z-50 top-full right-0 left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && search && (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">Aucun résultat</div>
            )}
            {filtered.map(p => (
              <button key={p.id} type="button"
                onClick={() => { onSelect(p.id); setSearch(p.name); setOpen(false); }}
                className="w-full text-right px-3 py-2 text-xs text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between gap-2">
                <span className="font-medium truncate">{p.name}</span>
                <span className="text-gray-400 shrink-0">{p.stock} en stock</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 p-1.5">
            <button type="button" onClick={() => { setOpen(false); onAddNew(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-semibold">
              <PackagePlus className="w-3.5 h-3.5" />
              Ajouter un nouveau produit
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
      toast({ title: `✓ Fournisseur "${newS.name}" enregistré` });
    } catch {
      toast({ title: "Échec enregistrement fournisseur", variant: "destructive" });
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
          placeholder="Rechercher un fournisseur ou saisir un nom..."
          className="w-full h-9 pr-8 pl-8 text-sm rounded-md border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          data-testid="input-supplier-search"
        />
        <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {/* Selected tag */}
      {!open && displayValue && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {supplierId ? (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">Enregistré</span>
          ) : (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Manuel</span>
          )}
        </div>
      )}
      {open && (
        <div className="absolute z-50 top-full right-0 left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && !showCreate && (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">Aucun fournisseur. Saisissez un nom pour en ajouter un</div>
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
                Enregistrer "{search.trim()}" comme fournisseur
              </button>
              <button type="button"
                onClick={() => { onSelect("", search.trim()); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">
                <UserRound className="w-3.5 h-3.5" />
                Utiliser "{search.trim()}" sans enregistrer (temporaire)
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
          <Label className="text-gray-600 text-sm font-semibold">Fournisseur *</Label>
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
              <UserRound className="w-3 h-3" /> Fournisseur manuel — non enregistré en base de données
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">N° Référence</Label>
          <Input value={form.referenceNumber} onChange={e => setF("referenceNumber", e.target.value)}
            className="bg-white border-gray-200 text-gray-900 text-sm font-mono" placeholder="INV-001" data-testid="input-purchase-ref" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">Date d'achat</Label>
          <Input type="date" value={form.purchaseDate} onChange={e => setF("purchaseDate", e.target.value)}
            className="bg-white border-gray-200 text-gray-900 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">Statut</Label>
          <Select value={form.status} onValueChange={v => setF("status", v)}>
            <SelectTrigger className="bg-white border-gray-200 text-gray-900 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-lg">
              <SelectItem value="pending" className="text-amber-700 text-sm">En attente</SelectItem>
              <SelectItem value="completed" className="text-emerald-700 text-sm">Complété (met à jour le stock)</SelectItem>
              <SelectItem value="cancelled" className="text-red-600 text-sm">Annulé</SelectItem>
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
        <Label className="text-gray-600 text-sm font-semibold">Produits</Label>
        {/* En-têtes colonnes */}
        <div className="grid grid-cols-[1fr_72px_100px_36px] gap-2">
          <span className="text-[10px] text-gray-400 font-semibold pr-1">Produit</span>
          <span className="text-[10px] text-gray-400 font-semibold text-center">Qté</span>
          <span className="text-[10px] text-gray-400 font-semibold">Prix unitaire (DA)</span>
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
            placeholder="Saisir le prix"
            data-testid="input-purchase-item-cost"
          />
          <Button
            size="sm"
            onClick={addItem}
            disabled={!newItem.productId || !newItem.unitCost}
            title={!newItem.productId ? "Choisir un produit d'abord" : !newItem.unitCost ? "Saisir le prix unitaire" : "Ajouter à la liste"}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="button-add-purchase-item"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        {/* Helper hint */}
        {newItem.productId && !newItem.unitCost && (
          <p className="text-[11px] text-orange-500 flex items-center gap-1 mt-0.5">
            ↑ Saisir le prix unitaire pour activer le bouton d'ajout
          </p>
        )}

        {/* IMEI input for phones/tablets */}
        {isPhone(newItem.productType) && newItem.productId && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1.5">
            <Label className="text-blue-700 text-xs font-bold flex items-center gap-1.5">
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">IMEI</span>
              Numéros IMEI (un par ligne)
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
              {newItemImeiText.split("\n").filter(s => s.trim()).length} IMEI saisi(s)
              {newItem.quantity && parseInt(newItem.quantity) > 0 && parseInt(newItem.quantity) !== newItemImeiText.split("\n").filter(s => s.trim()).length && (
                <span className="text-amber-600 mr-2">⚠ La quantité {newItem.quantity} ne correspond pas au nombre d'IMEI</span>
              )}
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <th className="text-right p-2.5 font-semibold">Produit</th>
                  <th className="text-center p-2.5 font-semibold w-20">Qté</th>
                  <th className="text-right p-2.5 font-semibold w-28">Prix unitaire</th>
                  <th className="text-right p-2.5 font-semibold w-28">Total</th>
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
              <span>Sous-total ({items.length} produit{items.length > 1 ? "s" : ""})</span>
              <span className="text-gray-800 font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <Label className="text-gray-500">Frais supplémentaires (transport, douane...)</Label>
              <Input type="number" value={form.extraCosts} onChange={e => setF("extraCosts", e.target.value)}
                className="bg-white border-gray-200 text-gray-900 text-xs h-7 w-28 text-right" placeholder="0" />
            </div>
            <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-200 pt-2">
              <span>Total général</span>
              <span className="text-blue-700">{formatCurrency(total)}</span>
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-xs">
            Ajoutez des produits à cet achat via la liste ci-dessus
          </div>
        )}
      </div>

      {/* ── Partner Section ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-gray-600 text-sm font-semibold flex items-center gap-1.5">
          <Handshake className="w-3.5 h-3.5 text-blue-500" />
          Associé dans cet achat
          <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
        </Label>
        <div className="relative" ref={partnerRef}>
          <div className="relative">
            <Handshake className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              value={partnerSearch}
              onChange={e => { setPartnerSearch(e.target.value); setPartnerSearchOpen(true); if (!e.target.value) clearPartner(); }}
              onClick={() => setPartnerSearchOpen(true)}
              placeholder="Choisir un associé ou rechercher..."
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
                    {partners.length === 0 ? "Aucun associé — Ajoutez-en depuis la page Partenaires" : "Aucun résultat"}
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
                <p className="text-xs text-blue-500">Associé dans cet achat</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Label className="text-xs text-blue-700 font-medium whitespace-nowrap">Part :</Label>
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
        <Label className="text-gray-600 text-sm font-semibold">Notes</Label>
        <Textarea value={form.notes} onChange={e => setF("notes", e.target.value)}
          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none text-sm" rows={2} />
      </div>

      <DialogFooter className="gap-2 flex-wrap">
        <Button variant="outline" onClick={onCancel} className="border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">Annuler</Button>
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
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sauvegarder (En attente)"}
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
          {loading ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />Enregistrement...</> : <><Check className="w-4 h-4 ml-2" />Enregistrer et compléter ← Ajoute au stock</>}
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
      if (!r.ok) throw new Error("Échec chargement des paiements");
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
  });
  const payments = Array.isArray(rawPayments) ? rawPayments : [];

  const totalPaid = payments.reduce((s: number, p: any) => s + parseFloat(p.amount || "0"), 0);
  const remaining = Math.max(0, total - totalPaid);
  const payStatus = getPaymentStatus(total, totalPaid);
  const ps = PAY_STATUS[payStatus];

  const localNow = () => { const d = new Date(); const p = (n: number) => n.toString().padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const [form, setForm] = useState({ amount: "", paymentMethod: "cash", date: localNow(), notes: "" });
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
      setForm(f => ({ ...f, amount: "", notes: "", date: localNow() }));
      toast({ title: "✓ Paiement enregistré" });
    },
    onError: (e: any) => toast({ title: "Échec", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/purchase-payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases", purchase.id, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases/payments-summary"] });
      refetch();
      toast({ title: "Supprimé" });
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
            Paiements fournisseur — {purchase.supplierName}
            {purchase.referenceNumber && <span className="text-gray-400 font-mono text-xs">#{purchase.referenceNumber}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-400 mb-1">Total</p>
              <p className="text-sm font-black text-blue-700">{formatCurrency(total)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-400 mb-1">Payé</p>
              <p className="text-sm font-black text-emerald-700">{formatCurrency(totalPaid)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center border ${remaining > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
              <p className={`text-xs mb-1 ${remaining > 0 ? "text-red-400" : "text-gray-400"}`}>Restant</p>
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
                <BadgeDollarSign className="w-3.5 h-3.5 text-blue-600" /> Ajouter un nouveau paiement
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">Montant * (DA)</Label>
                  <Input
                    type="number" min="1" step="1"
                    value={form.amount} onChange={e => setF("amount", e.target.value)}
                    placeholder={`Max: ${Math.round(remaining)}`}
                    className="bg-white border-gray-200 text-gray-900 text-sm h-8"
                    data-testid="input-versement-amount"
                  />
                </div>
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">Mode de paiement</Label>
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
                  <Label className="text-gray-500 text-xs mb-1 block">Date et heure</Label>
                  <Input type="datetime-local" value={form.date} onChange={e => setF("date", e.target.value)}
                    className="bg-white border-gray-200 text-gray-900 text-sm h-8" />
                </div>
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">Note (optionnel)</Label>
                  <Input value={form.notes} onChange={e => setF("notes", e.target.value)}
                    className="bg-white border-gray-200 text-gray-900 text-sm h-8" placeholder="Note..." />
                </div>
              </div>
              {amountVal > 0 && amountVal > remaining + 0.01 && (
                <p className="text-xs text-red-500">Le montant dépasse le restant ({formatCurrency(remaining)})</p>
              )}
              <Button onClick={() => addMutation.mutate()} disabled={!canSubmit || addMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-8 shadow-sm"
                data-testid="button-add-versement">
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-3.5 h-3.5 ml-2" />Enregistrer le paiement</>}
              </Button>
            </div>
          )}

          {/* Versement history */}
          <div>
            <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5 mb-2">
              <History className="w-3.5 h-3.5 text-blue-600" /> Historique des paiements
            </p>
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-xs py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
              </div>
            ) : payments.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-xs">
                Aucun paiement enregistré pour l'instant
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                      <th className="text-right p-2.5 font-semibold">Date</th>
                      <th className="text-right p-2.5 font-semibold">Montant</th>
                      <th className="text-right p-2.5 font-semibold hidden sm:table-cell">Mode</th>
                      <th className="text-right p-2.5 font-semibold hidden sm:table-cell">Note</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id} className="border-b border-gray-50 last:border-0">
                        <td className="p-2.5">
                          <div className="flex flex-col gap-0.5 text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-300" />
                              <span>{formatDate(p.paymentDate)}</span>
                            </div>
                            <span className="text-gray-400 text-[10px] pr-4">
                              {new Date(p.paymentDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
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
                          <button onClick={() => { if (confirm("Supprimer ce paiement ?")) deleteMutation.mutate(p.id); }}
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
  const { data: rawVPayments } = useQuery<any[]>({
    queryKey: ["/api/purchases", purchase.id, "payments"],
    queryFn: async () => {
      const r = await fetch(`/api/purchases/${purchase.id}/payments`, { credentials: "include" });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    },
  });
  const vPayments = Array.isArray(rawVPayments) ? rawVPayments : [];

  const data = full ?? purchase;
  const sc = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.pending;
  const items = (data.items ?? []) as PurchaseItem[];
  const extraCosts = parseFloat(data.extraCosts || "0");
  const purTotal = parseFloat(data.total || "0");
  const purPaid = vPayments.reduce((s: number, p: any) => s + parseFloat(p.amount || "0"), 0);
  const purRemaining = Math.max(0, purTotal - purPaid);
  const payStatusKey = getPaymentStatus(purTotal, purPaid);
  const psBadge = PAY_STATUS[payStatusKey];

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" dir={dir}>
        <DialogHeader className="border-b border-gray-100 pb-3">
          <DialogTitle className="text-gray-900 flex items-center gap-2 text-sm font-bold">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            Détails de l'achat — {data.supplierName}
            {data.referenceNumber ? <span className="text-gray-400 font-mono text-xs">#{data.referenceNumber}</span> : null}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm pt-1">
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <p className="text-gray-400 mb-1">Statut</p>
              <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full border ${sc.cls}`}>{sc.label}</span>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <p className="text-gray-400 mb-1">Date</p>
              <p className="text-gray-700">{formatDate(data.purchaseDate)}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
              <p className="text-gray-400 mb-1">Total</p>
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
                <p className="text-xs text-blue-500 mb-0.5">Associé dans cet achat</p>
                <p className="text-sm font-bold text-blue-900">{data.partnerName}</p>
              </div>
              {data.partnerPercentage && (
                <div className="text-center">
                  <p className="text-2xl font-black text-blue-700">{parseFloat(data.partnerPercentage).toFixed(0)}%</p>
                  <p className="text-xs text-blue-400">Part</p>
                </div>
              )}
            </div>
          )}

          {/* ── Items table ── */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement des produits...
            </div>
          ) : items.length > 0 ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-3 py-2 flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-gray-600">Produits achetés ({items.length})</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="text-right p-2.5 font-semibold">Produit</th>
                    <th className="text-center p-2.5 font-semibold">Qté</th>
                    <th className="text-right p-2.5 font-semibold">Prix unit.</th>
                    <th className="text-right p-2.5 font-semibold">Total</th>
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
                  <span>Sous-total</span>
                  <span>{formatCurrency(parseFloat(data.subtotal || "0"))}</span>
                </div>
                {extraCosts > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Frais supplémentaires</span>
                    <span>{formatCurrency(extraCosts)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-1 mt-1">
                  <span>Total général</span>
                  <span className="text-blue-700">{formatCurrency(parseFloat(data.total || "0"))}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-xs">
              Aucun produit enregistré pour cet achat
            </div>
          )}

          {/* ── Notes ── */}
          {data.notes && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Notes</p>
              <p className="text-gray-700 text-xs">{data.notes}</p>
            </div>
          )}

          {/* ── Payments summary ── */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-gray-600">Paiements</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${psBadge.cls}`}>{psBadge.label}</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-100 rtl:divide-x-reverse text-center">
              <div className="p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">Total</p>
                <p className="text-xs font-bold text-blue-700">{formatCurrency(purTotal)}</p>
              </div>
              <div className="p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">Payé</p>
                <p className="text-xs font-bold text-emerald-700">{formatCurrency(purPaid)}</p>
              </div>
              <div className="p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">Restant</p>
                <p className={`text-xs font-bold ${purRemaining > 0 ? "text-red-600" : "text-gray-400"}`}>{formatCurrency(purRemaining)}</p>
              </div>
            </div>
            {vPayments.length > 0 && (
              <div className="border-t border-gray-100">
                {vPayments.slice(0, 3).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(p.paymentDate)}</span>
                      <span className="text-gray-300">·</span>
                      <span>{PAYMENT_METHODS.find(m => m.value === p.paymentMethod)?.label ?? p.paymentMethod}</span>
                    </div>
                    <span className="text-emerald-700 font-bold">{formatCurrency(parseFloat(p.amount || "0"))}</span>
                  </div>
                ))}
                {vPayments.length > 3 && (
                  <p className="text-xs text-gray-400 text-center py-2">+ {vPayments.length - 3} autre(s) paiement(s)</p>
                )}
              </div>
            )}
          </div>

          {/* ── Actions ── */}
          {onVersement && (
            <Button onClick={onVersement} className="w-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm shadow-none" data-testid="button-view-versements">
              <Wallet className="w-4 h-4 ml-2" /> Gérer les paiements
            </Button>
          )}
          {data.status === "pending" && (
            <div className="flex gap-2">
              <Button onClick={onComplete} className="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-sm shadow-none">
                <Check className="w-4 h-4 ml-2" /> Compléter (màj stock)
              </Button>
              <Button onClick={onCancelPur} variant="outline" className="border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 text-sm">
                <X className="w-4 h-4 ml-1" /> Annuler
              </Button>
            </div>
          )}
          <Button onClick={onDelete} variant="outline" className="w-full border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 text-sm">
            <Trash2 className="w-4 h-4 ml-2" /> Supprimer l'achat
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
      toast({ title: "✓ Achat enregistré" });
    },
    onError: (e: any) => toast({ title: "Échec de la création", description: e.message, variant: "destructive" }),
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
      toast({ title: "✓ Complété et stock mis à jour" });
    },
    onError: () => toast({ title: "Échec de la mise à jour", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/purchases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      setViewPurchase(null);
      toast({ title: "Achat supprimé" });
    },
    onError: () => toast({ title: "Échec de la suppression", variant: "destructive" }),
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
            <h1 className="text-lg font-black text-gray-900">Achats</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {purchases.length} achat(s) • Valeur complétée :{" "}
              <span className="text-emerald-700 font-semibold">{formatCurrency(totalCompleted)}</span>
              {pendingCount > 0 && <> • <span className="text-amber-600">{pendingCount} en attente</span></>}
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm shadow-sm" data-testid="button-add-purchase">
            <Plus className="w-4 h-4" /> Nouvel achat
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par fournisseur ou référence..." className="bg-white border-gray-200 text-gray-900 pr-9 text-sm h-9" />
          </div>
          <div className="flex gap-1.5">
            {[{ k: "all", l: "Tout" }, { k: "pending", l: "En attente" }, { k: "completed", l: "Complété" }, { k: "cancelled", l: "Annulé" }].map(btn => (
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
                    <th className="text-right p-3 font-semibold">Fournisseur</th>
                    <th className="text-right p-3 font-semibold w-24 hidden sm:table-cell">Référence</th>
                    <th className="text-right p-3 font-semibold w-28 hidden md:table-cell">Date</th>
                    <th className="text-right p-3 font-semibold w-28">Total</th>
                    <th className="text-right p-3 font-semibold w-24 hidden md:table-cell">Payé</th>
                    <th className="text-right p-3 font-semibold w-24 hidden md:table-cell">Restant</th>
                    <th className="text-center p-3 font-semibold w-28 hidden lg:table-cell">Statut paiement</th>
                    <th className="text-center p-3 font-semibold w-24">Statut</th>
                    <th className="text-center p-3 font-semibold w-36 hidden sm:table-cell">Actions</th>
                    <th className="text-center p-3 font-semibold w-10 sm:hidden">Voir</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-16">
                      <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <ShoppingBag className="w-7 h-7 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-semibold">Aucun achat</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {search || statusFilter !== "all" ? "Essayez de changer le filtre" : "Créez votre premier achat pour alimenter le stock"}
                      </p>
                      {!search && statusFilter === "all" && (
                        <Button onClick={() => setOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm shadow-sm">
                          <Plus className="w-4 h-4" /> Nouvel achat
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
                        <td className="p-3 text-right text-gray-400 text-xs font-mono hidden sm:table-cell w-24 whitespace-nowrap">{pur.referenceNumber ?? "—"}</td>
                        <td className="p-3 text-right text-gray-400 text-xs hidden md:table-cell w-28 whitespace-nowrap">{formatDate(pur.purchaseDate?.toString())}</td>
                        <td className="p-3 text-right w-28 whitespace-nowrap">
                          <span className="text-blue-700 font-bold text-sm">{formatCurrency(purTotal)}</span>
                        </td>
                        <td className="p-3 text-right hidden md:table-cell w-24 whitespace-nowrap">
                          <span className="text-emerald-700 font-semibold text-xs">{formatCurrency(purPaid)}</span>
                        </td>
                        <td className="p-3 text-right hidden md:table-cell w-24 whitespace-nowrap">
                          <span className={`font-semibold text-xs ${purRemaining > 0 ? "text-red-600" : "text-gray-400"}`}>
                            {formatCurrency(purRemaining)}
                          </span>
                        </td>
                        <td className="p-3 text-center hidden lg:table-cell w-28">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${ps.cls}`}>{ps.label}</span>
                        </td>
                        <td className="p-3 text-center w-24">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.cls}`}>{sc.label}</span>
                        </td>
                        <td className="p-3 hidden sm:table-cell w-36" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 justify-center flex-wrap">
                            <Button size="sm" onClick={() => setVersementPurchase(pur)}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-none text-xs h-7 px-2"
                              data-testid={`button-versement-${pur.id}`}>
                              <Wallet className="w-3 h-3 ml-0.5" /> Paiement
                            </Button>
                            {pur.status === "pending" && (
                              <>
                                <Button size="sm" onClick={() => statusMutation.mutate({ id: pur.id, status: "completed" })}
                                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-none text-xs h-7 px-2"
                                  disabled={statusMutation.isPending} data-testid={`button-complete-purchase-${pur.id}`}>
                                  <Check className="w-3 h-3 ml-0.5" /> Compléter
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: pur.id, status: "cancelled" })}
                                  className="border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 text-xs h-7 px-2"
                                  disabled={statusMutation.isPending} data-testid={`button-cancel-purchase-${pur.id}`}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            <button onClick={() => { if (confirm("Supprimer cet achat ?")) deleteMutation.mutate(pur.id); }}
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
                <ShoppingBag className="w-4 h-4 text-blue-600" /> Nouvel achat
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
            onDelete={() => { if (confirm("Supprimer cet achat ?")) deleteMutation.mutate(viewPurchase.id); }}
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
