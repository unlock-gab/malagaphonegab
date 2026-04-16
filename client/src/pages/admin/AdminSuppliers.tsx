import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Building2, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import type { Supplier } from "@shared/schema";

function SupplierForm({ initial, onSave, onCancel, loading }: {
  initial?: Partial<Supplier>; onSave: (d: any) => void; onCancel: () => void; loading: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "", phone: initial?.phone ?? "", email: initial?.email ?? "",
    address: initial?.address ?? "", notes: initial?.notes ?? "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-1.5">
        <Label className="text-gray-600 text-sm font-semibold">اسم المورد *</Label>
        <Input value={form.name} onChange={e => set("name", e.target.value)}
          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" placeholder="اسم المورد" data-testid="input-supplier-name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">الهاتف</Label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)}
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" placeholder="05xxxxxxxx" data-testid="input-supplier-phone" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">البريد الإلكتروني</Label>
          <Input value={form.email} onChange={e => set("email", e.target.value)}
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" placeholder="email@example.com" data-testid="input-supplier-email" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-gray-600 text-sm font-semibold">العنوان</Label>
        <Input value={form.address} onChange={e => set("address", e.target.value)}
          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" data-testid="input-supplier-address" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-gray-600 text-sm font-semibold">ملاحظات</Label>
        <Textarea value={form.notes} onChange={e => set("notes", e.target.value)}
          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none" rows={2} data-testid="input-supplier-notes" />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} className="border-gray-200 text-gray-600 hover:bg-gray-50">إلغاء</Button>
        <Button onClick={() => onSave(form)} disabled={loading || !form.name}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" data-testid="button-save-supplier">
          {loading ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminSuppliers() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/suppliers", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] }); setOpen(false); toast({ title: "تم إضافة المورد" }); },
    onError: () => toast({ title: "فشل", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/suppliers/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] }); setOpen(false); setEditing(null); toast({ title: "تم التحديث" }); },
    onError: () => toast({ title: "فشل", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/suppliers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] }); toast({ title: "تم الحذف" }); },
    onError: () => toast({ title: "فشل الحذف", variant: "destructive" }),
  });

  const handleSave = (data: any) => editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">الموردون</h1>
            <p className="text-gray-500 text-xs mt-0.5">{suppliers.length} مورد</p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm" data-testid="button-add-supplier">
            <Plus className="w-4 h-4" /> مورد جديد
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold">لا يوجد موردون بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suppliers.map(sup => (
              <div key={sup.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all" data-testid={`card-supplier-${sup.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-gray-800 font-bold">{sup.name}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {sup.phone && <span className="flex items-center gap-1 text-gray-500 text-xs"><Phone className="w-3 h-3" />{sup.phone}</span>}
                        {sup.email && <span className="flex items-center gap-1 text-gray-500 text-xs"><Mail className="w-3 h-3" />{sup.email}</span>}
                        {sup.address && <span className="flex items-center gap-1 text-gray-500 text-xs"><MapPin className="w-3 h-3" />{sup.address}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(sup); setOpen(true); }}
                      className="border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 text-xs" data-testid={`button-edit-supplier-${sup.id}`}>
                      <Pencil className="w-3 h-3 ml-1" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { if (confirm("حذف المورد؟")) deleteMutation.mutate(sup.id); }}
                      className="border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 text-xs" disabled={deleteMutation.isPending} data-testid={`button-delete-supplier-${sup.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {sup.notes && <p className="text-gray-500 text-xs mt-2 mr-12">{sup.notes}</p>}
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg shadow-xl" dir="rtl">
            <DialogHeader className="border-b border-gray-100 pb-3">
              <DialogTitle className="text-gray-900 font-bold">{editing ? "تعديل المورد" : "مورد جديد"}</DialogTitle>
            </DialogHeader>
            <div className="pt-1">
              <SupplierForm initial={editing ?? undefined} onSave={handleSave} onCancel={() => { setOpen(false); setEditing(null); }} loading={isMutating} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
