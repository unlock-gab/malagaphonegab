import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Plus, Trash2, Edit2, X, Eye, EyeOff, Loader2, CheckCircle, UserCheck, PackageCheck, Clock, Truck, XCircle, Package } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";

type ConfirmateurStats = { total: number; pending: number; processing: number; shipped: number; delivered: number; cancelled: number };
type Confirmateur = { id: string; username: string; name: string; role: string; createdAt: string; stats: ConfirmateurStats };

export default function AdminConfirmateurs() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);

  const { data: confirmateurs = [], isLoading } = useQuery<Confirmateur[]>({ queryKey: ["/api/confirmateurs"] });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/confirmateurs", data);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/confirmateurs"] });
      toast({ title: "تم إنشاء الحساب" });
      setShowForm(false);
      setForm({ name: "", username: "", password: "" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof form> }) => {
      const res = await apiRequest("PATCH", `/api/confirmateurs/${id}`, data);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/confirmateurs"] });
      toast({ title: "تم التحديث" });
      setEditingId(null);
      setForm({ name: "", username: "", password: "" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/confirmateurs/${id}`, undefined);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/confirmateurs"] }); toast({ title: "تم الحذف" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const updates: any = { name: form.name };
      if (form.password) updates.password = form.password;
      updateMutation.mutate({ id: editingId, data: updates });
    } else {
      createMutation.mutate(form);
    }
  };

  const startEdit = (c: Confirmateur) => {
    setEditingId(c.id); setShowForm(true);
    setForm({ name: c.name, username: c.username, password: "" });
  };

  const cancelForm = () => { setShowForm(false); setEditingId(null); setForm({ name: "", username: "", password: "" }); };

  const totalOrders = confirmateurs.reduce((s, c) => s + (c.stats?.total ?? 0), 0);
  const totalDelivered = confirmateurs.reduce((s, c) => s + (c.stats?.delivered ?? 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">المؤكدون</h1>
            <p className="text-gray-500 text-xs mt-0.5">{confirmateurs.length} مؤكد · {totalOrders} طلب موزّع · {totalDelivered} مسلّم</p>
          </div>
          <Button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "", username: "", password: "" }); }}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
            data-testid="button-add-confirmateur"
          >
            <Plus className="w-4 h-4" />
            إضافة مؤكد
          </Button>
        </div>

        {showForm && (
          <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-800 font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                {editingId ? "تعديل المؤكد" : "إضافة مؤكد جديد"}
              </h3>
              <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-500 text-xs font-semibold mb-1.5">الاسم الكامل</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="محمد الأمين"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 text-sm"
                    data-testid="input-confirmateur-name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-500 text-xs font-semibold mb-1.5">اسم المستخدم</label>
                  <input
                    value={form.username}
                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    placeholder="mohammed123"
                    disabled={!!editingId}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 text-sm disabled:bg-gray-50 disabled:opacity-60"
                    data-testid="input-confirmateur-username"
                    required={!editingId}
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold mb-1.5">
                  {editingId ? "كلمة المرور الجديدة (اتركها فارغة إذا لم تريد تغييرها)" : "كلمة المرور"}
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder={editingId ? "اتركها فارغة لعدم التغيير" : "كلمة مرور قوية"}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 pl-10 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 text-sm"
                    data-testid="input-confirmateur-password"
                    required={!editingId}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={cancelForm} className="px-4 py-2.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl text-sm transition-colors hover:bg-gray-50">
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm disabled:opacity-60 shadow-sm"
                  data-testid="button-save-confirmateur"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />جاري الحفظ...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" />{editingId ? "تحديث" : "إنشاء الحساب"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                <div className="h-5 bg-gray-100 rounded w-1/3 mb-3" />
                <div className="flex gap-2">{Array.from({ length: 5 }).map((_, j) => <div key={j} className="h-14 w-16 bg-gray-100 rounded-xl" />)}</div>
              </div>
            ))
          ) : confirmateurs.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
              <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-gray-500 font-semibold mb-1">لا يوجد مؤكدون بعد</p>
              <p className="text-gray-400 text-sm">أضف مؤكدين لتوزيع الطلبات عليهم</p>
            </div>
          ) : (
            confirmateurs.map(c => {
              const s = c.stats ?? { total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
              const deliveryRate = s.total > 0 ? Math.round((s.delivered / s.total) * 100) : 0;
              const confirmRate = s.total > 0 ? Math.round(((s.processing + s.shipped + s.delivered) / s.total) * 100) : 0;
              const retourRate = s.total > 0 ? Math.round((s.cancelled / s.total) * 100) : 0;
              return (
                <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all" data-testid={`row-confirmateur-${c.id}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md">
                          {c.name.charAt(0)}
                        </div>
                        {s.total > 0 && (
                          <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-white border border-blue-200 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-blue-600 text-[9px] font-black">{deliveryRate}%</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-800 font-bold">{c.name}</p>
                        <p className="text-gray-400 text-sm">@{c.username}</p>
                        <p className="text-gray-400 text-xs mt-0.5">أنشئ: {new Date(c.createdAt).toLocaleDateString("ar-DZ")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startEdit(c)}
                        className="p-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-gray-400 hover:text-blue-600 rounded-xl transition-all"
                        data-testid={`button-edit-confirmateur-${c.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(c.id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 text-gray-400 hover:text-red-500 rounded-xl transition-all disabled:opacity-50"
                        data-testid={`button-delete-confirmateur-${c.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap" data-testid={`stats-confirmateur-${c.id}`}>
                    {[
                      { icon: Package, value: s.total, label: "إجمالي", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", icon_cls: "text-gray-400" },
                      { icon: Clock, value: s.pending, label: "معلق", bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700", icon_cls: "text-amber-500" },
                      { icon: PackageCheck, value: s.processing, label: "قيد التأكيد", bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700", icon_cls: "text-blue-500" },
                      { icon: Truck, value: s.shipped, label: "مشحون", bg: "bg-purple-50", border: "border-purple-100", text: "text-purple-700", icon_cls: "text-purple-500" },
                      { icon: CheckCircle, value: s.delivered, label: "مسلّم", bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", icon_cls: "text-emerald-500" },
                      { icon: XCircle, value: s.cancelled, label: "ملغي", bg: "bg-red-50", border: "border-red-100", text: "text-red-600", icon_cls: "text-red-400" },
                    ].map(({ icon: Icon, value, label, bg, border, text, icon_cls }) => (
                      <div key={label} className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl ${bg} border ${border} min-w-[60px]`}>
                        <Icon className={`w-3.5 h-3.5 ${icon_cls}`} />
                        <span className={`text-base font-black leading-none ${text}`}>{value}</span>
                        <span className={`text-[10px] ${text} opacity-70 leading-none`}>{label}</span>
                      </div>
                    ))}

                    {s.total > 0 && (
                      <div className="mr-auto flex flex-col gap-2 min-w-[140px]">
                        {[
                          { label: "نسبة التأكيد", rate: confirmRate, color: "from-blue-500 to-indigo-400", text: "text-blue-700" },
                          { label: "نسبة التسليم", rate: deliveryRate, color: "from-emerald-500 to-teal-400", text: "text-emerald-700" },
                          { label: "نسبة الـ Retour", rate: retourRate, color: "from-red-500 to-rose-400", text: "text-red-600" },
                        ].map(({ label, rate, color, text }) => (
                          <div key={label} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-400 w-20 text-right">{label}</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                              <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all`} style={{ width: `${rate}%` }} />
                            </div>
                            <span className={`${text} text-[11px] font-bold w-8`}>{rate}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
