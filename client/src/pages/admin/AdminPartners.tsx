import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Handshake, Plus, Pencil, Trash2, Phone, FileText, Loader2,
  Percent, Save, X, UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import { useAdminLang } from "@/context/AdminLangContext";
import type { Partner } from "@shared/schema";

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}

interface PartnerFormState {
  name: string;
  phone: string;
  notes: string;
  defaultShare: string;
}

const EMPTY_FORM: PartnerFormState = { name: "", phone: "", notes: "", defaultShare: "50" };

function PartnerDialog({
  open, onClose, initial, editId,
}: {
  open: boolean; onClose: () => void; initial?: PartnerFormState; editId?: string | null;
}) {
  const { toast } = useToast();
  const { dir } = useAdminLang();
  const [form, setForm] = useState<PartnerFormState>(initial ?? EMPTY_FORM);
  const setF = (k: keyof PartnerFormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const isEdit = !!editId;

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? apiRequest("PATCH", `/api/partners/${editId}`, data)
        : apiRequest("POST", "/api/partners", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      toast({ title: isEdit ? "✅ تم التحديث" : "✅ تمت الإضافة", description: `الشريك "${form.name}" ${isEdit ? "تم تحديثه" : "تمت إضافته"}` });
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return toast({ title: "خطأ", description: "الاسم مطلوب", variant: "destructive" });
    const share = parseFloat(form.defaultShare);
    if (isNaN(share) || share < 0 || share > 100) return toast({ title: "خطأ", description: "النسبة يجب أن تكون بين 0 و 100", variant: "destructive" });
    saveMutation.mutate({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      defaultShare: share.toString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border-gray-200 shadow-2xl" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2 text-lg font-bold">
            <Handshake className="w-5 h-5 text-blue-600" />
            {isEdit ? "تعديل الشريك" : "إضافة شريك جديد"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-semibold text-sm">الاسم *</Label>
            <Input
              value={form.name}
              onChange={e => setF("name", e.target.value)}
              placeholder="اسم الشريك..."
              className="bg-white border-gray-200 text-gray-900 text-sm"
              data-testid="input-partner-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-gray-700 font-semibold text-sm flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> رقم الهاتف
              </Label>
              <Input
                value={form.phone}
                onChange={e => setF("phone", e.target.value)}
                placeholder="0555 000 000"
                className="bg-white border-gray-200 text-gray-900 text-sm"
                data-testid="input-partner-phone"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700 font-semibold text-sm flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-blue-600" /> النسبة الافتراضية %
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.defaultShare}
                  onChange={e => setF("defaultShare", e.target.value)}
                  className="bg-white border-gray-200 text-gray-900 text-sm pl-8"
                  data-testid="input-partner-share"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-700 font-semibold text-sm flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> ملاحظات
            </Label>
            <Textarea
              value={form.notes}
              onChange={e => setF("notes", e.target.value)}
              placeholder="معلومات إضافية عن الشريك..."
              rows={3}
              className="bg-white border-gray-200 text-gray-900 text-sm resize-none"
              data-testid="input-partner-notes"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse">
          <Button variant="outline" onClick={onClose} className="border-gray-200 text-gray-600 gap-1">
            <X className="w-4 h-4" /> إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
            data-testid="button-partner-save"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? "حفظ التعديلات" : "إضافة الشريك"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPartners() {
  const { t, dir } = useAdminLang();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Partner | null>(null);

  const { data: partners = [], isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/partners"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/partners/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      const name = deleteConfirm?.name ?? "";
      setDeleteConfirm(null);
      toast({ title: "🗑️ تم الحذف", description: `الشريك "${name}" تم حذفه` });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const openEdit = (p: Partner) => {
    setEditPartner(p);
    setDialogOpen(true);
  };
  const openAdd = () => {
    setEditPartner(null);
    setDialogOpen(true);
  };
  const closeDialog = () => {
    setDialogOpen(false);
    setEditPartner(null);
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6" dir={dir}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Handshake className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">{t("nav_partners")}</h1>
              <p className="text-sm text-gray-500">
                {partners.length} {partners.length === 1 ? "شريك" : "شركاء"}
              </p>
            </div>
          </div>
          <Button
            onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md"
            data-testid="button-add-partner"
          >
            <Plus className="w-4 h-4" />
            إضافة شريك
          </Button>
        </div>

        {/* Partners grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
              <Handshake className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <p className="text-gray-500 font-medium">لا يوجد شركاء بعد</p>
              <p className="text-gray-400 text-sm mt-1">أضف شريكاً للبدء في تتبع الحصص المشتركة</p>
            </div>
            <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 mt-2">
              <Plus className="w-4 h-4" /> إضافة أول شريك
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map(p => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 space-y-4"
                data-testid={`card-partner-${p.id}`}
              >
                {/* Partner header */}
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-200">
                    <UserRound className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base truncate">{p.name}</h3>
                    {p.phone && (
                      <a
                        href={`tel:${p.phone}`}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="w-3 h-3" />
                        {p.phone}
                      </a>
                    )}
                  </div>
                </div>

                {/* Share badge */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-blue-600 font-medium">الحصة الافتراضية</span>
                    <span className="text-lg font-black text-blue-700">{parseFloat(p.defaultShare || "50").toFixed(0)}%</span>
                  </div>
                </div>

                {/* Notes */}
                {p.notes && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 line-clamp-2">
                    {p.notes}
                  </p>
                )}

                {/* Date + actions */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                  <span className="text-xs text-gray-400">{formatDate(p.createdAt as any)}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEdit(p)}
                      className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-500 flex items-center justify-center transition-colors"
                      data-testid={`button-edit-partner-${p.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(p)}
                      className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 flex items-center justify-center transition-colors"
                      data-testid={`button-delete-partner-${p.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <PartnerDialog
          open={dialogOpen}
          onClose={closeDialog}
          editId={editPartner?.id ?? null}
          initial={
            editPartner
              ? {
                  name: editPartner.name,
                  phone: editPartner.phone ?? "",
                  notes: editPartner.notes ?? "",
                  defaultShare: parseFloat(editPartner.defaultShare || "50").toString(),
                }
              : EMPTY_FORM
          }
        />
      )}

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm bg-white border-gray-200" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              تأكيد الحذف
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 text-sm py-2">
            هل أنت متأكد من حذف الشريك <span className="font-bold text-gray-900">"{deleteConfirm?.name}"</span>؟
            <br />
            <span className="text-red-500 text-xs mt-1 block">لا يمكن التراجع عن هذا الإجراء.</span>
          </p>
          <DialogFooter className="gap-2 flex-row-reverse">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="border-gray-200 text-gray-600">
              إلغاء
            </Button>
            <Button
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white gap-1"
              data-testid="button-confirm-delete-partner"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              حذف الشريك
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
