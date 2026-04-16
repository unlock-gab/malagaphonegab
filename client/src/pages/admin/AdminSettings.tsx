import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Settings, Save, Loader2, Eye, EyeOff, CheckCircle, Code,
  ExternalLink, BarChart3, Link2, Copy, Check, AlertCircle,
  TableProperties, Store, Phone, MessageCircle, Package,
  Truck, FileText, ShoppingBag, Lock, Globe, Instagram,
  Mail, MapPin, ChevronLeft, Shield, RefreshCw,
  Upload, X, ImageIcon,
} from "lucide-react";
import { SiFacebook, SiTiktok, SiGooglesheets, SiWhatsapp } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AdminLayout from "./AdminLayout";
import { useAdminLang } from "@/context/AdminLangContext";

// ─── Types ────────────────────────────────────────────────────────────────────
type SettingsMap = Record<string, string>;

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: "general",      label: "معلومات المتجر",  icon: Store,        desc: "الاسم والعنوان والتواصل" },
  { id: "contact",      label: "التواصل",          icon: MessageCircle, desc: "واتساب والشبكات الاجتماعية" },
  { id: "orders",       label: "الطلبات",          icon: Package,       desc: "بادئات الأرقام والملاحظات" },
  { id: "delivery",     label: "التوصيل",          icon: Truck,         desc: "الأسعار والشركات الافتراضية" },
  { id: "invoice",      label: "الفاتورة",         icon: FileText,      desc: "بيانات الطباعة والتذييل" },
  { id: "pos",          label: "نقطة البيع",       icon: ShoppingBag,   desc: "الدفع والطباعة الفورية" },
  { id: "security",     label: "الأمان",           icon: Shield,        desc: "تغيير كلمة المرور" },
  { id: "integrations", label: "التكاملات",        icon: BarChart3,     desc: "بيكسل · Sheets" },
];

// ─── Keys per tab ─────────────────────────────────────────────────────────────
const TAB_KEYS: Record<string, string[]> = {
  general:      ["storeName", "storeAddress", "storePhone", "storePhone2", "storeEmail", "storeDescription", "heroBannerImage"],
  contact:      ["whatsappNumber", "whatsappDefaultMessage", "facebookUrl", "instagramUrl", "tiktokUrl"],
  orders:       ["orderPrefix", "invoicePrefix", "defaultOrderNote"],
  delivery:     ["defaultDeliveryFee", "defaultShippingCompany"],
  invoice:      ["invoiceStoreName", "invoicePhone", "invoiceAddress", "invoiceFooterNote", "invoiceShowLogo"],
  pos:          ["posDefaultPayment", "posAutoPrint"],
  integrations: ["facebookPixelId", "tiktokPixelId", "googleSheetsWebhookUrl"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 text-xs transition-all">
      {copied ? <><Check className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-700">تم النسخ</span></> : <><Copy className="w-3.5 h-3.5" />نسخ</>}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-600 block">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}

function SettingInput({ value, onChange, placeholder, type = "text", prefix, mono = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; prefix?: React.ReactNode; mono?: boolean;
}) {
  return (
    <div className="relative">
      {prefix && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{prefix}</div>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors ${prefix ? "pr-9" : ""} ${mono ? "font-mono" : ""}`} />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer group hover:border-gray-300 transition-colors">
      <span className="text-sm text-gray-700 font-medium">{label}</span>
      <div onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-300"}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-1" : "right-0.5"}`} />
      </div>
    </label>
  );
}

function SectionCard({ title, icon, children }: { title?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {title && (
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
          {icon && <div className="text-blue-600">{icon}</div>}
          <h3 className="text-gray-800 font-bold text-sm">{title}</h3>
        </div>
      )}
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function SaveBar({ onSave, isPending, saved }: { onSave: () => void; isPending: boolean; saved: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <Button onClick={onSave} disabled={isPending || saved}
        className={`gap-2 px-6 font-bold transition-all ${saved ? "bg-emerald-600 hover:bg-emerald-600" : "bg-blue-600 hover:bg-blue-700"}`}
        data-testid="button-save-settings">
        {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الحفظ...</>
          : saved ? <><CheckCircle className="w-4 h-4" />تم الحفظ!</>
          : <><Save className="w-4 h-4" />حفظ التغييرات</>}
      </Button>
    </div>
  );
}

// ─── Banner Upload Component ──────────────────────────────────────────────────
function BannerUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("فشل الرفع");
      const data = await res.json();
      onChange(data.url);
      toast({ title: "تم رفع الصورة بنجاح" });
    } catch {
      toast({ title: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img src={value} alt="banner" className="w-full max-h-52 object-contain" />
          <button
            onClick={() => onChange("")}
            className="absolute top-2 left-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition-colors"
            data-testid="button-remove-banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-2 bg-gray-50 text-gray-400">
          <ImageIcon className="w-8 h-8" />
          <p className="text-sm">لا توجد صورة بانر حالياً</p>
        </div>
      )}
      <label className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer transition-all w-full ${uploading ? "bg-gray-100 text-gray-400 cursor-wait" : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"}`}
        data-testid="button-upload-banner">
        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الرفع...</> : <><Upload className="w-4 h-4" />رفع صورة البانر</>}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminSettings() {
  const { dir } = useAdminLang();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [form, setForm] = useState<SettingsMap>({});
  const [initialized, setInitialized] = useState(false);
  const [savedTab, setSavedTab] = useState<string | null>(null);

  // Password change state
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  const { data: settings = {} } = useQuery<SettingsMap>({ queryKey: ["/api/settings"] });

  useEffect(() => {
    if (!initialized && Object.keys(settings).length > 0) {
      setForm(settings);
      setInitialized(true);
    }
  }, [settings, initialized]);

  const set = (key: string) => (v: string) => setForm(f => ({ ...f, [key]: v }));
  const val = (key: string) => form[key] ?? "";

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (tabId: string) => {
      const keys = TAB_KEYS[tabId] ?? [];
      const payload: SettingsMap = {};
      for (const k of keys) payload[k] = form[k] ?? "";
      const res = await apiRequest("PATCH", "/api/settings", payload);
      return res.json();
    },
    onSuccess: (_, tabId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setSavedTab(tabId);
      setTimeout(() => setSavedTab(null), 3000);
      toast({ title: "✓ تم الحفظ بنجاح" });
    },
    onError: () => toast({ title: "خطأ في الحفظ", variant: "destructive" }),
  });

  // ── Password change mutation ───────────────────────────────────────────────
  const pwMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/change-password", {
        currentPassword: curPw, newPassword: newPw, confirmPassword: confPw,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      setCurPw(""); setNewPw(""); setConfPw("");
      toast({ title: "✓ تم تغيير كلمة المرور بنجاح" });
    },
    onError: (e: any) => toast({ title: e.message || "فشل التغيير", variant: "destructive" }),
  });

  const appsScriptCode = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSheet();
  sheet.appendRow([
    data.id, data.customerName, data.customerPhone,
    data.wilaya, data.deliveryType, data.productName,
    data.quantity, data.total, data.status, data.createdAt
  ]);
  return ContentService.createTextOutput("OK");
}`;

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-5xl" dir={dir}>
        <div>
          <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            الإعدادات
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">إدارة جميع إعدادات متجر MALAGA PHONE</p>
        </div>

        <div className="flex gap-5 items-start">
          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <div className="w-52 flex-shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-all border-b border-gray-50 last:border-0 ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-gray-50 text-gray-500 hover:text-gray-700"
                }`}
                data-testid={`tab-${tab.id}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activeTab === tab.id ? "bg-blue-100" : "bg-gray-100"}`}>
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-blue-600" : "text-gray-400"}`} />
                </div>
                <div className="text-right min-w-0">
                  <div className="text-xs font-bold leading-tight truncate">{tab.label}</div>
                  <div className={`text-[10px] mt-0.5 truncate ${activeTab === tab.id ? "text-blue-500" : "text-gray-400"}`}>{tab.desc}</div>
                </div>
                {activeTab === tab.id && <ChevronLeft className="w-3.5 h-3.5 text-blue-400 mr-auto flex-shrink-0" />}
              </button>
            ))}
          </div>

          {/* ── Content ──────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* ═══ GENERAL ═══════════════════════════════════════════════ */}
            {activeTab === "general" && (
              <>
                <SectionCard title="معلومات المتجر الأساسية" icon={<Store className="w-4 h-4" />}>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="اسم المتجر">
                      <SettingInput value={val("storeName")} onChange={set("storeName")} placeholder="MALAGA PHONE" prefix={<Store className="w-3.5 h-3.5" />} />
                    </Field>
                    <Field label="رقم الهاتف">
                      <SettingInput value={val("storePhone")} onChange={set("storePhone")} placeholder="0555 123 456" prefix={<Phone className="w-3.5 h-3.5" />} mono />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="رقم الهاتف الأزرق (الهيدر)" hint="يظهر في أعلى الموقع بلون أزرق">
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-300" />
                        <input type="tel" value={val("storePhone")} onChange={e => set("storePhone")(e.target.value)} placeholder="0555 000 001"
                          className="w-full bg-gray-50 border border-blue-200 text-gray-900 placeholder:text-gray-400 pr-9 px-3 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors" />
                      </div>
                    </Field>
                    <Field label="رقم الهاتف الأصفر (الهيدر)" hint="يظهر في أعلى الموقع بلون أصفر/ذهبي">
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-400 border-2 border-yellow-300" />
                        <input type="tel" value={val("storePhone2")} onChange={e => set("storePhone2")(e.target.value)} placeholder="0555 000 002"
                          className="w-full bg-gray-50 border border-yellow-200 text-gray-900 placeholder:text-gray-400 pr-9 px-3 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-100 transition-colors" />
                      </div>
                    </Field>
                  </div>
                  <Field label="البريد الإلكتروني">
                    <SettingInput value={val("storeEmail")} onChange={set("storeEmail")} placeholder="info@malagaphone.com" type="email" prefix={<Mail className="w-3.5 h-3.5" />} />
                  </Field>
                  <Field label="العنوان">
                    <SettingInput value={val("storeAddress")} onChange={set("storeAddress")} placeholder="الجزائر العاصمة، حي المحاور" prefix={<MapPin className="w-3.5 h-3.5" />} />
                  </Field>
                  <Field label="وصف المتجر (يظهر في الصفحة الرئيسية)">
                    <textarea value={val("storeDescription")} onChange={e => set("storeDescription")(e.target.value)}
                      rows={3} placeholder="متجر متخصص في بيع الهواتف الذكية والإكسسوارات..."
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 resize-none" />
                  </Field>
                </SectionCard>
                <SectionCard title="صورة البانر الرئيسي" icon={<ImageIcon className="w-4 h-4" />}>
                  <p className="text-xs text-gray-500">تظهر هذه الصورة في القسم الرئيسي من الصفحة الرئيسية. الأبعاد المثلى: 800×600 أو 16:9.</p>
                  <BannerUpload value={val("heroBannerImage")} onChange={set("heroBannerImage")} />
                </SectionCard>
                <SaveBar onSave={() => saveMutation.mutate("general")} isPending={saveMutation.isPending} saved={savedTab === "general"} />
              </>
            )}

            {/* ═══ CONTACT ════════════════════════════════════════════════ */}
            {activeTab === "contact" && (
              <>
                <SectionCard title="واتساب" icon={<SiWhatsapp className="w-4 h-4 text-green-600" />}>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-green-700">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    الرقم المحفوظ هنا يُستخدم تلقائياً في زر واتساب على الموقع وصفحات المنتجات.
                  </div>
                  <Field label="رقم واتساب" hint="أدخل الرقم بصيغة الجزائرية: 0555 123 456">
                    <SettingInput value={val("whatsappNumber")} onChange={set("whatsappNumber")} placeholder="0555 123 456" prefix={<SiWhatsapp className="w-3.5 h-3.5 text-green-600" />} mono />
                  </Field>
                  <Field label="رسالة ترحيب افتراضية (اختياري)">
                    <textarea value={val("whatsappDefaultMessage")} onChange={e => set("whatsappDefaultMessage")(e.target.value)}
                      rows={2} placeholder="مرحباً، أريد الاستفسار عن..."
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 resize-none" />
                  </Field>
                  {val("whatsappNumber") && (
                    <a href={`https://wa.me/${val("whatsappNumber").replace(/^0/, "213").replace(/\D/g, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-green-700 hover:text-green-800 font-semibold">
                      <ExternalLink className="w-3.5 h-3.5" />
                      اختبر الرابط
                    </a>
                  )}
                </SectionCard>

                <SectionCard title="الشبكات الاجتماعية" icon={<Globe className="w-4 h-4" />}>
                  <Field label="Facebook">
                    <SettingInput value={val("facebookUrl")} onChange={set("facebookUrl")} placeholder="https://facebook.com/malagaphone" prefix={<SiFacebook className="w-3.5 h-3.5 text-blue-600" />} />
                  </Field>
                  <Field label="Instagram">
                    <SettingInput value={val("instagramUrl")} onChange={set("instagramUrl")} placeholder="https://instagram.com/malagaphone" prefix={<Instagram className="w-3.5 h-3.5 text-pink-600" />} />
                  </Field>
                  <Field label="TikTok">
                    <SettingInput value={val("tiktokUrl")} onChange={set("tiktokUrl")} placeholder="https://tiktok.com/@malagaphone" prefix={<SiTiktok className="w-3.5 h-3.5" />} />
                  </Field>
                </SectionCard>
                <SaveBar onSave={() => saveMutation.mutate("contact")} isPending={saveMutation.isPending} saved={savedTab === "contact"} />
              </>
            )}

            {/* ═══ ORDERS ═════════════════════════════════════════════════ */}
            {activeTab === "orders" && (
              <>
                <SectionCard title="ترقيم الطلبات والفواتير" icon={<Package className="w-4 h-4" />}>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="بادئة رقم الطلب" hint="مثال: ORD- → سيظهر: ORD-1001">
                      <SettingInput value={val("orderPrefix")} onChange={set("orderPrefix")} placeholder="ORD-" mono />
                    </Field>
                    <Field label="بادئة رقم الفاتورة" hint="مثال: INV- → سيظهر: INV-1001">
                      <SettingInput value={val("invoicePrefix")} onChange={set("invoicePrefix")} placeholder="INV-" mono />
                    </Field>
                  </div>
                  <Field label="ملاحظة افتراضية للطلبات (اختياري)">
                    <textarea value={val("defaultOrderNote")} onChange={e => set("defaultOrderNote")(e.target.value)}
                      rows={2} placeholder="شكراً لطلبك..."
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 resize-none" />
                  </Field>
                </SectionCard>
                <SaveBar onSave={() => saveMutation.mutate("orders")} isPending={saveMutation.isPending} saved={savedTab === "orders"} />
              </>
            )}

            {/* ═══ DELIVERY ═══════════════════════════════════════════════ */}
            {activeTab === "delivery" && (
              <>
                <SectionCard title="إعدادات التوصيل" icon={<Truck className="w-4 h-4" />}>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="سعر التوصيل الافتراضي (دج)" hint="يُطبّق على الولايات غير المحددة">
                      <SettingInput value={val("defaultDeliveryFee")} onChange={set("defaultDeliveryFee")} placeholder="500" type="number" mono />
                    </Field>
                    <Field label="شركة التوصيل الافتراضية">
                      <SettingInput value={val("defaultShippingCompany")} onChange={set("defaultShippingCompany")} placeholder="Yalidine / Zr Express..." />
                    </Field>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    لضبط أسعار التوصيل لكل ولاية، استخدم صفحة <strong>التوصيل</strong> في القائمة الجانبية.
                  </div>
                </SectionCard>
                <SaveBar onSave={() => saveMutation.mutate("delivery")} isPending={saveMutation.isPending} saved={savedTab === "delivery"} />
              </>
            )}

            {/* ═══ INVOICE ════════════════════════════════════════════════ */}
            {activeTab === "invoice" && (
              <>
                <SectionCard title="بيانات الفاتورة والطباعة" icon={<FileText className="w-4 h-4" />}>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    هذه البيانات تظهر في رأس الفاتورة عند الطباعة. إذا تركتها فارغة، يُستخدم اسم المتجر الرئيسي.
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="اسم المتجر في الفاتورة">
                      <SettingInput value={val("invoiceStoreName")} onChange={set("invoiceStoreName")} placeholder="MALAGA PHONE" prefix={<Store className="w-3.5 h-3.5" />} />
                    </Field>
                    <Field label="رقم الهاتف في الفاتورة">
                      <SettingInput value={val("invoicePhone")} onChange={set("invoicePhone")} placeholder="0555 123 456" prefix={<Phone className="w-3.5 h-3.5" />} mono />
                    </Field>
                  </div>
                  <Field label="العنوان في الفاتورة">
                    <SettingInput value={val("invoiceAddress")} onChange={set("invoiceAddress")} placeholder="الجزائر العاصمة..." prefix={<MapPin className="w-3.5 h-3.5" />} />
                  </Field>
                  <Field label="تذييل الفاتورة" hint="يظهر في أسفل كل فاتورة مطبوعة">
                    <SettingInput value={val("invoiceFooterNote")} onChange={set("invoiceFooterNote")} placeholder="شكراً لثقتكم — لا يُقبل الإرجاع بعد 48 ساعة" />
                  </Field>
                  <Toggle checked={val("invoiceShowLogo") !== "false"} onChange={v => set("invoiceShowLogo")(v ? "true" : "false")} label="إظهار شعار المتجر في الفاتورة" />
                </SectionCard>
                <SaveBar onSave={() => saveMutation.mutate("invoice")} isPending={saveMutation.isPending} saved={savedTab === "invoice"} />
              </>
            )}

            {/* ═══ POS ════════════════════════════════════════════════════ */}
            {activeTab === "pos" && (
              <>
                <SectionCard title="إعدادات نقطة البيع (POS)" icon={<ShoppingBag className="w-4 h-4" />}>
                  <Field label="طريقة الدفع الافتراضية">
                    <select value={val("posDefaultPayment") || "cash"} onChange={e => set("posDefaultPayment")(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100">
                      <option value="cash">نقداً</option>
                      <option value="transfer">تحويل بنكي / CCP</option>
                      <option value="card">بطاقة بنكية</option>
                    </select>
                  </Field>
                  <Toggle checked={val("posAutoPrint") === "true"} onChange={v => set("posAutoPrint")(v ? "true" : "false")} label="طباعة الفاتورة تلقائياً بعد كل عملية بيع" />
                </SectionCard>
                <SaveBar onSave={() => saveMutation.mutate("pos")} isPending={saveMutation.isPending} saved={savedTab === "pos"} />
              </>
            )}

            {/* ═══ SECURITY ═══════════════════════════════════════════════ */}
            {activeTab === "security" && (
              <SectionCard title="تغيير كلمة المرور" icon={<Lock className="w-4 h-4" />}>
                <div className="space-y-4 max-w-sm">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    لتغيير كلمة المرور، يجب إدخال الكلمة الحالية أولاً للتحقق من الهوية.
                  </div>

                  <Field label="كلمة المرور الحالية">
                    <div className="relative">
                      <input type={showPw ? "text" : "password"} value={curPw} onChange={e => setCurPw(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 pl-10" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>

                  <Field label="كلمة المرور الجديدة" hint="6 أحرف على الأقل">
                    <input type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                  </Field>

                  <Field label="تأكيد كلمة المرور الجديدة">
                    <div className="relative">
                      <input type={showPw ? "text" : "password"} value={confPw} onChange={e => setConfPw(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full bg-gray-50 border text-gray-900 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 transition-colors ${
                          confPw && newPw && confPw !== newPw
                            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                            : "border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                        }`} />
                      {confPw && newPw && confPw !== newPw && (
                        <p className="text-red-500 text-[10px] mt-1">كلمتا المرور غير متطابقتين</p>
                      )}
                    </div>
                  </Field>

                  <Button onClick={() => pwMutation.mutate()}
                    disabled={!curPw || !newPw || !confPw || newPw !== confPw || pwMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 gap-2 font-bold"
                    data-testid="button-change-password">
                    {pwMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" />جاري التغيير...</>
                      : <><RefreshCw className="w-4 h-4" />تغيير كلمة المرور</>}
                  </Button>
                </div>
              </SectionCard>
            )}

            {/* ═══ INTEGRATIONS ═══════════════════════════════════════════ */}
            {activeTab === "integrations" && (
              <>
                {/* Facebook Pixel */}
                <SectionCard title="Facebook Pixel" icon={<SiFacebook className="w-4 h-4 text-blue-600" />}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${val("facebookPixelId") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-400 border-gray-200"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${val("facebookPixelId") ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
                      {val("facebookPixelId") ? "مُفعَّل" : "غير مُفعَّل"}
                    </div>
                  </div>
                  <Field label="Pixel ID" hint="من مدير الأعمال ← Events Manager">
                    <SettingInput value={val("facebookPixelId")} onChange={set("facebookPixelId")} placeholder="123456789012345" mono />
                  </Field>
                  {val("facebookPixelId") && (
                    <div className="bg-gray-900 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
                        <span className="text-gray-400 text-xs font-mono">معاينة الكود</span>
                        <CopyButton text={`fbq('init', '${val("facebookPixelId")}');`} />
                      </div>
                      <code className="block px-4 py-3 text-xs text-emerald-400 font-mono">{`fbq('init', '${val("facebookPixelId")}');`}</code>
                    </div>
                  )}
                </SectionCard>

                {/* TikTok Pixel */}
                <SectionCard title="TikTok Pixel" icon={<SiTiktok className="w-4 h-4" />}>
                  <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 mb-2 ${val("tiktokPixelId") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-400 border-gray-200"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${val("tiktokPixelId") ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
                    {val("tiktokPixelId") ? "مُفعَّل" : "غير مُفعَّل"}
                  </div>
                  <Field label="Pixel ID" hint="من TikTok Ads Manager ← Assets ← Events">
                    <SettingInput value={val("tiktokPixelId")} onChange={set("tiktokPixelId")} placeholder="C4XXXXXXXXXXXXXXXXXX" mono />
                  </Field>
                  {val("tiktokPixelId") && (
                    <div className="bg-gray-900 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
                        <span className="text-gray-400 text-xs font-mono">معاينة الكود</span>
                        <CopyButton text={`ttq.load('${val("tiktokPixelId")}');`} />
                      </div>
                      <code className="block px-4 py-3 text-xs text-emerald-400 font-mono">{`ttq.load('${val("tiktokPixelId")}');`}</code>
                    </div>
                  )}
                </SectionCard>

                {/* Google Sheets */}
                <SectionCard title="Google Sheets Webhook" icon={<SiGooglesheets className="w-4 h-4 text-emerald-600" />}>
                  <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 mb-2 ${val("googleSheetsWebhookUrl") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-400 border-gray-200"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${val("googleSheetsWebhookUrl") ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
                    {val("googleSheetsWebhookUrl") ? "مُفعَّل" : "غير مُفعَّل"}
                  </div>
                  <Field label="Webhook URL">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="url" value={val("googleSheetsWebhookUrl")} onChange={e => set("googleSheetsWebhookUrl")(e.target.value)}
                          placeholder="https://script.google.com/macros/s/..."
                          className="w-full bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 pr-10 pl-4 py-2.5 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 font-mono text-xs" />
                      </div>
                      {val("googleSheetsWebhookUrl") && (
                        <a href={val("googleSheetsWebhookUrl")} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-700 rounded-xl text-xs transition-all">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </Field>
                  <div className="bg-gray-900 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-400/70" /><div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" /></div>
                        <span className="text-gray-400 text-xs font-mono">Code.gs</span>
                      </div>
                      <CopyButton text={appsScriptCode} />
                    </div>
                    <pre className="p-4 text-xs text-emerald-400 font-mono leading-relaxed overflow-x-auto">{appsScriptCode}</pre>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {["افتح Google Sheets", "Extensions → Apps Script", "الصق الكود واحفظ", "Deploy → Web App", "انسخ الـ URL"].map((s, i) => (
                      <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-center">
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center mx-auto mb-1.5">{i + 1}</div>
                        <p className="text-gray-500 text-[10px] leading-tight">{s}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SaveBar onSave={() => saveMutation.mutate("integrations")} isPending={saveMutation.isPending} saved={savedTab === "integrations"} />
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
