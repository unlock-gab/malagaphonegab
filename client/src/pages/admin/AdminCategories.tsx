import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import type { Category } from "@shared/schema";
import { useAdminLang } from "@/context/AdminLangContext";

const DEFAULT_COLORS = ["#3b82f6","#f59e0b","#8b5cf6","#10b981","#ef4444","#6366f1","#ec4899","#6b7280","#14b8a6","#f97316"];

function CategoryForm({ initial, onSave, onCancel, loading }: {
  initial?: Partial<Category>; onSave: (d: any) => void; onCancel: () => void; loading: boolean;
}) {
  const { t, dir } = useAdminLang();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    icon: initial?.icon ?? "Tag",
    color: initial?.color ?? "#3b82f6",
    description: initial?.description ?? "",
    active: initial?.active ?? true,
    sortOrder: initial?.sortOrder ?? 0,
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4" dir={dir}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">{t("category_name")}</Label>
          <Input value={form.name} onChange={e => { set("name", e.target.value); if (!initial?.id) set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")); }}
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" data-testid="input-category-name" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">{t("category_slug")}</Label>
          <Input value={form.slug} onChange={e => set("slug", e.target.value)}
            className="bg-white border-gray-200 text-gray-900 font-mono text-sm placeholder:text-gray-400" placeholder="new-phones" data-testid="input-category-slug" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">{t("category_icon")}</Label>
          <Input value={form.icon} onChange={e => set("icon", e.target.value)}
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" placeholder="Smartphone" data-testid="input-category-icon" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-sm font-semibold">{t("category_order")}</Label>
          <Input type="number" value={form.sortOrder} onChange={e => set("sortOrder", parseInt(e.target.value) || 0)}
            className="bg-white border-gray-200 text-gray-900" data-testid="input-category-sort" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-gray-600 text-sm font-semibold">{t("category_color")}</Label>
        <div className="flex gap-2 flex-wrap">
          {DEFAULT_COLORS.map(c => (
            <button key={c} onClick={() => set("color", c)}
              className={`w-7 h-7 rounded-lg border-2 transition-all ${form.color === c ? "border-gray-700 scale-110 shadow-sm" : "border-transparent hover:scale-105"}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={form.color} onChange={e => set("color", e.target.value)}
            className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 bg-white" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-gray-600 text-sm font-semibold">{t("category_description")}</Label>
        <Textarea value={form.description} onChange={e => set("description", e.target.value)}
          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none" rows={2} data-testid="input-category-desc" />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.active} onCheckedChange={v => set("active", v)} data-testid="switch-category-active" />
        <Label className="text-gray-700 text-sm">{t("active")}</Label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} className="border-gray-200 text-gray-600 hover:bg-gray-50" data-testid="button-cancel">{t("cancel")}</Button>
        <Button onClick={() => onSave(form)} disabled={loading || !form.name || !form.slug}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" data-testid="button-save-category">
          {loading ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminCategories() {
  const { toast } = useToast();
  const { t, dir } = useAdminLang();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/categories", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); setOpen(false); toast({ title: t("success") }); },
    onError: () => toast({ title: t("failed"), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/categories/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); setOpen(false); setEditing(null); toast({ title: t("success") }); },
    onError: () => toast({ title: t("failed"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); toast({ title: t("success") }); },
    onError: () => toast({ title: t("failed"), variant: "destructive" }),
  });

  const handleSave = (data: any) => editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">{t("categories_title")}</h1>
            <p className="text-gray-500 text-xs mt-0.5">{categories.length} {t("nav_categories")}</p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm" data-testid="button-add-category">
            <Plus className="w-4 h-4" /> {t("add_category")}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Tag className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold">{t("no_categories")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all" data-testid={`card-category-${cat.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
                      style={{ backgroundColor: cat.color + "18", borderColor: cat.color + "40" }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    </div>
                    <div>
                      <p className="text-gray-800 font-bold text-sm">{cat.name}</p>
                      <p className="text-gray-400 text-xs font-mono">{cat.slug}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cat.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                    {cat.active ? t("active") : t("inactive")}
                  </span>
                </div>
                {cat.description && <p className="text-gray-500 text-xs mb-3 line-clamp-2">{cat.description}</p>}
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(cat); setOpen(true); }}
                    className="flex-1 border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 text-xs" data-testid={`button-edit-category-${cat.id}`}>
                    <Pencil className="w-3 h-3 me-1" /> {t("edit")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm(t("confirm_delete"))) deleteMutation.mutate(cat.id); }}
                    className="border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 text-xs" disabled={deleteMutation.isPending} data-testid={`button-delete-category-${cat.id}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg shadow-xl" dir={dir}>
            <DialogHeader className="border-b border-gray-100 pb-3">
              <DialogTitle className="text-gray-900 font-bold">{editing ? t("edit_category") : t("add_category")}</DialogTitle>
            </DialogHeader>
            <div className="pt-1">
              <CategoryForm initial={editing ?? undefined} onSave={handleSave} onCancel={() => { setOpen(false); setEditing(null); }} loading={isMutating} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
