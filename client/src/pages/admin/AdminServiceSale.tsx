import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import { useAdminLang } from "@/context/AdminLangContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Plus, Trash2, Loader2, Search } from "lucide-react";
import type { ServiceSale } from "@shared/schema";

const SERVICE_CATEGORIES = [
  "Réparation téléphone",
  "Flashage / Déblocage",
  "Remplacement écran",
  "Remplacement batterie",
  "Récupération données",
  "Configuration",
  "Accessoire",
  "Autre",
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "card", label: "Carte bancaire" },
  { value: "transfer", label: "Virement" },
  { value: "other", label: "Autre" },
];

const PAYMENT_BADGE: Record<string, string> = {
  cash: "bg-green-100 text-green-700",
  card: "bg-blue-100 text-blue-700",
  transfer: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-700",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Espèces",
  card: "Carte",
  transfer: "Virement",
  other: "Autre",
};

function formatDate(d: string | null | undefined) {
  if (!d) return "";
  const date = new Date(d);
  const datePart = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  const timePart = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
  return `${datePart} · ${timePart}`;
}
function fmt(n: string | number | null | undefined) {
  const v = parseFloat(String(n ?? 0));
  return (isNaN(v) ? "0.00" : new Intl.NumberFormat("fr-FR", { style: "decimal", maximumFractionDigits: 2 }).format(v)) + " DA";
}

export default function AdminServiceSale() {
  const { lang } = useAdminLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.permissions?.includes("*");

  const [form, setForm] = useState({
    serviceName: "",
    category: "",
    customerName: "",
    customerPhone: "",
    amount: "",
    paymentMethod: "cash",
    notes: "",
  });
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: sales = [], isLoading } = useQuery<ServiceSale[]>({
    queryKey: ["/api/service-sales"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/service-sales", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-sales"] });
      toast({ title: "Vente enregistrée avec succès" });
      setForm({ serviceName: "", category: "", customerName: "", customerPhone: "", amount: "", paymentMethod: "cash", notes: "" });
      setShowForm(false);
    },
    onError: (e: any) => toast({ title: e.message ?? "Erreur", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/service-sales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-sales"] });
      toast({ title: "Vente supprimée" });
    },
    onError: (e: any) => toast({ title: e.message ?? "Erreur", variant: "destructive" }),
  });

  const filtered = sales.filter(s =>
    !search ||
    s.serviceName.toLowerCase().includes(search.toLowerCase()) ||
    (s.customerName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (s.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = filtered.reduce((sum, s) => sum + parseFloat(s.amount ?? "0"), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.serviceName.trim()) return toast({ title: "Nom du service requis", variant: "destructive" });
    if (!form.amount || parseFloat(form.amount) <= 0) return toast({ title: "Montant invalide", variant: "destructive" });
    createMutation.mutate(form);
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Vente service</h1>
              <p className="text-xs text-gray-500">{sales.length} vente{sales.length !== 1 ? "s" : ""} enregistrée{sales.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(v => !v)}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
            data-testid="btn-new-service-sale"
          >
            <Plus className="w-4 h-4" />
            Nouvelle vente
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="border-violet-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-violet-700">Enregistrer une vente de service</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="serviceName">Nom du service *</Label>
                  <Input
                    id="serviceName"
                    data-testid="input-service-name"
                    placeholder="Ex: Réparation écran iPhone 12"
                    value={form.serviceName}
                    onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger id="category" data-testid="select-category">
                      <SelectValue placeholder="Choisir une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="customerName">Nom du client</Label>
                  <Input
                    id="customerName"
                    data-testid="input-customer-name"
                    placeholder="Nom du client (optionnel)"
                    value={form.customerName}
                    onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="customerPhone">Téléphone client</Label>
                  <Input
                    id="customerPhone"
                    data-testid="input-customer-phone"
                    placeholder="0600 000 000"
                    value={form.customerPhone}
                    onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="amount">Montant (DA) *</Label>
                  <Input
                    id="amount"
                    data-testid="input-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentMethod">Mode de paiement *</Label>
                  <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                    <SelectTrigger id="paymentMethod" data-testid="select-payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    data-testid="input-notes"
                    placeholder="Remarques, détails de la réparation..."
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-2 flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    data-testid="btn-cancel-service"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                    data-testid="btn-submit-service"
                  >
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Enregistrer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="bg-violet-50 border-violet-100">
            <CardContent className="p-4">
              <p className="text-xs text-violet-500 font-medium mb-1">Total ventes</p>
              <p className="text-2xl font-bold text-violet-700" data-testid="stat-total-count">{filtered.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-100">
            <CardContent className="p-4">
              <p className="text-xs text-emerald-500 font-medium mb-1">Chiffre d'affaires</p>
              <p className="text-2xl font-bold text-emerald-700" data-testid="stat-total-revenue">{fmt(totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100 col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs text-blue-500 font-medium mb-1">Panier moyen</p>
              <p className="text-2xl font-bold text-blue-700" data-testid="stat-avg">
                {filtered.length ? fmt(totalRevenue / filtered.length) : "0,00 DA"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search + List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Rechercher par service, client, catégorie..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-service"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune vente de service enregistrée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(sale => (
                <Card key={sale.id} className="hover:shadow-sm transition-shadow" data-testid={`card-service-sale-${sale.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-800 text-sm" data-testid={`text-service-name-${sale.id}`}>
                            {sale.serviceName}
                          </span>
                          {sale.category && (
                            <Badge variant="outline" className="text-xs text-violet-600 border-violet-200 bg-violet-50">
                              {sale.category}
                            </Badge>
                          )}
                          <Badge className={`text-xs ${PAYMENT_BADGE[sale.paymentMethod] ?? "bg-gray-100 text-gray-600"}`}>
                            {PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          {sale.customerName && <span>👤 {sale.customerName}</span>}
                          {sale.customerPhone && <span>📞 {sale.customerPhone}</span>}
                          {sale.cashierName && <span>Caissier: {sale.cashierName}</span>}
                          {sale.createdAt && (
                            <span>🕐 {formatDate(sale.createdAt.toString())}</span>
                          )}
                        </div>
                        {sale.notes && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{sale.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-bold text-emerald-700 text-base" data-testid={`text-amount-${sale.id}`}>
                          {fmt(sale.amount)}
                        </span>
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 w-8 h-8"
                            onClick={() => { if (confirm("Supprimer cette vente ?")) deleteMutation.mutate(sale.id); }}
                            disabled={deleteMutation.isPending}
                            data-testid={`btn-delete-service-sale-${sale.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
