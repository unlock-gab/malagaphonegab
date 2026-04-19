import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  RotateCcw, Plus, Eye, CheckCircle2, XCircle, Search,
  ArrowLeftRight, PackageCheck, AlertTriangle, ChevronDown,
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
import type { SupplierReturn } from "@shared/schema";

function formatCurrency(v: number | string | null | undefined) {
  const n = parseFloat((v ?? "0").toString());
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " DA";
}
function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}
function localNow() {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: any }> = {
  pending:   { label: "En attente",  badge: "bg-amber-50 text-amber-700 border-amber-200",   icon: AlertTriangle },
  completed: { label: "Appliqué",    badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  cancelled: { label: "Annulé",      badge: "bg-red-50 text-red-700 border-red-200",          icon: XCircle },
};
const TYPE_CONFIG: Record<string, { label: string; badge: string }> = {
  return:   { label: "Retour",   badge: "bg-orange-50 text-orange-700 border-orange-200" },
  exchange: { label: "Échange",  badge: "bg-blue-50 text-blue-700 border-blue-200" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${cfg.badge}`}>{cfg.label}</span>;
}
function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.return;
  return <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${cfg.badge}`}>{cfg.label}</span>;
}

// ─── Balance Cards ────────────────────────────────────────────────────────────
function BalanceCards({ balance }: { balance: any }) {
  if (!balance) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
        <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Achat total</p>
        <p className="text-gray-900 text-sm font-black">{formatCurrency(balance.total ?? balance.totalPurchases)}</p>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
        <p className="text-emerald-500 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Payé</p>
        <p className="text-emerald-700 text-sm font-black">{formatCurrency(balance.totalPaid)}</p>
      </div>
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
        <p className="text-orange-500 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Retourné</p>
        <p className="text-orange-700 text-sm font-black">{formatCurrency(balance.totalReturned)}</p>
      </div>
      {(balance.credit ?? 0) > 0
        ? <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
            <p className="text-violet-500 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Crédit fournisseur</p>
            <p className="text-violet-700 text-sm font-black">{formatCurrency(balance.credit)}</p>
          </div>
        : <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-400 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Reste à payer</p>
            <p className="text-red-700 text-sm font-black">{formatCurrency(balance.remaining)}</p>
          </div>
      }
    </div>
  );
}

// ─── Create/Edit Modal ────────────────────────────────────────────────────────
function CreateReturnModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    supplierId: "", purchaseId: "", type: "return",
    productId: "", productName: "", phoneUnitId: "", imei: "",
    quantity: "1", unitValue: "", totalValue: "",
    replacementProductId: "", replacementProductName: "",
    replacementQuantity: "1", replacementUnitCost: "", replacementTotalCost: "",
    replacementPhoneUnitId: "", replacementImei: "",
    reason: "", notes: "", returnDate: localNow(),
    autoApply: true,
  });
  const setF = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const { data: suppliers = [] } = useQuery<any[]>({ queryKey: ["/api/suppliers"] });
  const { data: purchases = [] } = useQuery<any[]>({ queryKey: ["/api/purchases"] });
  const { data: products = [] } = useQuery<any[]>({ queryKey: ["/api/products"] });

  const supplierPurchases = purchases.filter((p: any) => !form.supplierId || p.supplierId === form.supplierId);
  const selectedPurchase = purchases.find((p: any) => p.id === form.purchaseId);
  const { data: fullPurchase } = useQuery<any>({
    queryKey: [`/api/purchases/${form.purchaseId}`],
    enabled: !!form.purchaseId,
  });
  const purchaseItems: any[] = fullPurchase?.items ?? [];
  const selectedItem = purchaseItems.find((i: any) => i.productId === form.productId);
  const { data: balance } = useQuery<any>({
    queryKey: [`/api/purchase-balance/${form.purchaseId}`],
    enabled: !!form.purchaseId,
  });

  // Phone units for selected product
  const { data: phoneUnits = [] } = useQuery<any[]>({
    queryKey: [`/api/phone-units?productId=${form.productId}`],
    enabled: !!form.productId,
  });
  const selectedProduct = products.find((p: any) => p.id === form.productId);
  const isPhone = selectedProduct?.productType === "phone" || selectedProduct?.productType === "tablet";

  const replacementProduct = products.find((p: any) => p.id === form.replacementProductId);
  const isReplacementPhone = replacementProduct?.productType === "phone" || replacementProduct?.productType === "tablet";
  const { data: replacementPhoneUnits = [] } = useQuery<any[]>({
    queryKey: [`/api/phone-units?productId=${form.replacementProductId}`],
    enabled: !!form.replacementProductId && form.type === "exchange",
  });

  // Auto-calc total
  useEffect(() => {
    const tv = (parseFloat(form.unitValue) || 0) * (parseInt(form.quantity) || 1);
    setF("totalValue", tv > 0 ? tv.toString() : "");
  }, [form.unitValue, form.quantity]);
  useEffect(() => {
    const tv = (parseFloat(form.replacementUnitCost) || 0) * (parseInt(form.replacementQuantity) || 1);
    setF("replacementTotalCost", tv > 0 ? tv.toString() : "");
  }, [form.replacementUnitCost, form.replacementQuantity]);

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/supplier-returns", {
      ...form,
      supplierName: suppliers.find((s: any) => s.id === form.supplierId)?.name ?? form.supplierId,
      quantity: parseInt(form.quantity) || 1,
      unitValue: parseFloat(form.unitValue) || 0,
      totalValue: parseFloat(form.totalValue) || 0,
      replacementQuantity: parseInt(form.replacementQuantity) || 1,
      replacementUnitCost: parseFloat(form.replacementUnitCost) || null,
      replacementTotalCost: parseFloat(form.replacementTotalCost) || null,
      phoneUnitId: form.phoneUnitId || null,
      imei: form.imei || null,
      replacementPhoneUnitId: form.replacementPhoneUnitId || null,
      replacementImei: form.replacementImei || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "✓ Retour enregistré" });
      onSuccess();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const canSubmit = form.purchaseId && form.productName && parseFloat(form.totalValue) > 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <RotateCcw className="w-5 h-5 text-orange-600" />
            Nouveau retour / échange fournisseur
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Type */}
          <div className="flex gap-2">
            {["return", "exchange"].map(t => (
              <button key={t} onClick={() => setF("type", t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${form.type === t ? (t === "return" ? "bg-orange-600 text-white border-orange-600" : "bg-blue-600 text-white border-blue-600") : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                {t === "return" ? "⬆ Retour au fournisseur" : "⇄ Échange"}
              </button>
            ))}
          </div>

          {/* Supplier + Purchase */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-500 text-xs mb-1 block">Fournisseur</Label>
              <Select value={form.supplierId} onValueChange={v => { setF("supplierId", v); setF("purchaseId", ""); setF("productId", ""); setF("productName", ""); }}>
                <SelectTrigger className="bg-white border-gray-200 text-sm h-9"><SelectValue placeholder="Choisir fournisseur" /></SelectTrigger>
                <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-500 text-xs mb-1 block">Achat lié *</Label>
              <Select value={form.purchaseId} onValueChange={v => { setF("purchaseId", v); setF("productId", ""); setF("productName", ""); }}>
                <SelectTrigger className="bg-white border-gray-200 text-sm h-9"><SelectValue placeholder="Choisir achat" /></SelectTrigger>
                <SelectContent>
                  {supplierPurchases.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.id.slice(-6).toUpperCase()} — {p.supplierName} — {formatCurrency(p.total)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Purchase balance preview */}
          {form.purchaseId && balance && <BalanceCards balance={balance} />}

          {/* Product selection */}
          <div>
            <Label className="text-gray-500 text-xs mb-1 block">Produit retourné *</Label>
            {purchaseItems.length > 0
              ? <Select value={form.productId} onValueChange={v => {
                  const item = purchaseItems.find((i: any) => i.productId === v);
                  setF("productId", v);
                  setF("productName", item?.productName ?? "");
                  setF("unitValue", item?.unitCost ?? "");
                  setF("phoneUnitId", "");
                  setF("imei", "");
                }}>
                  <SelectTrigger className="bg-white border-gray-200 text-sm h-9"><SelectValue placeholder="Choisir article de l'achat" /></SelectTrigger>
                  <SelectContent>
                    {purchaseItems.map((i: any) => (
                      <SelectItem key={i.id} value={i.productId ?? i.id}>{i.productName} — {formatCurrency(i.unitCost)} / u</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              : <Input value={form.productName} onChange={e => setF("productName", e.target.value)}
                  placeholder="Nom du produit" className="bg-white border-gray-200 text-sm h-9" />
            }
          </div>

          {/* IMEI for phones */}
          {isPhone && phoneUnits.length > 0 && (
            <div>
              <Label className="text-gray-500 text-xs mb-1 block">Unité IMEI à retourner</Label>
              <Select value={form.phoneUnitId} onValueChange={v => {
                const u = phoneUnits.find((u: any) => u.id === v);
                setF("phoneUnitId", v);
                setF("imei", u?.imei ?? "");
              }}>
                <SelectTrigger className="bg-white border-gray-200 text-sm h-9"><SelectValue placeholder="Choisir IMEI" /></SelectTrigger>
                <SelectContent>
                  {phoneUnits.filter((u: any) => u.status === "available").map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>IMEI: {u.imei} ({u.status})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.imei && <p className="text-xs text-gray-500 mt-1">IMEI sélectionné : {form.imei}</p>}
            </div>
          )}

          {/* Quantity + Value */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-gray-500 text-xs mb-1 block">Quantité</Label>
              <Input type="number" min="1" value={form.quantity} onChange={e => setF("quantity", e.target.value)}
                className="bg-white border-gray-200 text-sm h-9" />
            </div>
            <div>
              <Label className="text-gray-500 text-xs mb-1 block">Valeur unitaire (DA)</Label>
              <Input type="number" min="0" value={form.unitValue} onChange={e => setF("unitValue", e.target.value)}
                className="bg-white border-gray-200 text-sm h-9" />
            </div>
            <div>
              <Label className="text-gray-500 text-xs mb-1 block">Total retour (DA)</Label>
              <Input type="number" min="0" value={form.totalValue} onChange={e => setF("totalValue", e.target.value)}
                className="bg-white border-gray-200 text-sm h-9" />
            </div>
          </div>

          {/* Exchange fields */}
          {form.type === "exchange" && (
            <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-3 space-y-3">
              <p className="text-blue-700 text-xs font-bold">Article de remplacement (reçu du fournisseur)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">Produit de remplacement</Label>
                  <Select value={form.replacementProductId} onValueChange={v => {
                    const p = products.find((pr: any) => pr.id === v);
                    setF("replacementProductId", v);
                    setF("replacementProductName", p?.name ?? "");
                    setF("replacementPhoneUnitId", "");
                    setF("replacementImei", "");
                  }}>
                    <SelectTrigger className="bg-white border-gray-200 text-sm h-9"><SelectValue placeholder="Choisir produit" /></SelectTrigger>
                    <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">Qté reçue</Label>
                  <Input type="number" min="1" value={form.replacementQuantity} onChange={e => setF("replacementQuantity", e.target.value)}
                    className="bg-white border-gray-200 text-sm h-9" />
                </div>
              </div>
              {isReplacementPhone && replacementPhoneUnits.length > 0 && (
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">IMEI du produit reçu</Label>
                  <Select value={form.replacementPhoneUnitId} onValueChange={v => {
                    const u = replacementPhoneUnits.find((u: any) => u.id === v);
                    setF("replacementPhoneUnitId", v);
                    setF("replacementImei", u?.imei ?? "");
                  }}>
                    <SelectTrigger className="bg-white border-gray-200 text-sm h-9"><SelectValue placeholder="IMEI reçu" /></SelectTrigger>
                    <SelectContent>
                      {replacementPhoneUnits.map((u: any) => <SelectItem key={u.id} value={u.id}>IMEI: {u.imei}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!isReplacementPhone && form.replacementProductId && (
                <Input placeholder="IMEI ou référence (optionnel)" value={form.replacementImei}
                  onChange={e => setF("replacementImei", e.target.value)}
                  className="bg-white border-gray-200 text-sm h-9" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">Coût unitaire remplacement (DA)</Label>
                  <Input type="number" min="0" value={form.replacementUnitCost} onChange={e => setF("replacementUnitCost", e.target.value)}
                    className="bg-white border-gray-200 text-sm h-9" />
                </div>
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">Total remplacement (DA)</Label>
                  <Input type="number" min="0" value={form.replacementTotalCost} onChange={e => setF("replacementTotalCost", e.target.value)}
                    className="bg-white border-gray-200 text-sm h-9" />
                </div>
              </div>
              {(parseFloat(form.replacementTotalCost) || 0) > (parseFloat(form.totalValue) || 0) && (
                <p className="text-amber-700 text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  ⚠ Différence à payer au fournisseur : {formatCurrency((parseFloat(form.replacementTotalCost) || 0) - (parseFloat(form.totalValue) || 0))}
                </p>
              )}
              {(parseFloat(form.totalValue) || 0) > (parseFloat(form.replacementTotalCost) || 0) && parseFloat(form.replacementTotalCost) > 0 && (
                <p className="text-emerald-700 text-xs bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                  ✓ Crédit fournisseur : {formatCurrency((parseFloat(form.totalValue) || 0) - (parseFloat(form.replacementTotalCost) || 0))}
                </p>
              )}
            </div>
          )}

          {/* Reason + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-500 text-xs mb-1 block">Motif</Label>
              <Input value={form.reason} onChange={e => setF("reason", e.target.value)}
                placeholder="Défectueux, mauvaise réf…" className="bg-white border-gray-200 text-sm h-9" />
            </div>
            <div>
              <Label className="text-gray-500 text-xs mb-1 block">Date et heure</Label>
              <Input type="datetime-local" value={form.returnDate} onChange={e => setF("returnDate", e.target.value)}
                className="bg-white border-gray-200 text-sm h-9" />
            </div>
          </div>
          <div>
            <Label className="text-gray-500 text-xs mb-1 block">Notes (optionnel)</Label>
            <Textarea value={form.notes} onChange={e => setF("notes", e.target.value)}
              placeholder="Détails supplémentaires…" className="bg-white border-gray-200 text-sm" rows={2} />
          </div>

          {/* Auto-apply toggle */}
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <input type="checkbox" id="autoApply" checked={form.autoApply as unknown as boolean}
              onChange={e => setF("autoApply", e.target.checked)}
              className="w-4 h-4 accent-emerald-600" />
            <label htmlFor="autoApply" className="text-gray-700 text-xs font-medium cursor-pointer">
              Appliquer immédiatement (stock + balance fournisseur mis à jour)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="border-gray-200 text-gray-600">Annuler</Button>
            <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5">
              {mutation.isPending ? "Enregistrement…" : "Enregistrer le retour"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function ReturnDetailModal({ ret, onClose }: { ret: SupplierReturn; onClose: () => void }) {
  const { toast } = useToast();
  const { data: balance } = useQuery<any>({
    queryKey: ["/api/purchase-balance", ret.purchaseId],
  });

  const applyMut = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/supplier-returns/${ret.id}/apply`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "✓ Retour appliqué" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
  const cancelMut = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/supplier-returns/${ret.id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Retour annulé" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <RotateCcw className="w-4 h-4 text-orange-600" />
            Détail retour #{ret.id.slice(-6).toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Status row */}
          <div className="flex items-center gap-2">
            <StatusBadge status={ret.status} />
            <TypeBadge type={ret.type} />
            <span className="text-gray-400 text-xs ml-auto">{formatDateTime(ret.returnDate)}</span>
          </div>

          {/* Balance after this return */}
          {balance && <BalanceCards balance={balance} />}

          {/* Info grid */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2 text-sm">
            <Row label="Fournisseur" value={ret.supplierName} />
            <Row label="Achat réf." value={`#${ret.purchaseId.slice(-6).toUpperCase()}`} />
            <Row label="Produit" value={ret.productName} />
            {ret.imei && <Row label="IMEI" value={ret.imei} mono />}
            <Row label="Quantité" value={ret.quantity.toString()} />
            <Row label="Valeur unitaire" value={formatCurrency(ret.unitValue)} />
            <Row label="Total retour" value={<strong className="text-orange-600">{formatCurrency(ret.totalValue)}</strong>} />
            {ret.reason && <Row label="Motif" value={ret.reason} />}
            {ret.notes && <Row label="Notes" value={ret.notes} />}
          </div>

          {/* Exchange details */}
          {ret.type === "exchange" && ret.replacementProductName && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2 text-sm">
              <p className="text-blue-700 font-semibold text-xs mb-1">Remplacement reçu</p>
              <Row label="Produit reçu" value={ret.replacementProductName} />
              {ret.replacementImei && <Row label="IMEI reçu" value={ret.replacementImei} mono />}
              <Row label="Qté reçue" value={(ret.replacementQuantity ?? 1).toString()} />
              <Row label="Coût remplacement" value={formatCurrency(ret.replacementTotalCost)} />
              {ret.replacementTotalCost && ret.totalValue && (
                <Row label="Différence nette"
                  value={<span className={parseFloat(ret.replacementTotalCost as string) > parseFloat(ret.totalValue as string) ? "text-red-600 font-semibold" : "text-emerald-600 font-semibold"}>
                    {parseFloat(ret.replacementTotalCost as string) > parseFloat(ret.totalValue as string)
                      ? `+${formatCurrency(parseFloat(ret.replacementTotalCost as string) - parseFloat(ret.totalValue as string))} à payer`
                      : `${formatCurrency(parseFloat(ret.totalValue as string) - parseFloat(ret.replacementTotalCost as string))} crédit`
                    }
                  </span>}
                />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {ret.status === "pending" && (
              <Button onClick={() => applyMut.mutate()} disabled={applyMut.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {applyMut.isPending ? "Application…" : "Appliquer (stock + balance)"}
              </Button>
            )}
            {ret.status !== "cancelled" && (
              <Button variant="outline" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}
                className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5">
                <XCircle className="w-4 h-4" />
                {cancelMut.isPending ? "Annulation…" : "Annuler"}
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="border-gray-200 text-gray-600">Fermer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-2 py-0.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-xs shrink-0">{label}</span>
      <span className={`text-gray-800 text-xs font-medium text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSupplierReturns() {
  const { dir } = useAdminLang();
  const [showCreate, setShowCreate] = useState(false);
  const [viewReturn, setViewReturn] = useState<SupplierReturn | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: returns = [], isLoading } = useQuery<SupplierReturn[]>({
    queryKey: ["/api/supplier-returns"],
    refetchInterval: 30000,
  });

  const filtered = returns.filter(r => {
    const matchSearch = !search.trim() ||
      r.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      r.productName.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.type === typeFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalCompleted = returns.filter(r => r.status === "completed");
  const totalReturnedValue = totalCompleted.reduce((s, r) => s + parseFloat(r.totalValue as string), 0);

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4" dir={dir}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-600" />
              Retours fournisseur
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {returns.length} retour(s) • Valeur totale retournée :
              <span className="text-orange-600 font-semibold ml-1">{formatCurrency(totalReturnedValue)}</span>
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white text-sm shadow-sm gap-1.5"
            data-testid="button-new-supplier-return">
            <Plus className="w-4 h-4" />
            Nouveau retour
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher fournisseur, produit, réf…"
              className="bg-white border-gray-200 text-sm h-9 pr-10" />
          </div>
          <div className="flex gap-1">
            {["all", "return", "exchange"].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${typeFilter === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                {t === "all" ? "Tout" : t === "return" ? "Retours" : "Échanges"}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {["all", "pending", "completed", "cancelled"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${statusFilter === s ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                {s === "all" ? "Tous statuts" : STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <RotateCcw className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun retour fournisseur</p>
            <p className="text-gray-400 text-sm mt-1">Créez votre premier retour en cliquant sur "Nouveau retour"</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs">
                    <th className="text-right p-3 font-semibold">Réf.</th>
                    <th className="text-right p-3 font-semibold">Fournisseur</th>
                    <th className="text-right p-3 font-semibold hidden md:table-cell">Achat</th>
                    <th className="text-right p-3 font-semibold">Type</th>
                    <th className="text-right p-3 font-semibold">Produit</th>
                    <th className="text-right p-3 font-semibold">Montant</th>
                    <th className="text-center p-3 font-semibold">Statut</th>
                    <th className="text-right p-3 font-semibold hidden lg:table-cell">Date</th>
                    <th className="text-center p-3 font-semibold w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <span className="text-gray-500 font-mono text-xs">#{r.id.slice(-6).toUpperCase()}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-800 font-medium text-xs">{r.supplierName}</span>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <span className="text-gray-500 font-mono text-xs">#{r.purchaseId.slice(-6).toUpperCase()}</span>
                      </td>
                      <td className="p-3"><TypeBadge type={r.type} /></td>
                      <td className="p-3">
                        <div>
                          <p className="text-gray-800 text-xs font-medium">{r.productName}</p>
                          {r.imei && <p className="text-gray-400 text-[10px] font-mono">IMEI: {r.imei}</p>}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-orange-600 font-bold text-xs">{formatCurrency(r.totalValue)}</span>
                      </td>
                      <td className="p-3 text-center"><StatusBadge status={r.status} /></td>
                      <td className="p-3 hidden lg:table-cell">
                        <span className="text-gray-400 text-xs">{formatDateTime(r.returnDate)}</span>
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => setViewReturn(r)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          data-testid={`button-view-return-${r.id}`}>
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showCreate && <CreateReturnModal onClose={() => setShowCreate(false)} onSuccess={() => setShowCreate(false)} />}
        {viewReturn && <ReturnDetailModal ret={viewReturn} onClose={() => setViewReturn(null)} />}
      </div>
    </AdminLayout>
  );
}
