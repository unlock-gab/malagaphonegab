import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Wallet, Search } from "lucide-react";
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
import type { Expense } from "@shared/schema";
import { EXPENSE_TYPES } from "@shared/schema";
import { useAdminLang } from "@/context/AdminLangContext";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("ar-DZ").format(v) + " د.ج";
}

const EXPENSE_TYPE_COLORS: Record<string, string> = {
  general:   "bg-gray-100 text-gray-600 border-gray-200",
  rent:      "bg-blue-50 text-blue-700 border-blue-200",
  salary:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  shipping:  "bg-orange-50 text-orange-700 border-orange-200",
  marketing: "bg-purple-50 text-purple-700 border-purple-200",
  utilities: "bg-teal-50 text-teal-700 border-teal-200",
  other:     "bg-gray-100 text-gray-600 border-gray-200",
};

function ExpenseForm({ initial, onSave, onCancel, loading }: {
  initial?: Partial<Expense>; onSave: (d: any) => void; onCancel: () => void; loading: boolean;
}) {
  const { t, dir, lang } = useAdminLang();
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    amount: initial?.amount?.toString() ?? "",
    expenseType: initial?.expenseType ?? "general",
    notes: initial?.notes ?? "",
    expenseDate: initial?.expenseDate ? new Date(initial.expenseDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4" dir={dir}>
      <div className="space-y-1.5">
        <Label className="text-gray-600 text-sm font-semibold">{t("expense_title_field")}</Label>
        <Input value={form.title} onChange={e => set("title", e.target.value)}
          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
          placeholder={t("expense_title_field")} data-testid="input-expense-title" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">{t("expense_amount")}</Label>
          <Input type="number" value={form.amount} onChange={e => set("amount", e.target.value)}
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" placeholder="0" data-testid="input-expense-amount" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">{t("expense_type_field")}</Label>
          <Select value={form.expenseType} onValueChange={v => set("expenseType", v)}>
            <SelectTrigger className="bg-white border-gray-200 text-gray-900" data-testid="select-expense-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-lg">
              {EXPENSE_TYPES.map(et => <SelectItem key={et.key} value={et.key} className="text-gray-800">{lang === "ar" ? et.ar : et.fr}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-gray-600 text-sm font-semibold">{t("date")}</Label>
        <Input type="date" value={form.expenseDate} onChange={e => set("expenseDate", e.target.value)}
          className="bg-white border-gray-200 text-gray-900" data-testid="input-expense-date" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-gray-600 text-sm font-semibold">{t("notes")}</Label>
        <Textarea value={form.notes} onChange={e => set("notes", e.target.value)}
          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none" rows={2} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} className="border-gray-200 text-gray-600 hover:bg-gray-50">{t("cancel")}</Button>
        <Button onClick={() => onSave({ ...form, amount: parseFloat(form.amount) || 0, expenseDate: new Date(form.expenseDate) })}
          disabled={loading || !form.title || !form.amount}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" data-testid="button-save-expense">
          {loading ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminExpenses() {
  const { toast } = useToast();
  const { t, dir, lang } = useAdminLang();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [search, setSearch] = useState("");

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({ queryKey: ["/api/expenses"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }); setOpen(false); toast({ title: t("success") }); },
    onError: (e: any) => toast({ title: t("failed"), description: e?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/expenses/${id}`, data);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }); setOpen(false); setEditing(null); toast({ title: t("success") }); },
    onError: (e: any) => toast({ title: t("failed"), description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/expenses/${id}`);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }); toast({ title: t("success") }); },
    onError: (e: any) => toast({ title: t("failed"), description: e?.message, variant: "destructive" }),
  });

  const handleSave = (data: any) => editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  const isMutating = createMutation.isPending || updateMutation.isPending;

  const filtered = expenses.filter(e => e.title.toLowerCase().includes(search.toLowerCase()));
  const totalAmount = filtered.reduce((sum, e) => sum + parseFloat(e.amount as string || "0"), 0);

  const getTypeLabel = (key: string) => {
    const et = EXPENSE_TYPES.find(e => e.key === key);
    if (!et) return key;
    return lang === "ar" ? et.ar : et.fr;
  };
  const getTypeCls = (key: string) => EXPENSE_TYPE_COLORS[key] ?? EXPENSE_TYPE_COLORS.general;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">{t("expenses_title")}</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {t("expenses_total")}: <span className="text-red-600 font-semibold">{formatCurrency(totalAmount)}</span>
            </p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm" data-testid="button-add-expense">
            <Plus className="w-4 h-4" /> {t("add_expense")}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search")}
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 ps-10" data-testid="input-expense-search" />
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold">{t("no_expenses")}</p>
            <p className="text-gray-400 text-sm mt-1">{t("no_expenses_sub")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(exp => (
              <div key={exp.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all flex items-center justify-between" data-testid={`row-expense-${exp.id}`}>
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-gray-800 font-semibold text-sm">{exp.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getTypeCls(exp.expenseType)}`}>{getTypeLabel(exp.expenseType)}</span>
                      {exp.expenseDate && <span className="text-gray-400 text-xs">• {new Date(exp.expenseDate).toLocaleDateString("ar-DZ")}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-red-600 font-bold text-sm">{formatCurrency(parseFloat(exp.amount as string || "0"))}</span>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(exp); setOpen(true); }}
                      className="border-gray-200 text-gray-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 text-xs" data-testid={`button-edit-expense-${exp.id}`}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { if (confirm(t("confirm_delete"))) deleteMutation.mutate(exp.id); }}
                      className="border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 text-xs" disabled={deleteMutation.isPending} data-testid={`button-delete-expense-${exp.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md shadow-xl" dir={dir}>
            <DialogHeader className="border-b border-gray-100 pb-3">
              <DialogTitle className="text-gray-900 font-bold">{editing ? t("edit_expense") : t("add_expense")}</DialogTitle>
            </DialogHeader>
            <div className="pt-1">
              <ExpenseForm initial={editing ?? undefined} onSave={handleSave} onCancel={() => { setOpen(false); setEditing(null); }} loading={isMutating} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
