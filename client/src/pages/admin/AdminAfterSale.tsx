import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Shield, Plus, Search, Trash2, Loader2, MessageCircle,
  CheckCircle, Clock, AlertCircle, Edit2, X,
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
import type { AfterSaleRecord } from "@shared/schema";
import { AFTER_SALE_TYPES, AFTER_SALE_STATUSES } from "@shared/schema";

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}

function whatsapp(phone: string) {
  const cleaned = phone.replace(/\D/g, "").replace(/^0/, "213");
  return `https://wa.me/${cleaned}`;
}

function TypeBadge({ type }: { type: string }) {
  const t = AFTER_SALE_TYPES.find(x => x.key === type);
  if (!t) return <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{type}</span>;
  return (
    <span className={`inline-flex text-[10px] px-2 py-0.5 rounded border font-semibold ${t.badge}`}>{t.label}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = AFTER_SALE_STATUSES.find(x => x.key === status);
  if (!s) return <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-semibold ${s.badge}`}>
      {status === "open" ? <Clock className="w-2.5 h-2.5" /> : status === "in_progress" ? <AlertCircle className="w-2.5 h-2.5" /> : <CheckCircle className="w-2.5 h-2.5" />}
      {s.label}
    </span>
  );
}

const EMPTY_FORM = {
  type: "warranty",
  status: "open",
  orderId: "",
  customerName: "",
  customerPhone: "",
  productId: "",
  productName: "",
  description: "",
  notes: "",
};

export default function AdminAfterSale() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AfterSaleRecord | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: records = [], isLoading } = useQuery<AfterSaleRecord[]>({ queryKey: ["/api/after-sale"] });

  const createMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) => apiRequest("POST", "/api/after-sale", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/after-sale"] });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      toast({ title: "✓ تم إنشاء السجل" });
    },
    onError: () => toast({ title: "فشل الإنشاء", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/after-sale/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/after-sale"] });
      setDialogOpen(false);
      setEditRecord(null);
      toast({ title: "✓ تم التحديث" });
    },
    onError: () => toast({ title: "فشل التحديث", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/after-sale/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/after-sale"] });
      toast({ title: "تم الحذف" });
    },
    onError: () => toast({ title: "فشل الحذف", variant: "destructive" }),
  });

  const openNew = () => {
    setEditRecord(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (r: AfterSaleRecord) => {
    setEditRecord(r);
    setForm({
      type: r.type,
      status: r.status,
      orderId: r.orderId ?? "",
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      productId: r.productId ?? "",
      productName: r.productName,
      description: r.description ?? "",
      notes: r.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.productName.trim()) {
      toast({ title: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (editRecord) {
      updateMutation.mutate({ id: editRecord.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.customerName.toLowerCase().includes(q) ||
      r.customerPhone.includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q);
    const matchType = typeFilter === "all" || r.type === typeFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const openCount = records.filter(r => r.status === "open").length;
  const inProgressCount = records.filter(r => r.status === "in_progress").length;

  return (
    <AdminLayout>
      <div className="space-y-4" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">ما بعد البيع</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {openCount} مفتوح · {inProgressCount} قيد المعالجة · {records.length} إجمالي
            </p>
          </div>
          <Button onClick={openNew}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 shadow-sm"
            data-testid="button-new-after-sale">
            <Plus className="w-3.5 h-3.5 ml-1" /> سجل جديد
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم، الهاتف، المنتج..."
              className="bg-white border-gray-200 text-gray-900 pr-9 text-xs h-8 placeholder:text-gray-400"
              data-testid="input-after-sale-search" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-8 text-xs bg-white border-gray-200">
              <SelectValue placeholder="النوع" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all" className="text-xs">كل الأنواع</SelectItem>
              {AFTER_SALE_TYPES.map(t => <SelectItem key={t.key} value={t.key} className="text-xs">{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs bg-white border-gray-200">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all" className="text-xs">كل الحالات</SelectItem>
              {AFTER_SALE_STATUSES.map(s => <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs">
                    <th className="text-right p-3 font-semibold">النوع</th>
                    <th className="text-right p-3 font-semibold">الزبون</th>
                    <th className="text-right p-3 font-semibold hidden sm:table-cell">الهاتف</th>
                    <th className="text-right p-3 font-semibold">المنتج</th>
                    <th className="text-right p-3 font-semibold hidden md:table-cell">الوصف</th>
                    <th className="text-center p-3 font-semibold">الحالة</th>
                    <th className="text-right p-3 font-semibold hidden lg:table-cell">التاريخ</th>
                    <th className="text-center p-3 font-semibold w-24">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-14">
                        <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Shield className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-gray-600 font-semibold text-sm">لا توجد سجلات</p>
                        <p className="text-gray-400 text-xs mt-1">سيظهر هنا كل حالات الضمان والإرجاع والتبديل</p>
                      </td>
                    </tr>
                  ) : filtered.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors"
                      data-testid={`row-after-sale-${r.id}`}>
                      <td className="p-3"><TypeBadge type={r.type} /></td>
                      <td className="p-3">
                        <p className="text-gray-800 font-semibold text-xs">{r.customerName}</p>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <span className="text-gray-500 text-xs font-mono">{r.customerPhone}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-700 text-xs truncate max-w-32 block">{r.productName}</span>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <span className="text-gray-400 text-xs truncate max-w-40 block">{r.description ?? "—"}</span>
                      </td>
                      <td className="p-3 text-center"><StatusBadge status={r.status} /></td>
                      <td className="p-3 hidden lg:table-cell">
                        <span className="text-gray-400 text-xs">{formatDate(r.createdAt?.toString())}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 justify-center">
                          <a href={whatsapp(r.customerPhone)} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            title="واتساب" data-testid={`button-wa-asr-${r.id}`}>
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                          <button onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            data-testid={`button-edit-asr-${r.id}`}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { if (confirm("تأكيد الحذف؟")) deleteMutation.mutate(r.id); }}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            data-testid={`button-del-asr-${r.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={o => { if (!o) { setDialogOpen(false); setEditRecord(null); } }}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg max-h-[92vh] overflow-y-auto shadow-xl" dir="rtl">
            <DialogHeader className="border-b border-gray-100 pb-3">
              <DialogTitle className="text-gray-900 text-sm font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                {editRecord ? "تعديل سجل ما بعد البيع" : "سجل ما بعد البيع الجديد"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-1 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 font-semibold">النوع</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="bg-white border-gray-200 text-sm h-9" data-testid="select-asr-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {AFTER_SALE_TYPES.map(t => <SelectItem key={t.key} value={t.key} className="text-sm">{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 font-semibold">الحالة</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="bg-white border-gray-200 text-sm h-9" data-testid="select-asr-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {AFTER_SALE_STATUSES.map(s => <SelectItem key={s.key} value={s.key} className="text-sm">{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 font-semibold">اسم الزبون *</Label>
                  <Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                    placeholder="الاسم الكامل"
                    className="bg-white border-gray-200 text-gray-900 text-sm h-9 placeholder:text-gray-400"
                    data-testid="input-asr-name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 font-semibold">الهاتف *</Label>
                  <Input value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                    placeholder="0555..."
                    className="bg-white border-gray-200 text-gray-900 text-sm h-9 placeholder:text-gray-400"
                    data-testid="input-asr-phone" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-600 font-semibold">المنتج *</Label>
                <Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                  placeholder="اسم المنتج أو الجهاز"
                  className="bg-white border-gray-200 text-gray-900 text-sm h-9 placeholder:text-gray-400"
                  data-testid="input-asr-product" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-600 font-semibold">رقم الطلب المرتبط (اختياري)</Label>
                <Input value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
                  placeholder="معرّف الطلب الأصلي"
                  className="bg-white border-gray-200 text-gray-900 text-sm h-9 placeholder:text-gray-400"
                  data-testid="input-asr-order" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-600 font-semibold">وصف المشكلة / السبب</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="اشرح المشكلة أو سبب الإرجاع..."
                  className="bg-white border-gray-200 text-gray-900 text-sm resize-none placeholder:text-gray-400" rows={3}
                  data-testid="textarea-asr-desc" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-600 font-semibold">ملاحظات داخلية</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="ملاحظات للفريق الداخلي..."
                  className="bg-white border-gray-200 text-gray-900 text-sm resize-none placeholder:text-gray-400" rows={2}
                  data-testid="textarea-asr-notes" />
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm"
                  data-testid="button-submit-asr">
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                  {editRecord ? "حفظ التعديلات" : "إنشاء السجل"}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}
                  className="border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
