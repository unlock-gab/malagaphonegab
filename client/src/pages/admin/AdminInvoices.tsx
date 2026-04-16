import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  FileText, Plus, Edit3, Trash2, CheckCircle, Circle,
  Star, Save, X, Eye, ChevronRight, Building2, Phone, MapPin,
  AlignLeft, BookOpen, Shield, Printer, Settings2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAdminLang } from "@/context/AdminLangContext";
import AdminLayout from "./AdminLayout";
import type { Category, InvoiceTemplate } from "@shared/schema";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("fr-DZ").format(Math.round(v)) + " DA";
}

const EMPTY_TPL = {
  categoryId: null as string | null,
  categoryName: "Défaut",
  companyName: "MALAGA PHONE",
  companyPhone: "",
  companyAddress: "الجزائر",
  headerText: "Vente & Échange de Smart-Phones",
  footerText: "شكراً لتعاملكم مع MALAGA PHONE — الجزائر",
  warrantyText: "",
  termsText: "",
  showLogo: true,
  isDefault: false,
};

// ─── Invoice Preview Component ────────────────────────────────────────────────
function InvoicePreview({ tpl }: { tpl: typeof EMPTY_TPL }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 font-sans text-sm" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-800">
        <div>
          {tpl.showLogo && (
            <div className="h-10 w-40 rounded-lg overflow-hidden border border-gray-200 bg-white mb-1">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          <p className="font-black text-gray-900 text-base">{tpl.companyName}</p>
          {tpl.headerText && <p className="text-gray-500 text-xs">{tpl.headerText}</p>}
          {tpl.companyAddress && <p className="text-gray-400 text-xs">{tpl.companyAddress}</p>}
          {tpl.companyPhone && <p className="text-gray-400 text-xs">{tpl.companyPhone}</p>}
        </div>
        <div className="text-left">
          <div className="inline-block bg-gray-900 text-white px-3 py-1 rounded-lg mb-1">
            <span className="text-xs font-bold">فاتورة</span>
          </div>
          <p className="text-gray-800 font-black text-lg">#ABC123</p>
          <p className="text-gray-500 text-xs">16 Avril 2026</p>
        </div>
      </div>

      {/* Customer */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-400 text-xs font-semibold uppercase mb-1">معلومات الزبون</p>
          <p className="text-gray-800 font-bold text-sm">أحمد بن علي</p>
          <p className="text-gray-500 text-xs">0555 123 456</p>
          <p className="text-gray-500 text-xs">الجزائر العاصمة</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-400 text-xs font-semibold uppercase mb-1">تفاصيل الطلب</p>
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">الحالة:</span><span className="font-semibold text-gray-800">مدفوع</span></div>
            <div className="flex justify-between"><span className="text-gray-500">الدفع:</span><span className="font-semibold text-gray-800">COD</span></div>
            <div className="flex justify-between"><span className="text-gray-500">التوصيل:</span><span className="font-semibold text-gray-800">للمنزل</span></div>
          </div>
        </div>
      </div>

      {/* Items */}
      <table className="w-full mb-4 text-xs">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="text-right px-3 py-2 rounded-tr-lg">المنتج</th>
            <th className="text-center px-3 py-2">الكمية</th>
            <th className="text-center px-3 py-2">السعر</th>
            <th className="text-left px-3 py-2 rounded-tl-lg">المجموع</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="px-3 py-2 text-gray-800 font-medium">Samsung Galaxy A55 5G</td>
            <td className="px-3 py-2 text-center text-gray-600">1</td>
            <td className="px-3 py-2 text-center text-gray-600">{formatCurrency(95000)}</td>
            <td className="px-3 py-2 text-left text-gray-800 font-semibold">{formatCurrency(95000)}</td>
          </tr>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <td className="px-3 py-2 text-gray-800 font-medium">Coque de protection</td>
            <td className="px-3 py-2 text-center text-gray-600">2</td>
            <td className="px-3 py-2 text-center text-gray-600">{formatCurrency(800)}</td>
            <td className="px-3 py-2 text-left text-gray-800 font-semibold">{formatCurrency(1600)}</td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-4">
        <div className="w-52">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">المجموع الفرعي:</span>
            <span className="text-gray-800 font-semibold">{formatCurrency(96600)}</span>
          </div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">التوصيل:</span>
            <span className="text-gray-800 font-semibold">{formatCurrency(400)}</span>
          </div>
          <div className="border-t-2 border-gray-800 pt-1.5 flex justify-between">
            <span className="text-gray-900 font-black text-sm">الإجمالي:</span>
            <span className="text-gray-900 font-black text-sm">{formatCurrency(97000)}</span>
          </div>
        </div>
      </div>

      {/* Warranty / Terms */}
      {tpl.warrantyText && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
          <p className="text-blue-700 text-xs font-semibold mb-0.5">الضمان</p>
          <p className="text-blue-800 text-xs">{tpl.warrantyText}</p>
        </div>
      )}
      {tpl.termsText && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-3">
          <p className="text-amber-700 text-xs font-semibold mb-0.5">الشروط والأحكام</p>
          <p className="text-amber-800 text-xs">{tpl.termsText}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 pt-3 text-center">
        <p className="text-gray-400 text-xs">{tpl.footerText}</p>
        <p className="text-gray-300 text-xs mt-0.5">هذه الفاتورة صادرة إلكترونياً وصالحة بدون توقيع</p>
      </div>
    </div>
  );
}

// ─── Edit Panel ───────────────────────────────────────────────────────────────
function EditPanel({
  tpl, category, onClose, onSave, isSaving,
}: {
  tpl: InvoiceTemplate | null;
  category: Category | null;
  onClose: () => void;
  onSave: (data: typeof EMPTY_TPL, id?: string) => void;
  isSaving: boolean;
}) {
  const { t } = useAdminLang();
  const [form, setForm] = useState<typeof EMPTY_TPL>(tpl ? {
    categoryId: tpl.categoryId ?? null,
    categoryName: tpl.categoryName,
    companyName: tpl.companyName,
    companyPhone: tpl.companyPhone,
    companyAddress: tpl.companyAddress,
    headerText: tpl.headerText,
    footerText: tpl.footerText,
    warrantyText: tpl.warrantyText,
    termsText: tpl.termsText,
    showLogo: tpl.showLogo,
    isDefault: tpl.isDefault,
  } : {
    ...EMPTY_TPL,
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? "Défaut",
    isDefault: !category,
  });

  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const set = (k: keyof typeof EMPTY_TPL, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">
                {tpl ? t("edit") : t("add")} — {form.categoryName}
              </p>
              <p className="text-gray-400 text-xs">Template de facture</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setTab("edit")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === "edit" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Settings2 className="w-3.5 h-3.5 inline mr-1" /> {t("edit")}
              </button>
              <button
                onClick={() => setTab("preview")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === "preview" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Eye className="w-3.5 h-3.5 inline mr-1" /> Aperçu
              </button>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "preview" ? (
            <InvoicePreview tpl={form} />
          ) : (
            <div className="space-y-5">
              {/* Company Info */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-bold text-gray-800">Informations société</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Nom société</label>
                    <input
                      value={form.companyName}
                      onChange={e => set("companyName", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                      placeholder="MALAGA PHONE"
                      data-testid="input-company-name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        value={form.companyPhone}
                        onChange={e => set("companyPhone", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                        placeholder="0550 000 000"
                        data-testid="input-company-phone"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Adresse</label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <input
                      value={form.companyAddress}
                      onChange={e => set("companyAddress", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                      placeholder="الجزائر"
                      data-testid="input-company-address"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => set("showLogo", !form.showLogo)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${form.showLogo ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                    data-testid="btn-toggle-logo"
                  >
                    {form.showLogo ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    Afficher le logo
                  </button>
                  {!category && (
                    <button
                      type="button"
                      onClick={() => set("isDefault", !form.isDefault)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${form.isDefault ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                      data-testid="btn-toggle-default"
                    >
                      <Star className={`w-4 h-4 ${form.isDefault ? "fill-amber-400 text-amber-400" : ""}`} />
                      Template par défaut
                    </button>
                  )}
                </div>
              </section>

              {/* Header / Sous-titre */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <AlignLeft className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-bold text-gray-800">En-tête</span>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Sous-titre société (sous le nom)</label>
                  <input
                    value={form.headerText}
                    onChange={e => set("headerText", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                    placeholder="Vente & Échange de Smart-Phones"
                    data-testid="input-header-text"
                  />
                </div>
              </section>

              {/* Warranty */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-bold text-gray-800">Conditions de garantie</span>
                </div>
                <textarea
                  value={form.warrantyText}
                  onChange={e => set("warrantyText", e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none"
                  placeholder="مثال: الضمان لمدة 6 أشهر على عيوب التصنيع فقط..."
                  data-testid="input-warranty-text"
                />
              </section>

              {/* Terms */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-bold text-gray-800">Conditions générales</span>
                </div>
                <textarea
                  value={form.termsText}
                  onChange={e => set("termsText", e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none"
                  placeholder="مثال: لا يُقبل الإرجاع بعد 48 ساعة من الاستلام..."
                  data-testid="input-terms-text"
                />
              </section>

              {/* Footer */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <AlignLeft className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-gray-800">Pied de page</span>
                </div>
                <input
                  value={form.footerText}
                  onChange={e => set("footerText", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  placeholder="شكراً لتعاملكم مع MALAGA PHONE"
                  data-testid="input-footer-text"
                />
              </section>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-100 transition-all">
            {t("cancel")}
          </button>
          <Button
            onClick={() => onSave(form, tpl?.id)}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="btn-save-template"
          >
            <Save className="w-4 h-4" />
            {isSaving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Category Card ─────────────────────────────────────────────────────────────
function CategoryCard({
  category, template, onEdit,
}: {
  category: Category | null;
  template: InvoiceTemplate | undefined;
  onEdit: () => void;
}) {
  const { t } = useAdminLang();
  const isConfigured = !!template;

  return (
    <div className={`bg-white rounded-xl border transition-all hover:shadow-md cursor-pointer group ${isConfigured ? "border-gray-200" : "border-dashed border-gray-200"}`} onClick={onEdit}>
      <div className="p-4 flex items-center gap-4">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: category ? `${category.color}18` : "#f3f4f6" }}
        >
          {isConfigured ? (
            <FileText className="w-5 h-5" style={{ color: category?.color || "#6b7280" }} />
          ) : (
            <Plus className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900 text-sm truncate">
              {category ? category.name : "Template par défaut"}
            </p>
            {!category && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 text-xs rounded-md font-medium">
                <Star className="w-3 h-3 fill-amber-400" /> Défaut
              </span>
            )}
          </div>
          {isConfigured ? (
            <p className="text-emerald-600 text-xs mt-0.5 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Template configuré
            </p>
          ) : (
            <p className="text-gray-400 text-xs mt-0.5">Aucun template — cliquez pour créer</p>
          )}
        </div>

        {/* Status + Action */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isConfigured && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs rounded-lg font-medium">
              <CheckCircle className="w-3 h-3" /> Actif
            </span>
          )}
          <div className="w-7 h-7 rounded-lg bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition-all">
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-all" />
          </div>
        </div>
      </div>

      {/* Template preview strip */}
      {isConfigured && template && (
        <div className="px-4 pb-3">
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500 border border-gray-100">
            <span className="font-medium text-gray-700">{template.companyName}</span>
            {template.companyPhone && <span className="mx-2 text-gray-300">·</span>}
            {template.companyPhone && <span>{template.companyPhone}</span>}
            {template.warrantyText && (
              <span className="ml-2 text-blue-500 truncate inline-block max-w-48">· {template.warrantyText.slice(0, 40)}{template.warrantyText.length > 40 ? "..." : ""}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminInvoices() {
  const { t, dir } = useAdminLang();
  const { toast } = useToast();

  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: templates = [], isLoading } = useQuery<InvoiceTemplate[]>({ queryKey: ["/api/invoice-templates"] });

  const [editing, setEditing] = useState<{ category: Category | null; template: InvoiceTemplate | null } | null>(null);

  // Map templates by categoryId
  const tplByCat = new Map(templates.map(t => [t.categoryId ?? "__default__", t]));
  const defaultTemplate = templates.find(t => t.isDefault) ?? tplByCat.get("__default__");

  const saveMutation = useMutation({
    mutationFn: async ({ data, id }: { data: typeof EMPTY_TPL; id?: string }) => {
      if (id) {
        return apiRequest("PATCH", `/api/invoice-templates/${id}`, data);
      }
      return apiRequest("POST", `/api/invoice-templates`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-templates"] });
      toast({ title: t("success"), description: "Template de facture enregistré." });
      setEditing(null);
    },
    onError: () => toast({ title: t("error"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/invoice-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-templates"] });
      toast({ title: t("success"), description: "Template supprimé." });
    },
    onError: () => toast({ title: t("error"), variant: "destructive" }),
  });

  const handleDelete = (e: React.MouseEvent, tpl: InvoiceTemplate) => {
    e.stopPropagation();
    if (confirm(t("confirm_delete"))) deleteMutation.mutate(tpl.id);
  };

  const handleSave = (data: typeof EMPTY_TPL, id?: string) => {
    saveMutation.mutate({ data, id });
  };

  const activeCategories = categories.filter(c => c.active);

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto" dir={dir}>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Factures</h1>
              <p className="text-gray-500 text-sm">Templates de facturation par catégorie</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <FileText className="w-4 h-4 text-blue-500" />
            {templates.length} template{templates.length !== 1 ? "s" : ""} configuré{templates.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Printer className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-blue-900 font-semibold text-sm mb-1">Comment ça fonctionne ?</p>
              <p className="text-blue-700 text-xs leading-relaxed">
                Chaque catégorie peut avoir son propre template de facture (nom, téléphone, garantie, conditions...).
                Si une catégorie n'a pas de template configuré, le <strong>template par défaut</strong> est utilisé automatiquement.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Chargement des templates...</div>
        ) : (
          <div className="space-y-4">
            {/* Default Template Section */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Template par défaut</p>
              <div className="relative">
                <CategoryCard
                  category={null}
                  template={defaultTemplate}
                  onEdit={() => setEditing({ category: null, template: defaultTemplate ?? null })}
                />
                {defaultTemplate && (
                  <button
                    onClick={e => handleDelete(e, defaultTemplate)}
                    className="absolute top-4 right-14 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all z-10"
                    data-testid="btn-delete-default-template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Templates */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1 mt-6">
                Catégories ({activeCategories.length})
              </p>
              <div className="space-y-2">
                {activeCategories.map(cat => {
                  const catTpl = tplByCat.get(cat.id);
                  return (
                    <div key={cat.id} className="relative">
                      <CategoryCard
                        category={cat}
                        template={catTpl}
                        onEdit={() => setEditing({ category: cat, template: catTpl ?? null })}
                      />
                      {catTpl && (
                        <button
                          onClick={e => handleDelete(e, catTpl)}
                          className="absolute top-4 right-14 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all z-10"
                          data-testid={`btn-delete-template-${cat.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Panel */}
      {editing !== null && (
        <EditPanel
          tpl={editing.template}
          category={editing.category}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          isSaving={saveMutation.isPending}
        />
      )}
    </AdminLayout>
  );
}
