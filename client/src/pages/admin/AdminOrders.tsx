import { useState, useRef, useEffect } from "react";
import { useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Search, Eye, Package, Trash2, Loader2, Plus,
  ShoppingCart, Globe, MessageCircle, User, CheckCircle2,
  Printer, RotateCcw, Truck, PackagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import { useAdminLang } from "@/context/AdminLangContext";
import OrderInvoice from "@/components/OrderInvoice";
import BonDeLivraison from "@/components/BonDeLivraison";
import type { Order, Product } from "@shared/schema";
import { ORDER_STATUSES, ALGERIAN_WILAYAS, DEFAULT_DELIVERY_PRICES } from "@shared/schema";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " DA";
}
function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  const datePart = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  const timePart = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
  return `${datePart} · ${timePart}`;
}
function shortId(id: string) { return "#" + id.slice(-6).toUpperCase(); }

function whatsappUrl(phone: string) {
  const cleaned = phone.replace(/\D/g, "").replace(/^0/, "213");
  return `https://wa.me/${cleaned}`;
}

function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUSES.find(s => s.key === status);
  if (!s) return <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-medium ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

const PAYMENT_METHOD_MAP: Record<string, string> = {
  cash_on_delivery: "Paiement à la livraison",
  card: "Carte",
  transfer: "Virement",
};
const PAYMENT_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:  { label: "En attente",  cls: "text-amber-600" },
  paid:     { label: "Payé",        cls: "text-emerald-600" },
  failed:   { label: "Échoué",      cls: "text-red-600" },
  refunded: { label: "Remboursé",   cls: "text-blue-600" },
};

function SourceBadge({ source }: { source?: string | null }) {
  if (source === "pos") return (
    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
      ⚡ POS
    </span>
  );
  if (source === "whatsapp") return (
    <span className="inline-flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
      <MessageCircle className="w-3 h-3" /> WhatsApp
    </span>
  );
  if (source === "website") return (
    <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
      <Globe className="w-3 h-3" /> Site web
    </span>
  );
  return <span className="inline-flex items-center gap-1 text-[10px] text-gray-500"><User className="w-3 h-3" /> Manuel</span>;
}

const STATUS_FLOW_MAIN = ["new", "confirmed", "delivered", "paid"];
const RETURN_STATUSES = ["returned"];

const ORDER_SOURCES = [
  { value: "admin",     label: "Manuel" },
  { value: "pos",       label: "⚡ POS" },
  { value: "phone",     label: "Téléphone" },
  { value: "whatsapp",  label: "WhatsApp" },
  { value: "walk_in",   label: "En boutique" },
];

interface NewOrderItem {
  productId: string; productName: string; quantity: number;
  unitPrice: number; costPrice: number; total: number;
}

function ProductPickerInline({ products, onSelect }: {
  products: Product[]; onSelect: (p: Product) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = search.trim()
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input value={search} onChange={e => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Rechercher un produit..." className="w-full h-9 pr-8 pl-3 text-xs rounded-md border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? <div className="px-3 py-2 text-xs text-gray-400 text-center">Aucun résultat</div>
              : filtered.map(p => (
                <button key={p.id} type="button" onClick={() => { onSelect(p); setSearch(p.name); setOpen(false); }}
                  className="w-full text-right px-3 py-2 text-xs text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="text-gray-400 shrink-0">{formatCurrency(parseFloat(p.price as string))}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewOrderDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { dir } = useAdminLang();
  const { toast } = useToast();
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: settings = {} } = useQuery<any>({ queryKey: ["/api/settings"] });
  const deliveryPrices = settings.deliveryPrices ? JSON.parse(settings.deliveryPrices as string) : DEFAULT_DELIVERY_PRICES;

  const [form, setForm] = useState({
    customerName: "", customerPhone: "", wilaya: "", commune: "", address: "",
    source: "admin", deliveryType: "home",
    paymentMethod: "cash_on_delivery", paymentStatus: "pending",
    status: "new", notes: "",
  });
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const [items, setItems] = useState<NewOrderItem[]>([]);
  const [newItem, setNewItem] = useState({ productId: "", productName: "", quantity: 1, unitPrice: 0, costPrice: 0 });
  const [saving, setSaving] = useState(false);

  const wilayaDelivery = form.wilaya ? (deliveryPrices[form.wilaya] ?? DEFAULT_DELIVERY_PRICES[form.wilaya]) : null;
  const deliveryFee = wilayaDelivery ? (form.deliveryType === "home" ? wilayaDelivery.home : wilayaDelivery.desk) : 0;
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = subtotal + deliveryFee;

  const handleSelectProduct = (p: Product) => {
    setNewItem({ productId: p.id, productName: p.name, quantity: 1, unitPrice: parseFloat(p.price as string) || 0, costPrice: parseFloat(p.costPrice as string) || 0 });
  };

  const addItem = () => {
    if (!newItem.productId) return;
    const existIdx = items.findIndex(i => i.productId === newItem.productId);
    if (existIdx >= 0) {
      setItems(prev => prev.map((i, idx) => idx === existIdx
        ? { ...i, quantity: i.quantity + newItem.quantity, total: (i.quantity + newItem.quantity) * i.unitPrice }
        : i));
    } else {
      setItems(prev => [...prev, { ...newItem, total: newItem.quantity * newItem.unitPrice }]);
    }
    setNewItem({ productId: "", productName: "", quantity: 1, unitPrice: 0, costPrice: 0 });
  };

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.wilaya || items.length === 0) {
      toast({ title: "Veuillez saisir : nom, téléphone, wilaya et au moins un produit", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiRequest("POST", "/api/admin/orders", {
        ...form,
        items: items.map(i => ({
          productId: i.productId, productName: i.productName,
          quantity: i.quantity, unitPrice: String(i.unitPrice),
          costPrice: String(i.costPrice), total: String(i.total),
        })),
        subtotal: String(subtotal),
        deliveryPrice: String(deliveryFee),
        total: String(total),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "✓ Commande créée avec succès" });
      onSuccess();
    } catch {
      toast({ title: "Échec de la création", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "bg-white border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus-visible:ring-blue-400 h-9";

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl" dir={dir}>
        <DialogHeader className="border-b border-gray-100 pb-3 sticky top-0 bg-white z-10">
          <DialogTitle className="text-gray-900 flex items-center gap-2 text-sm font-bold">
            <PackagePlus className="w-4 h-4 text-blue-600" />
            Créer une commande manuelle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Customer */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-3">
            <p className="text-xs font-bold text-gray-600">Informations client</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Nom *</Label>
                <Input value={form.customerName} onChange={e => setF("customerName", e.target.value)} className={inputCls} placeholder="Nom du client" data-testid="input-new-order-name" />
              </div>
              <div>
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Téléphone *</Label>
                <Input value={form.customerPhone} onChange={e => setF("customerPhone", e.target.value)} className={inputCls} placeholder="0XXXXXXXXX" data-testid="input-new-order-phone" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Wilaya *</Label>
                <Select value={form.wilaya} onValueChange={v => setF("wilaya", v)}>
                  <SelectTrigger className={inputCls} data-testid="select-new-order-wilaya"><SelectValue placeholder="Choisir la wilaya" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 shadow-lg max-h-52">
                    {ALGERIAN_WILAYAS.map(w => <SelectItem key={w} value={w} className="text-sm">{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Commune</Label>
                <Input value={form.commune} onChange={e => setF("commune", e.target.value)} className={inputCls} placeholder="Commune" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 font-semibold mb-1 block">Adresse</Label>
              <Input value={form.address} onChange={e => setF("address", e.target.value)} className={inputCls} placeholder="Adresse détaillée" />
            </div>
          </div>

          {/* Order source + delivery */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-3">
            <p className="text-xs font-bold text-gray-600">Détails de la commande</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Source</Label>
                <Select value={form.source} onValueChange={v => setF("source", v)}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 shadow-lg">
                    {ORDER_SOURCES.map(s => <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Livraison</Label>
                <Select value={form.deliveryType} onValueChange={v => setF("deliveryType", v)}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 shadow-lg">
                    <SelectItem value="home" className="text-sm">À domicile</SelectItem>
                    <SelectItem value="desk" className="text-sm">En bureau</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Statut initial</Label>
                <Select value={form.status} onValueChange={v => setF("status", v)}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 shadow-lg">
                    {ORDER_STATUSES.filter(s => ["new","confirmed","preparing"].includes(s.key)).map(s =>
                      <SelectItem key={s.key} value={s.key} className="text-sm">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Mode de paiement</Label>
                <Select value={form.paymentMethod} onValueChange={v => setF("paymentMethod", v)}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 shadow-lg">
                    <SelectItem value="cash_on_delivery" className="text-sm">Paiement à la livraison</SelectItem>
                    <SelectItem value="card" className="text-sm">Carte</SelectItem>
                    <SelectItem value="transfer" className="text-sm">Virement bancaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Statut paiement</Label>
                <Select value={form.paymentStatus} onValueChange={v => setF("paymentStatus", v)}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 shadow-lg">
                    <SelectItem value="pending" className="text-sm">En attente</SelectItem>
                    <SelectItem value="paid" className="text-sm">Payé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="border border-gray-200 rounded-xl p-3 space-y-3">
            <p className="text-xs font-bold text-gray-600">Produits *</p>
            <div className="grid grid-cols-[1fr_72px_100px_36px] gap-2 items-end">
              <div>
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Produit</Label>
                <ProductPickerInline products={products} onSelect={handleSelectProduct} />
              </div>
              <div>
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Qté</Label>
                <Input type="number" min="1" value={newItem.quantity}
                  onChange={e => setNewItem(i => ({ ...i, quantity: parseInt(e.target.value) || 1 }))}
                  className="bg-white border-gray-200 text-gray-900 text-xs h-9" data-testid="input-new-order-qty" />
              </div>
              <div>
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Prix (DA)</Label>
                <Input type="number" value={newItem.unitPrice}
                  onChange={e => setNewItem(i => ({ ...i, unitPrice: parseFloat(e.target.value) || 0 }))}
                  className="bg-white border-gray-200 text-gray-900 text-xs h-9" data-testid="input-new-order-price" />
              </div>
              <Button size="sm" onClick={addItem} disabled={!newItem.productId}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-2 shadow-sm disabled:opacity-40 self-end" data-testid="button-add-order-item">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>

            {items.length > 0 && (
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-right p-2 text-gray-500 font-semibold">Produit</th>
                      <th className="text-center p-2 text-gray-500 font-semibold">Qté</th>
                      <th className="text-right p-2 text-gray-500 font-semibold">Prix</th>
                      <th className="text-right p-2 text-gray-500 font-semibold">Total</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="p-2 text-gray-800 font-medium truncate max-w-[150px]">{item.productName}</td>
                        <td className="p-2 text-center text-gray-600">{item.quantity}</td>
                        <td className="p-2 text-gray-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-2 text-blue-700 font-bold">{formatCurrency(item.total)}</td>
                        <td className="p-2">
                          <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                            className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600"><span>Sous-total</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Frais de livraison {form.wilaya ? `(${form.wilaya})` : ""}</span><span className="font-semibold">{formatCurrency(deliveryFee)}</span></div>
              <div className="flex justify-between text-blue-800 font-bold text-sm border-t border-blue-200 pt-1"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs text-gray-500 font-semibold mb-1 block">Notes</Label>
            <Textarea value={form.notes} onChange={e => setF("notes", e.target.value)}
              className="bg-white border-gray-200 text-gray-900 text-sm resize-none placeholder:text-gray-400" rows={2}
              placeholder="Détails supplémentaires..." />
          </div>

          {form.status === "confirmed" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Le stock sera déduit dès la création en statut « Confirmé »
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t border-gray-100 mt-2">
          <Button variant="outline" onClick={onClose} className="border-gray-200 text-gray-600 text-sm">Annuler</Button>
          <Button onClick={handleSave} disabled={saving || items.length === 0 || !form.customerName || !form.customerPhone || !form.wilaya}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm disabled:opacity-50" data-testid="button-create-order">
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <PackagePlus className="w-4 h-4 ml-2" />}
            Créer la commande
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusTimeline({ current }: { current: string }) {
  if (RETURN_STATUSES.includes(current)) {
    const s = ORDER_STATUSES.find(st => st.key === current);
    return (
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${s?.color ?? "text-gray-600"}`}>
        <span className={`w-2 h-2 rounded-full ${s?.dot ?? "bg-gray-400"}`} /> {s?.label ?? current}
      </div>
    );
  }
  const activeIdx = STATUS_FLOW_MAIN.indexOf(current);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STATUS_FLOW_MAIN.map((s, i, arr) => {
        const isActive = s === current;
        const isDone = STATUS_FLOW_MAIN.indexOf(s) < activeIdx;
        const status = ORDER_STATUSES.find(st => st.key === s);
        return (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
              isActive ? "bg-blue-600 text-white border-blue-600" :
              isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              "bg-gray-50 text-gray-400 border-gray-200"
            }`}>
              {status?.label}
            </span>
            {i < arr.length - 1 && <span className={`text-[8px] ${isDone ? "text-emerald-500" : "text-gray-300"}`}>›</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminOrders() {
  const { dir } = useAdminLang();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const searchStr = useSearch();
  const urlStatus = new URLSearchParams(searchStr).get("status") || "all";
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  useEffect(() => { setStatusFilter(urlStatus); }, [urlStatus]);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [bonOrder, setBonOrder] = useState<Order | null>(null);

  const { data: orders = [], isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"], refetchInterval: 30000 });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/orders/${id}/status`, { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      if (viewOrder) setViewOrder(v => v ? { ...v, status } : null);
      toast({ title: "✓ Statut mis à jour" });
    },
    onError: () => toast({ title: "Échec de la mise à jour", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/orders/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); toast({ title: "✓ Enregistré" }); },
    onError: () => toast({ title: "Échec de l'enregistrement", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/orders/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); setViewOrder(null); toast({ title: "Commande supprimée" }); },
    onError: () => toast({ title: "Échec de la suppression", variant: "destructive" }),
  });


  const openOrder = async (order: Order) => {
    setViewOrder(order);
    setEditStatus(order.status);
    setEditNotes(order.notes ?? "");
    try {
      const res = await fetch(`/api/orders/${order.id}`, { credentials: "include" });
      const data = await res.json();
      setOrderItems(data.items ?? []);
    } catch { setOrderItems([]); }
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) || o.id.includes(q) || (o.wilaya ?? "").includes(q);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = orders.filter(o => o.status === "paid").reduce((s, o) => s + parseFloat(o.total?.toString() || "0"), 0);

  return (
    <AdminLayout>
      <div className="space-y-4" dir={dir}>
        {/* New Order Dialog */}
        {showNewOrder && (
          <NewOrderDialog
            onClose={() => setShowNewOrder(false)}
            onSuccess={() => setShowNewOrder(false)}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">Commandes</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {orders.length} commande(s) • Chiffre d'affaires (Payé) :{" "}
              <span className="text-violet-600 font-semibold">{formatCurrency(totalRevenue)}</span>
            </p>
          </div>
          <Button onClick={() => setShowNewOrder(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm gap-1.5" data-testid="button-new-order">
            <Plus className="w-4 h-4" />
            Nouvelle commande
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[{ key: "all", label: "Tout" }, ...ORDER_STATUSES].map(s => {
            const count = s.key === "all" ? orders.length : orders.filter(o => o.status === s.key).length;
            return (
              <button key={s.key} onClick={() => setStatusFilter(s.key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  statusFilter === s.key
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`} data-testid={`tab-status-${s.key}`}>
                {s.label}{count > 0 && <span className="mr-1.5 opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone, numéro, wilaya..."
            className="bg-white border-gray-200 text-gray-900 pr-10 text-sm h-9 placeholder:text-gray-400 focus-visible:ring-blue-400" data-testid="input-order-search" />
        </div>

        {/* Orders Table */}
        {isLoading ? (
          <div className="space-y-1">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs">
                    <th className="text-right p-3 font-semibold">N°</th>
                    <th className="text-right p-3 font-semibold min-w-36">Client</th>
                    <th className="text-right p-3 font-semibold hidden sm:table-cell">Téléphone</th>
                    <th className="text-right p-3 font-semibold hidden md:table-cell">Wilaya</th>
                    <th className="text-right p-3 font-semibold hidden lg:table-cell">Source</th>
                    <th className="text-right p-3 font-semibold">Total</th>
                    <th className="text-right p-3 font-semibold hidden xl:table-cell">Mode paiement</th>
                    <th className="text-right p-3 font-semibold hidden lg:table-cell">Statut paiement</th>
                    <th className="text-center p-3 font-semibold">Statut</th>
                    <th className="text-right p-3 font-semibold hidden md:table-cell">Date / Heure</th>
                    <th className="text-center p-3 font-semibold w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-14">
                        <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <ShoppingCart className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-gray-600 font-semibold text-sm">Aucune commande</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {search || statusFilter !== "all"
                            ? "Essayez de changer le filtre ou la recherche"
                            : "Les commandes apparaîtront ici dès réception"}
                        </p>
                      </td>
                    </tr>
                  ) : filtered.map(order => {
                    const pmSt = PAYMENT_STATUS_MAP[order.paymentStatus ?? "pending"] ?? PAYMENT_STATUS_MAP.pending;
                    return (
                      <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors cursor-pointer"
                        onClick={() => openOrder(order)} data-testid={`row-order-${order.id}`}>
                        <td className="p-3">
                          <span className="text-gray-400 font-mono text-xs">{shortId(order.id)}</span>
                        </td>
                        <td className="p-3">
                          <p className="text-gray-800 font-semibold text-xs">{order.customerName}</p>
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <span className="text-gray-500 text-xs font-mono">{order.customerPhone}</span>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span className="text-gray-500 text-xs">{order.wilaya}</span>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <SourceBadge source={order.source} />
                        </td>
                        <td className="p-3">
                          <span className="text-blue-700 font-bold text-sm">
                            {formatCurrency(parseFloat(order.total?.toString() || "0"))}
                          </span>
                        </td>
                        <td className="p-3 hidden xl:table-cell">
                          <span className="text-gray-500 text-xs">
                            {PAYMENT_METHOD_MAP[order.paymentMethod ?? "cash_on_delivery"] ?? order.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <span className={`text-xs font-semibold ${pmSt.cls}`}>{pmSt.label}</span>
                        </td>
                        <td className="p-3 text-center">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span className="text-gray-400 text-xs">{formatDate(order.createdAt?.toString())}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 justify-center" onClick={e => e.stopPropagation()}>
                            <a href={whatsappUrl(order.customerPhone)} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Contacter via WhatsApp" data-testid={`button-whatsapp-${order.id}`}>
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                            <button onClick={() => openOrder(order)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              data-testid={`button-view-order-${order.id}`}>
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoice print overlay */}
        {invoiceOrder && (
          <OrderInvoice order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
        )}

        {/* Bon de Livraison overlay */}
        {bonOrder && (
          <BonDeLivraison order={bonOrder} items={orderItems} onClose={() => setBonOrder(null)} />
        )}


        {viewOrder && (
          <Dialog open={!!viewOrder} onOpenChange={o => { if (!o) setViewOrder(null); }}>
            <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-xl max-h-[92vh] overflow-y-auto shadow-xl" dir={dir}>
              <DialogHeader className="border-b border-gray-100 pb-3">
                <DialogTitle className="text-gray-900 flex items-center gap-2 text-sm font-bold">
                  <Package className="w-4 h-4 text-blue-600" />
                  {shortId(viewOrder.id)} — {viewOrder.customerName}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 text-sm pt-1">
                {/* Timeline */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <p className="text-gray-500 text-xs font-semibold mb-2">Parcours de la commande</p>
                  <StatusTimeline current={viewOrder.status} />
                  <p className="text-gray-400 text-[10px] mt-2">
                    {(viewOrder as any).stockDeducted
                      ? "✓ Stock déduit"
                      : "⏳ Stock déduit à la confirmation"}
                  </p>
                </div>

                {/* Customer */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <p className="text-gray-600 text-xs font-semibold mb-2">Informations client</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div><span className="text-gray-400">Nom : </span><span className="text-gray-800 font-medium">{viewOrder.customerName}</span></div>
                    <div><span className="text-gray-400">Téléphone : </span>
                      <a href={whatsappUrl(viewOrder.customerPhone)} target="_blank" rel="noopener noreferrer"
                        className="text-green-600 hover:underline font-mono">{viewOrder.customerPhone}</a>
                    </div>
                    <div><span className="text-gray-400">Wilaya : </span><span className="text-gray-800">{viewOrder.wilaya}</span></div>
                    {viewOrder.commune && <div><span className="text-gray-400">Commune : </span><span className="text-gray-800">{viewOrder.commune}</span></div>}
                    <div><span className="text-gray-400">Livraison : </span><span className="text-gray-800">{viewOrder.deliveryType === "home" ? "À domicile" : "En bureau"}</span></div>
                    <div><span className="text-gray-400">Source : </span><SourceBadge source={viewOrder.source} /></div>
                    <div><span className="text-gray-400">Paiement : </span><span className="text-gray-800">{PAYMENT_METHOD_MAP[viewOrder.paymentMethod ?? "cash_on_delivery"]}</span></div>
                    <div><span className="text-gray-400">Statut paiement : </span>
                      <span className={`font-semibold ${PAYMENT_STATUS_MAP[viewOrder.paymentStatus ?? "pending"]?.cls}`}>
                        {PAYMENT_STATUS_MAP[viewOrder.paymentStatus ?? "pending"]?.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items */}
                {(orderItems.length > 0 || viewOrder.productName) && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <p className="text-gray-600 text-xs font-semibold mb-2">Produits</p>
                    {orderItems.length > 0 ? orderItems.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2.5 py-1.5 border-b border-gray-100 last:border-0">
                        {item.productImage && <img src={item.productImage} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-100" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 text-xs truncate font-medium">{item.productName}</p>
                          <p className="text-gray-400 text-[10px]">{item.quantity} × {formatCurrency(parseFloat(item.unitPrice || "0"))}</p>
                        </div>
                        <span className="text-blue-700 font-bold text-xs shrink-0">{formatCurrency(parseFloat(item.total || "0"))}</span>
                      </div>
                    )) : viewOrder.productName ? (
                      <div className="flex items-center gap-2.5">
                        {viewOrder.productImage && <img src={viewOrder.productImage} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-100" />}
                        <div>
                          <p className="text-gray-800 text-xs font-medium">{viewOrder.productName}</p>
                          <p className="text-gray-400 text-[10px]">{viewOrder.quantity} × {formatCurrency(parseFloat(viewOrder.price?.toString() || "0"))}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Totals */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Sous-total</span><span className="text-gray-800">{formatCurrency(parseFloat(viewOrder.subtotal?.toString() || "0"))}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Frais de livraison</span><span className="text-gray-800">{formatCurrency(parseFloat(viewOrder.deliveryPrice?.toString() || "0"))}</span></div>
                  <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold text-sm">
                    <span className="text-gray-800">Total</span>
                    <span className="text-blue-700">{formatCurrency(parseFloat(viewOrder.total?.toString() || "0"))}</span>
                  </div>
                </div>

                {/* Update Status */}
                <div className="border border-gray-200 rounded-xl p-3 space-y-3 bg-white">
                  <p className="text-gray-600 text-xs font-semibold">Mettre à jour le statut</p>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="bg-white border-gray-200 text-gray-900 text-sm" data-testid="select-order-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-lg">
                      {ORDER_STATUSES.map(s => <SelectItem key={s.key} value={s.key} className="text-gray-800 text-sm">{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {editStatus === "confirmed" && viewOrder.status !== "confirmed" && (
                    <p className="text-amber-600 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Le stock sera déduit automatiquement
                    </p>
                  )}
                  {editStatus === "paid" && viewOrder.status !== "paid" && (
                    <p className="text-violet-600 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Le bénéfice sera enregistré automatiquement
                    </p>
                  )}
                  {editStatus === "returned" && viewOrder.status !== "returned" && (
                    <p className="text-orange-600 text-xs flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" /> Le stock sera restitué automatiquement
                    </p>
                  )}
                  <Button onClick={() => statusMutation.mutate({ id: viewOrder.id, status: editStatus })}
                    disabled={statusMutation.isPending || editStatus === viewOrder.status}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm" data-testid="button-update-status">
                    {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    Mettre à jour
                  </Button>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-gray-600 text-xs font-semibold">Notes</Label>
                  <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                    className="bg-white border-gray-200 text-gray-900 resize-none text-sm placeholder:text-gray-400" rows={2} />
                  <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: viewOrder.id, data: { notes: editNotes } })}
                    disabled={updateMutation.isPending}
                    className="border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs">
                    Enregistrer les notes
                  </Button>
                </div>

                {/* Return info if already returned */}
                {(viewOrder as any).returnReason && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-1 text-xs">
                    <p className="text-orange-700 font-semibold flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" /> Informations retour
                    </p>
                    <p><span className="text-gray-500">Raison : </span><span className="text-gray-800 font-medium">{(viewOrder as any).returnReason}</span></p>
                    <p><span className="text-gray-500">État : </span>
                      <span className={`font-semibold ${(viewOrder as any).returnCondition === "sellable" ? "text-emerald-600" : (viewOrder as any).returnCondition === "damaged" ? "text-red-600" : "text-amber-600"}`}>
                        {RETURN_CONDITIONS.find(c => c.key === (viewOrder as any).returnCondition)?.label ?? (viewOrder as any).returnCondition}
                      </span>
                    </p>
                    {(viewOrder as any).stockRestored && <p className="text-emerald-600 font-medium">✓ Stock restitué</p>}
                    {(viewOrder as any).returnNotes && <p><span className="text-gray-500">Notes : </span>{(viewOrder as any).returnNotes}</p>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1 flex-wrap">
                  <a href={whatsappUrl(viewOrder.customerPhone)} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors text-sm font-semibold min-w-[130px]"
                    data-testid="button-whatsapp-detail">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                  <Button variant="outline"
                    onClick={() => { setViewOrder(null); setBonOrder(viewOrder); }}
                    className="border-violet-200 text-violet-600 hover:bg-violet-50 hover:text-violet-700 text-sm"
                    data-testid="button-print-bon">
                    <Truck className="w-4 h-4 ml-1" /> Bon de livraison
                  </Button>
                  <Button variant="outline"
                    onClick={() => { setViewOrder(null); setInvoiceOrder(viewOrder); }}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 text-sm"
                    data-testid="button-print-order">
                    <Printer className="w-4 h-4 ml-1" /> Facture
                  </Button>
                  <Button variant="outline" onClick={() => { if (confirm("Supprimer définitivement cette commande ?")) deleteMutation.mutate(viewOrder.id); }}
                    className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 text-sm" disabled={deleteMutation.isPending} data-testid="button-delete-order">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
