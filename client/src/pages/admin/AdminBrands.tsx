import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import type { Brand } from "@shared/schema";

function BrandForm({ initial, onSave, onCancel, loading }: {
  initial?: Partial<Brand>; onSave: (d: any) => void; onCancel: () => void; loading: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    logo: initial?.logo ?? "",
    active: initial?.active ?? true,
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">اسم الماركة *</Label>
          <Input value={form.name} onChange={e => { set("name", e.target.value); if (!initial?.id) set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")); }}
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" placeholder="Apple" data-testid="input-brand-name" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">الرابط (Slug) *</Label>
          <Input value={form.slug} onChange={e => set("slug", e.target.value)}
            className="bg-white border-gray-200 text-gray-900 font-mono text-sm placeholder:text-gray-400" placeholder="apple" data-testid="input-brand-slug" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-gray-600 text-sm font-semibold">رابط الشعار (اختياري)</Label>
        <Input value={form.logo} onChange={e => set("logo", e.target.value)}
          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" placeholder="https://..." data-testid="input-brand-logo" />
        {form.logo && <img src={form.logo} alt="logo preview" className="h-10 w-auto object-contain mt-2 rounded bg-gray-50 border border-gray-100 p-1" />}
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.active} onCheckedChange={v => set("active", v)} data-testid="switch-brand-active" />
        <Label className="text-gray-700 text-sm">ماركة نشطة</Label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} className="border-gray-200 text-gray-600 hover:bg-gray-50">إلغاء</Button>
        <Button onClick={() => onSave(form)} disabled={loading || !form.name || !form.slug}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" data-testid="button-save-brand">
          {loading ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminBrands() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);

  const { data: brands = [], isLoading } = useQuery<Brand[]>({ queryKey: ["/api/brands"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/brands", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/brands"] }); setOpen(false); toast({ title: "تم إنشاء الماركة" }); },
    onError: () => toast({ title: "فشل", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/brands/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/brands"] }); setOpen(false); setEditing(null); toast({ title: "تم التحديث" }); },
    onError: () => toast({ title: "فشل التحديث", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/brands/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/brands"] }); toast({ title: "تم الحذف" }); },
    onError: () => toast({ title: "فشل الحذف", variant: "destructive" }),
  });

  const handleSave = (data: any) => editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">الماركات</h1>
            <p className="text-gray-500 text-xs mt-0.5">{brands.length} ماركة</p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm" data-testid="button-add-brand">
            <Plus className="w-4 h-4" /> ماركة جديدة
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Star className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold">لا توجد ماركات</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {brands.map(brand => (
              <div key={brand.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all text-center" data-testid={`card-brand-${brand.id}`}>
                {brand.logo ? (
                  <img src={brand.logo} alt={brand.name} className="w-12 h-12 object-contain mx-auto mb-2 rounded-lg bg-gray-50 border border-gray-100 p-1" />
                ) : (
                  <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-700 font-black text-lg">{brand.name.charAt(0)}</span>
                  </div>
                )}
                <p className="text-gray-800 font-bold text-sm">{brand.name}</p>
                <p className="text-gray-400 text-xs font-mono mb-2">{brand.slug}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${brand.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                  {brand.active ? "نشط" : "معطل"}
                </span>
                <div className="flex gap-1.5 mt-3">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(brand); setOpen(true); }}
                    className="flex-1 border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 text-xs" data-testid={`button-edit-brand-${brand.id}`}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm("حذف الماركة؟")) deleteMutation.mutate(brand.id); }}
                    className="border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 text-xs" disabled={deleteMutation.isPending} data-testid={`button-delete-brand-${brand.id}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md shadow-xl" dir="rtl">
            <DialogHeader className="border-b border-gray-100 pb-3">
              <DialogTitle className="text-gray-900 font-bold">{editing ? "تعديل الماركة" : "ماركة جديدة"}</DialogTitle>
            </DialogHeader>
            <div className="pt-1">
              <BrandForm initial={editing ?? undefined} onSave={handleSave} onCancel={() => { setOpen(false); setEditing(null); }} loading={isMutating} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
