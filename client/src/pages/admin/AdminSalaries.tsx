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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  UserCheck, Plus, Loader2, ChevronRight, Pencil,
  Banknote, TrendingDown, Users, ArrowDownLeft, X, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import type { Employee } from "@shared/schema";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "card", label: "Carte bancaire" },
  { value: "transfer", label: "Virement" },
];

const STATUS_CONFIG = {
  paid:          { label: "Payé",              labelAr: "مدفوع",        cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  partially_paid:{ label: "Partiel",           labelAr: "جزئي",         cls: "bg-amber-100 text-amber-700",   icon: Clock },
  unpaid:        { label: "Non payé",          labelAr: "غير مدفوع",    cls: "bg-red-100 text-red-700",       icon: AlertCircle },
};

function fmt(n: number) { return n.toFixed(2); }
function fmtDate(d: string | Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type PayrollRow = {
  employee: Employee;
  baseSalary: number;
  totalAdvances: number;
  totalPayments: number;
  remaining: number;
  status: "paid" | "partially_paid" | "unpaid";
};

type PayrollSummary = {
  totalPayroll: number;
  totalPaid: number;
  totalAdvances: number;
  totalRemaining: number;
  activeCount: number;
};

type PayrollData = {
  month: number;
  year: number;
  rows: PayrollRow[];
  summary: PayrollSummary;
};

// ─── EMPLOYEE FORM MODAL ──────────────────────────────────────────────────────
function EmployeeModal({ open, onClose, initial }: {
  open: boolean; onClose: () => void;
  initial?: Employee | null;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const [form, setForm] = useState({
    fullName: initial?.fullName ?? "",
    phone: initial?.phone ?? "",
    jobTitle: initial?.jobTitle ?? "",
    monthlySalary: initial?.monthlySalary ?? "",
    startDate: initial?.startDate ? new Date(initial.startDate).toISOString().split("T")[0] : "",
    status: initial?.status ?? "active",
    notes: initial?.notes ?? "",
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit
        ? apiRequest("PATCH", `/api/employees/${initial!.id}`, data)
        : apiRequest("POST", "/api/employees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: isEdit ? "Employé modifié" : "Employé ajouté" });
      onClose();
    },
    onError: (e: any) => toast({ title: e.message ?? "Erreur", variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) return toast({ title: "Nom requis", variant: "destructive" });
    if (!parseFloat(form.monthlySalary) || parseFloat(form.monthlySalary) <= 0)
      return toast({ title: "Salaire invalide", variant: "destructive" });
    mutation.mutate(form);
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'employé" : "Ajouter un employé"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Nom complet *</Label>
              <Input data-testid="input-emp-fullname" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Ahmed Benali" />
            </div>
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input data-testid="input-emp-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0600 000 000" />
            </div>
            <div className="space-y-1">
              <Label>Poste</Label>
              <Input data-testid="input-emp-jobtitle" value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} placeholder="Vendeur" />
            </div>
            <div className="space-y-1">
              <Label>Salaire mensuel (MAD) *</Label>
              <Input data-testid="input-emp-salary" type="number" min="0" step="0.01" value={form.monthlySalary} onChange={e => setForm(f => ({ ...f, monthlySalary: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Date début</Label>
              <Input data-testid="input-emp-startdate" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-emp-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Notes</Label>
              <Textarea data-testid="input-emp-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="btn-submit-employee">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── ADVANCE MODAL ────────────────────────────────────────────────────────────
function AdvanceModal({ open, onClose, employee, month, year }: {
  open: boolean; onClose: () => void;
  employee: Employee; month: number; year: number;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/salary-advances", {
      employeeId: employee.id, month, year, amount, note,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salary-advances"] });
      toast({ title: `Avance de ${amount} MAD enregistrée` });
      setAmount(""); setNote("");
      onClose();
    },
    onError: (e: any) => toast({ title: e.message ?? "Erreur", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4 text-amber-600" />
            Avance — {employee.fullName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {MONTHS_FR[month - 1]} {year} · Salaire de base : <span className="font-semibold text-gray-700">{fmt(parseFloat(employee.monthlySalary))} MAD</span>
          </p>
          <div className="space-y-1">
            <Label>Montant (MAD) *</Label>
            <Input data-testid="input-advance-amount" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus />
          </div>
          <div className="space-y-1">
            <Label>Note</Label>
            <Input data-testid="input-advance-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Motif de l'avance..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={mutation.isPending || !amount}
            onClick={() => mutation.mutate()}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            data-testid="btn-confirm-advance"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── PAYMENT MODAL ────────────────────────────────────────────────────────────
function PaymentModal({ open, onClose, employee, month, year, remaining }: {
  open: boolean; onClose: () => void;
  employee: Employee; month: number; year: number; remaining: number;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(String(Math.max(0, remaining)));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/salary-payments", {
      employeeId: employee.id, month, year, amount, paymentMethod, note,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salary-payments"] });
      toast({ title: `Paiement de ${amount} MAD enregistré` });
      setAmount(""); setNote(""); setPaymentMethod("cash");
      onClose();
    },
    onError: (e: any) => toast({ title: e.message ?? "Erreur", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-600" />
            Payer salaire — {employee.fullName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {MONTHS_FR[month - 1]} {year} · Restant : <span className="font-semibold text-red-600">{fmt(remaining)} MAD</span>
          </p>
          <div className="space-y-1">
            <Label>Montant (MAD) *</Label>
            <Input data-testid="input-payment-amount" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus />
          </div>
          <div className="space-y-1">
            <Label>Mode de paiement *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Note</Label>
            <Input data-testid="input-payment-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Remarque..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={mutation.isPending || !amount}
            onClick={() => mutation.mutate()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            data-testid="btn-confirm-payment"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Payer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function DetailModal({ open, onClose, row, month, year, lang }: {
  open: boolean; onClose: () => void;
  row: PayrollRow; month: number; year: number; lang: string;
}) {
  const isAdmin = true;
  const { toast } = useToast();

  const { data: advances = [], isLoading: advLoading } = useQuery<any[]>({
    queryKey: ["/api/salary-advances", row.employee.id, month, year],
    queryFn: () => fetch(`/api/salary-advances?employeeId=${row.employee.id}&month=${month}&year=${year}`, { credentials: "include" }).then(r => r.json()),
    enabled: open,
  });

  const { data: payments = [], isLoading: payLoading } = useQuery<any[]>({
    queryKey: ["/api/salary-payments", row.employee.id, month, year],
    queryFn: () => fetch(`/api/salary-payments?employeeId=${row.employee.id}&month=${month}&year=${year}`, { credentials: "include" }).then(r => r.json()),
    enabled: open,
  });

  const delAdvanceMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/salary-advances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-advances", row.employee.id, month, year] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/summary"] });
      toast({ title: "Avance supprimée" });
    },
    onError: (e: any) => toast({ title: e.message ?? "Erreur", variant: "destructive" }),
  });

  const delPaymentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/salary-payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-payments", row.employee.id, month, year] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/summary"] });
      toast({ title: "Paiement supprimé" });
    },
    onError: (e: any) => toast({ title: e.message ?? "Erreur", variant: "destructive" }),
  });

  const StatusIcon = STATUS_CONFIG[row.status].icon;
  const months = lang === "ar" ? MONTHS_AR : MONTHS_FR;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            {row.employee.fullName}
          </DialogTitle>
        </DialogHeader>

        {/* Employee info */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
          {row.employee.jobTitle && <div className="text-gray-500">Poste: <span className="text-gray-800 font-medium">{row.employee.jobTitle}</span></div>}
          {row.employee.phone && <div className="text-gray-500">Tél: <span className="text-gray-800">{row.employee.phone}</span></div>}
          <div className="text-gray-500">Salaire de base: <span className="text-gray-800 font-semibold">{fmt(row.baseSalary)} MAD</span></div>
        </div>

        {/* Current month summary */}
        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">{months[month - 1]} {year}</span>
            <Badge className={`${STATUS_CONFIG[row.status].cls} flex items-center gap-1 text-xs`}>
              <StatusIcon className="w-3 h-3" />
              {lang === "ar" ? STATUS_CONFIG[row.status].labelAr : STATUS_CONFIG[row.status].label}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-blue-50 rounded p-2">
              <div className="text-blue-500 text-xs">Base</div>
              <div className="font-bold text-blue-700">{fmt(row.baseSalary)} MAD</div>
            </div>
            <div className="bg-amber-50 rounded p-2">
              <div className="text-amber-500 text-xs">Avances</div>
              <div className="font-bold text-amber-700">- {fmt(row.totalAdvances)} MAD</div>
            </div>
            <div className="bg-emerald-50 rounded p-2">
              <div className="text-emerald-500 text-xs">Payé</div>
              <div className="font-bold text-emerald-700">- {fmt(row.totalPayments)} MAD</div>
            </div>
            <div className="bg-red-50 rounded p-2">
              <div className="text-red-500 text-xs">Restant</div>
              <div className="font-bold text-red-700">{fmt(row.remaining)} MAD</div>
            </div>
          </div>
        </div>

        {/* Advances history */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <ArrowDownLeft className="w-3.5 h-3.5 text-amber-500" />
            Avances du mois
          </h4>
          {advLoading ? <div className="text-center py-3"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
            : advances.length === 0 ? <p className="text-xs text-gray-400 py-2">Aucune avance ce mois</p>
            : (
              <div className="space-y-1.5">
                {advances.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-sm bg-amber-50 rounded px-3 py-2" data-testid={`advance-item-${a.id}`}>
                    <div>
                      <span className="font-semibold text-amber-700">{fmt(parseFloat(a.amount))} MAD</span>
                      {a.note && <span className="text-gray-500 ml-2 text-xs">— {a.note}</span>}
                      <div className="text-xs text-gray-400">{fmtDate(a.createdAt)}</div>
                    </div>
                    <button
                      onClick={() => { if (confirm("Supprimer cette avance ?")) delAdvanceMutation.mutate(a.id); }}
                      className="text-red-400 hover:text-red-600 ml-2"
                      data-testid={`btn-del-advance-${a.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Payments history */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5 text-emerald-500" />
            Paiements du mois
          </h4>
          {payLoading ? <div className="text-center py-3"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
            : payments.length === 0 ? <p className="text-xs text-gray-400 py-2">Aucun paiement ce mois</p>
            : (
              <div className="space-y-1.5">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm bg-emerald-50 rounded px-3 py-2" data-testid={`payment-item-${p.id}`}>
                    <div>
                      <span className="font-semibold text-emerald-700">{fmt(parseFloat(p.amount))} MAD</span>
                      <span className="text-gray-500 ml-2 text-xs">{p.paymentMethod}</span>
                      {p.note && <span className="text-gray-500 ml-2 text-xs">— {p.note}</span>}
                      <div className="text-xs text-gray-400">{fmtDate(p.createdAt)}</div>
                    </div>
                    <button
                      onClick={() => { if (confirm("Supprimer ce paiement ?")) delPaymentMutation.mutate(p.id); }}
                      className="text-red-400 hover:text-red-600 ml-2"
                      data-testid={`btn-del-payment-${p.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {row.employee.notes && (
          <div className="bg-gray-50 rounded p-3 text-xs text-gray-500">
            <span className="font-medium">Notes: </span>{row.employee.notes}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AdminSalaries() {
  const { lang } = useAdminLang();
  const { toast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [advanceFor, setAdvanceFor] = useState<PayrollRow | null>(null);
  const [payFor, setPayFor] = useState<PayrollRow | null>(null);
  const [detailFor, setDetailFor] = useState<PayrollRow | null>(null);

  const { data, isLoading } = useQuery<PayrollData>({
    queryKey: ["/api/payroll/summary", month, year],
    queryFn: () => fetch(`/api/payroll/summary?month=${month}&year=${year}`, { credentials: "include" }).then(r => r.json()),
  });

  const rows = data?.rows ?? [];
  const summary = data?.summary;
  const months = lang === "ar" ? MONTHS_AR : MONTHS_FR;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Salaires</h1>
              <p className="text-xs text-gray-500">{summary?.activeCount ?? 0} employé(s) actif(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Month + Year filter */}
            <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
              <SelectTrigger className="w-32 h-8 text-sm" data-testid="select-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
              <SelectTrigger className="w-24 h-8 text-sm" data-testid="select-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowAddEmployee(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-8 text-sm"
              data-testid="btn-add-employee"
            >
              <Plus className="w-4 h-4" />
              Ajouter employé
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-blue-500">Masse salariale</span>
              </div>
              <p className="text-xl font-bold text-blue-700" data-testid="stat-total-payroll">
                {summary ? fmt(summary.totalPayroll) : "—"} <span className="text-sm font-normal">MAD</span>
              </p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-100">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-500">Payé ce mois</span>
              </div>
              <p className="text-xl font-bold text-emerald-700" data-testid="stat-total-paid">
                {summary ? fmt(summary.totalPaid) : "—"} <span className="text-sm font-normal">MAD</span>
              </p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-100">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-500">Avances</span>
              </div>
              <p className="text-xl font-bold text-amber-700" data-testid="stat-total-advances">
                {summary ? fmt(summary.totalAdvances) : "—"} <span className="text-sm font-normal">MAD</span>
              </p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-100">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-500">Restant</span>
              </div>
              <p className="text-xl font-bold text-red-700" data-testid="stat-total-remaining">
                {summary ? fmt(summary.totalRemaining) : "—"} <span className="text-sm font-normal">MAD</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun employé actif</p>
            <Button className="mt-4" variant="outline" onClick={() => setShowAddEmployee(true)}>Ajouter un employé</Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Employé</th>
                    <th className="text-right px-3 py-3 text-gray-500 font-medium text-xs">Base</th>
                    <th className="text-right px-3 py-3 text-gray-500 font-medium text-xs">Avances</th>
                    <th className="text-right px-3 py-3 text-gray-500 font-medium text-xs">Payé</th>
                    <th className="text-right px-3 py-3 text-gray-500 font-medium text-xs">Restant</th>
                    <th className="text-center px-3 py-3 text-gray-500 font-medium text-xs">Statut</th>
                    <th className="text-right px-3 py-3 text-gray-500 font-medium text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(row => {
                    const StatusIcon = STATUS_CONFIG[row.status].icon;
                    return (
                      <tr key={row.employee.id} className="hover:bg-gray-50 transition-colors" data-testid={`row-employee-${row.employee.id}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800" data-testid={`text-emp-name-${row.employee.id}`}>{row.employee.fullName}</div>
                          {row.employee.jobTitle && <div className="text-xs text-gray-400">{row.employee.jobTitle}</div>}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-gray-700">{fmt(row.baseSalary)}</td>
                        <td className="px-3 py-3 text-right text-amber-600 font-medium">{row.totalAdvances > 0 ? `- ${fmt(row.totalAdvances)}` : "—"}</td>
                        <td className="px-3 py-3 text-right text-emerald-600 font-medium">{row.totalPayments > 0 ? fmt(row.totalPayments) : "—"}</td>
                        <td className="px-3 py-3 text-right font-bold text-red-600">{fmt(row.remaining)}</td>
                        <td className="px-3 py-3 text-center">
                          <Badge className={`${STATUS_CONFIG[row.status].cls} text-xs flex items-center gap-1 justify-center w-fit mx-auto`}>
                            <StatusIcon className="w-3 h-3" />
                            {lang === "ar" ? STATUS_CONFIG[row.status].labelAr : STATUS_CONFIG[row.status].label}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                              onClick={() => setAdvanceFor(row)}
                              data-testid={`btn-advance-${row.employee.id}`}
                            >
                              <ArrowDownLeft className="w-3 h-3 mr-1" />
                              Avance
                            </Button>
                            {row.remaining > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => setPayFor(row)}
                                data-testid={`btn-pay-${row.employee.id}`}
                              >
                                <Banknote className="w-3 h-3 mr-1" />
                                Payer
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-gray-500 hover:text-blue-600"
                              onClick={() => setDetailFor(row)}
                              data-testid={`btn-detail-${row.employee.id}`}
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-gray-400 hover:text-gray-700"
                              onClick={() => setEditEmployee(row.employee)}
                              data-testid={`btn-edit-emp-${row.employee.id}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
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
      </div>

      {/* Modals */}
      <EmployeeModal open={showAddEmployee} onClose={() => setShowAddEmployee(false)} />
      {editEmployee && (
        <EmployeeModal open={!!editEmployee} onClose={() => setEditEmployee(null)} initial={editEmployee} />
      )}
      {advanceFor && (
        <AdvanceModal open={!!advanceFor} onClose={() => setAdvanceFor(null)}
          employee={advanceFor.employee} month={month} year={year} />
      )}
      {payFor && (
        <PaymentModal open={!!payFor} onClose={() => setPayFor(null)}
          employee={payFor.employee} month={month} year={year} remaining={payFor.remaining} />
      )}
      {detailFor && (
        <DetailModal open={!!detailFor} onClose={() => setDetailFor(null)}
          row={detailFor} month={month} year={year} lang={lang} />
      )}
    </AdminLayout>
  );
}
