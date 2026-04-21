import { useState, useMemo } from "react";
import AdminLayout from "./AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CreditCard, Plus, Search, X, Eye, DollarSign, CheckCircle2,
  Clock, XCircle, AlertTriangle, Banknote, RefreshCw,
} from "lucide-react";

type CreditStatus = "unpaid" | "partially_paid" | "paid" | "cancelled";

interface ClientCredit {
  id: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  linkedOrderId: string | null;
  originalAmount: string;
  totalPaid: string;
  remainingAmount: string;
  status: CreditStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreditVersement {
  id: string;
  creditId: string;
  amount: string;
  paymentMethod: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<CreditStatus, { label: string; color: string; icon: any }> = {
  unpaid:          { label: "Impayé",          color: "bg-red-100 text-red-700 border-red-200",    icon: XCircle },
  partially_paid:  { label: "Partiel",          color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle },
  paid:            { label: "Soldé",            color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  cancelled:       { label: "Annulé",           color: "bg-gray-100 text-gray-500 border-gray-200", icon: XCircle },
};

const PAYMENT_METHODS = ["cash", "virement", "chèque", "eDahabia"];
const PM_LABELS: Record<string, string> = { cash: "Espèces", virement: "Virement", "chèque": "Chèque", "eDahabia": "eDahabia" };

function fmt(n: string | number) {
  return new Intl.NumberFormat("fr-FR", { style: "decimal", maximumFractionDigits: 0 }).format(Number(n)) + " DA";
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ────────────────────────────────────────────────
// Modal: créer un crédit
// ────────────────────────────────────────────────
function CreateCreditModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ customerName: "", customerPhone: "", originalAmount: "", notes: "" });

  const mut = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/client-credits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Crédit créé avec succès" });
      setForm({ customerName: "", customerPhone: "", originalAmount: "", notes: "" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <CreditCard className="w-4 h-4 text-red-500" />
            Nouveau crédit client
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Nom du client *</label>
            <Input data-testid="input-credit-customer-name" placeholder="Nom complet" value={form.customerName}
              onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Téléphone</label>
            <Input data-testid="input-credit-phone" placeholder="0555 ..." value={form.customerPhone}
              onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Montant dû (DA) *</label>
            <Input data-testid="input-credit-amount" type="number" min="1" placeholder="0" value={form.originalAmount}
              onChange={e => setForm(f => ({ ...f, originalAmount: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
            <Input data-testid="input-credit-notes" placeholder="Remarques..." value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-credit-cancel">Annuler</Button>
          <Button onClick={() => mut.mutate(form)} disabled={mut.isPending} data-testid="button-credit-submit"
            className="bg-red-600 hover:bg-red-700 text-white">
            {mut.isPending ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────
// Modal: détail crédit + versements
// ────────────────────────────────────────────────
function CreditDetailModal({ credit, onClose }: { credit: ClientCredit; onClose: () => void }) {
  const { toast } = useToast();
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "cash", note: "" });

  const { data: versements = [], isLoading } = useQuery<CreditVersement[]>({
    queryKey: ["/api/client-credits", credit.id, "versements"],
    queryFn: () => fetch(`/api/client-credits/${credit.id}/versements`, { credentials: "include" }).then(r => r.json()),
  });

  const addPayMut = useMutation({
    mutationFn: (data: typeof payForm) => apiRequest("POST", `/api/client-credits/${credit.id}/versements`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-credits", credit.id, "versements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Versement enregistré" });
      setPayForm({ amount: "", paymentMethod: "cash", note: "" });
      setShowPayForm(false);
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const cancelMut = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/client-credits/${credit.id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Crédit annulé" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const st = STATUS_LABELS[credit.status] ?? STATUS_LABELS.unpaid;
  const StIcon = st.icon;
  const isActive = credit.status !== "paid" && credit.status !== "cancelled";
  const remaining = parseFloat(credit.remainingAmount as string);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <CreditCard className="w-4 h-4 text-red-500" />
            Crédit — {credit.customerName}
          </DialogTitle>
        </DialogHeader>

        {/* Info */}
        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Montant initial</p>
            <p className="text-sm font-bold text-gray-800">{fmt(credit.originalAmount)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Total payé</p>
            <p className="text-sm font-bold text-emerald-600">{fmt(credit.totalPaid)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Restant</p>
            <p className="text-sm font-bold text-red-600">{fmt(credit.remainingAmount)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Statut</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${st.color}`}>
              <StIcon className="w-3 h-3" /> {st.label}
            </span>
          </div>
          {credit.customerPhone && (
            <div className="col-span-2 bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-0.5">Téléphone</p>
              <p className="text-sm font-medium text-gray-700">{credit.customerPhone}</p>
            </div>
          )}
          {credit.notes && (
            <div className="col-span-2 bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-0.5">Notes</p>
              <p className="text-xs text-gray-600">{credit.notes}</p>
            </div>
          )}
        </div>

        {/* Ajouter versement */}
        {isActive && (
          <div className="py-2">
            {!showPayForm ? (
              <Button size="sm" onClick={() => setShowPayForm(true)} data-testid="button-show-pay-form"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs w-full">
                <Plus className="w-3 h-3 mr-1" /> Enregistrer un paiement
              </Button>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-emerald-700">Nouveau versement</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Montant (DA) *</label>
                    <Input data-testid="input-versement-amount" type="number" min="1" placeholder={`max ${fmt(remaining)}`}
                      value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Mode de paiement</label>
                    <Select value={payForm.paymentMethod} onValueChange={v => setPayForm(f => ({ ...f, paymentMethod: v }))}>
                      <SelectTrigger data-testid="select-versement-method" className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map(pm => (
                          <SelectItem key={pm} value={pm}>{PM_LABELS[pm] ?? pm}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Input data-testid="input-versement-note" placeholder="Note (optionnelle)" value={payForm.note}
                  onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowPayForm(false)} className="flex-1 text-xs">Annuler</Button>
                  <Button size="sm" onClick={() => addPayMut.mutate(payForm)} disabled={addPayMut.isPending}
                    data-testid="button-versement-submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                    {addPayMut.isPending ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
                    Confirmer
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Historique versements */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Historique des versements ({versements.length})</p>
          {isLoading ? (
            <Skeleton className="h-16 rounded-lg" />
          ) : versements.length === 0 ? (
            <div className="text-center text-gray-400 text-xs py-6 bg-gray-50 rounded-lg">Aucun versement enregistré</div>
          ) : (
            <div className="space-y-2">
              {versements.map(v => (
                <div key={v.id} data-testid={`versement-row-${v.id}`}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{fmt(v.amount)}</p>
                      <p className="text-[10px] text-gray-400">{PM_LABELS[v.paymentMethod] ?? v.paymentMethod} · {fmtDate(v.createdAt)}</p>
                      {v.note && <p className="text-[10px] text-gray-500 italic">{v.note}</p>}
                    </div>
                  </div>
                  {v.createdBy && (
                    <span className="text-[10px] text-gray-400">{v.createdBy}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Annuler */}
        {isActive && (
          <div className="pt-2 border-t border-gray-100">
            <Button variant="outline" size="sm" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}
              data-testid="button-cancel-credit"
              className="text-xs text-red-600 border-red-200 hover:bg-red-50 w-full">
              {cancelMut.isPending ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <X className="w-3 h-3 mr-1" />}
              Annuler ce crédit
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────
// Page principale
// ────────────────────────────────────────────────
export default function AdminClientCredit() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<ClientCredit | null>(null);

  const { data: credits = [], isLoading } = useQuery<ClientCredit[]>({
    queryKey: ["/api/client-credits"],
  });

  const filtered = useMemo(() => {
    return credits.filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q || c.customerName.toLowerCase().includes(q) || (c.customerPhone ?? "").includes(q);
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [credits, search, statusFilter]);

  const totalActive = useMemo(() =>
    credits.filter(c => c.status !== "paid" && c.status !== "cancelled")
      .reduce((s, c) => s + parseFloat(c.remainingAmount as string), 0),
  [credits]);

  const totalPaidAll = useMemo(() =>
    credits.reduce((s, c) => s + parseFloat(c.totalPaid as string), 0),
  [credits]);

  const countByStatus = useMemo(() => ({
    unpaid: credits.filter(c => c.status === "unpaid").length,
    partially_paid: credits.filter(c => c.status === "partially_paid").length,
    paid: credits.filter(c => c.status === "paid").length,
    cancelled: credits.filter(c => c.status === "cancelled").length,
  }), [credits]);

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-red-500" />
              Crédit Client
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Gérez les achats à crédit de vos clients</p>
          </div>
          <Button onClick={() => setShowCreate(true)} data-testid="button-new-credit"
            className="bg-red-600 hover:bg-red-700 text-white text-sm gap-1.5">
            <Plus className="w-4 h-4" /> Nouveau crédit
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-red-500" />
              </div>
              <span className="text-xs text-gray-500">Restant total</span>
            </div>
            <p className="text-sm font-bold text-red-600" data-testid="stat-total-credit">{fmt(totalActive)}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-xs text-gray-500">Total recouvré</span>
            </div>
            <p className="text-sm font-bold text-emerald-600" data-testid="stat-total-paid">{fmt(totalPaidAll)}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <span className="text-xs text-gray-500">En attente</span>
            </div>
            <p className="text-sm font-bold text-gray-800" data-testid="stat-unpaid-count">
              {countByStatus.unpaid + countByStatus.partially_paid} crédits
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-xs text-gray-500">Soldés</span>
            </div>
            <p className="text-sm font-bold text-gray-800" data-testid="stat-paid-count">{countByStatus.paid} crédits</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input data-testid="input-search-credit" placeholder="Rechercher un client..."
              className="pl-9 text-sm h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="select-status-filter" className="w-[160px] text-sm h-9">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="unpaid">Impayé</SelectItem>
              <SelectItem value="partially_paid">Partiel</SelectItem>
              <SelectItem value="paid">Soldé</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                <CreditCard className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Aucun crédit trouvé</p>
              <p className="text-xs text-gray-400 mt-1">Ajoutez un crédit pour commencer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Client</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Montant</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3 hidden sm:table-cell">Payé</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Restant</th>
                    <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">Statut</th>
                    <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3 hidden md:table-cell">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(credit => {
                    const st = STATUS_LABELS[credit.status] ?? STATUS_LABELS.unpaid;
                    const StIcon = st.icon;
                    return (
                      <tr key={credit.id} data-testid={`credit-row-${credit.id}`}
                        className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-800">{credit.customerName}</p>
                          {credit.customerPhone && (
                            <p className="text-xs text-gray-400">{credit.customerPhone}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-gray-700">{fmt(credit.originalAmount)}</p>
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <p className="text-sm text-emerald-600 font-medium">{fmt(credit.totalPaid)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className={`text-sm font-bold ${parseFloat(credit.remainingAmount as string) > 0 ? "text-red-600" : "text-gray-400"}`}>
                            {fmt(credit.remainingAmount)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.color}`}>
                            <StIcon className="w-3 h-3" /> {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          <span className="text-xs text-gray-400">{fmtDate(credit.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => setSelected(credit)}
                            data-testid={`button-view-credit-${credit.id}`}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateCreditModal open={showCreate} onClose={() => setShowCreate(false)} />}
      {selected && <CreditDetailModal credit={selected} onClose={() => setSelected(null)} />}
    </AdminLayout>
  );
}
