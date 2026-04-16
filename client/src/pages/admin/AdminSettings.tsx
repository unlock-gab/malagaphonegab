import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Settings, Save, Loader2, Eye, EyeOff,
  CheckCircle, Code, Zap, ExternalLink,
  BarChart3, Link2, Copy, Check, AlertCircle, TableProperties
} from "lucide-react";
import { SiFacebook, SiTiktok, SiGooglesheets } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";

const TABS = [
  { id: "pixels", label: "بيكسل الإعلانات", icon: BarChart3, desc: "Facebook & TikTok" },
  { id: "sheets", label: "Google Sheets", icon: TableProperties, desc: "ربط الطلبات" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 text-xs transition-all">
      {copied ? <><Check className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-700">تم النسخ</span></> : <><Copy className="w-3.5 h-3.5" />نسخ</>}
    </button>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
      {active ? "مُفعَّل" : "غير مُفعَّل"}
    </div>
  );
}

function PixelCard({
  title, subtitle, icon, accentColor, value, setValue, show, setShow,
  placeholder, fieldId, codePreview, hint
}: {
  title: string; subtitle: string; icon: React.ReactNode; accentColor: "blue" | "pink";
  value: string; setValue: (v: string) => void; show: boolean; setShow: (v: boolean) => void;
  placeholder: string; fieldId: string; codePreview: string; hint: string;
}) {
  const colors = {
    blue: { ring: "focus:border-blue-400 focus:ring-blue-100", badge: "bg-blue-50 text-blue-700 border-blue-200", icon: "bg-blue-50 text-blue-600" },
    pink: { ring: "focus:border-pink-400 focus:ring-pink-100", badge: "bg-pink-50 text-pink-700 border-pink-200", icon: "bg-pink-50 text-pink-600" },
  }[accentColor];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.icon}`}>
            {icon}
          </div>
          <div>
            <h2 className="text-gray-800 font-bold">{title}</h2>
            <p className="text-gray-400 text-xs">{subtitle}</p>
          </div>
        </div>
        <StatusBadge active={!!value} />
      </div>

      <div className="p-5 space-y-4">
        <p className="text-gray-500 text-xs leading-relaxed">{hint}</p>
        <div>
          <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Pixel ID</label>
          <div className="relative">
            <input
              id={fieldId}
              type={show ? "text" : "password"}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={placeholder}
              className={`w-full bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 px-4 py-3 rounded-xl focus:outline-none focus:ring-1 ${colors.ring} font-mono text-sm transition-colors pl-12`}
              data-testid={`input-${fieldId}`}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {codePreview && (
          <div className="bg-gray-900 rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-400 text-xs">معاينة الكود</span>
              </div>
              <CopyButton text={codePreview} />
            </div>
            <div className="px-4 py-3">
              <code className="text-xs text-emerald-400 font-mono">{codePreview}</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pixels");
  const [saved, setSaved] = useState(false);
  const [fbPixelId, setFbPixelId] = useState("");
  const [ttPixelId, setTtPixelId] = useState("");
  const [sheetsWebhook, setSheetsWebhook] = useState("");
  const [showFb, setShowFb] = useState(false);
  const [showTt, setShowTt] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: settings = {} } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });

  useEffect(() => {
    if (!initialized && Object.keys(settings).length > 0) {
      if (settings.facebookPixelId) setFbPixelId(settings.facebookPixelId);
      if (settings.tiktokPixelId) setTtPixelId(settings.tiktokPixelId);
      if (settings.googleSheetsWebhookUrl) setSheetsWebhook(settings.googleSheetsWebhookUrl);
      setInitialized(true);
    }
  }, [settings, initialized]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/settings", {
        facebookPixelId: fbPixelId, tiktokPixelId: ttPixelId, googleSheetsWebhookUrl: sheetsWebhook,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      toast({ title: "تم الحفظ بنجاح" });
    },
    onError: () => toast({ title: "خطأ في الحفظ", variant: "destructive" }),
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
      <div className="space-y-5" dir="rtl">
        <div>
          <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            الإعدادات
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">ربط المتجر بالأدوات الخارجية وإدارة التتبع</p>
        </div>

        <div className="flex gap-5">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0 space-y-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-right transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-50 border border-blue-200 text-blue-700"
                    : "hover:bg-gray-50 text-gray-500 hover:text-gray-700 border border-transparent"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activeTab === tab.id ? "bg-blue-100" : "bg-gray-100"}`}>
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-blue-600" : "text-gray-400"}`} />
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold leading-tight">{tab.label}</div>
                  <div className={`text-[10px] mt-0.5 ${activeTab === tab.id ? "text-blue-500" : "text-gray-400"}`}>{tab.desc}</div>
                </div>
              </button>
            ))}

            <div className="pt-4 border-t border-gray-100 mt-4">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  saved
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                }`}
                data-testid="button-save-settings"
              >
                {saveMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الحفظ</>
                  : saved
                  ? <><CheckCircle className="w-4 h-4" />تم الحفظ!</>
                  : <><Save className="w-4 h-4" />حفظ الإعدادات</>}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === "pixels" && (
              <div className="space-y-4">
                <PixelCard
                  title="Facebook Pixel"
                  subtitle="تتبع تحويلات فيسبوك وإنستغرام"
                  icon={<SiFacebook className="w-5 h-5" />}
                  accentColor="blue"
                  value={fbPixelId}
                  setValue={setFbPixelId}
                  show={showFb}
                  setShow={setShowFb}
                  placeholder="123456789012345"
                  fieldId="fb-pixel"
                  codePreview={fbPixelId ? `fbq('init', '${fbPixelId}');` : ""}
                  hint="أدخل معرّف البيكسل من مدير الأعمال ← Events Manager"
                />
                <PixelCard
                  title="TikTok Pixel"
                  subtitle="تتبع تحويلات تيك توك"
                  icon={<SiTiktok className="w-5 h-5" />}
                  accentColor="pink"
                  value={ttPixelId}
                  setValue={setTtPixelId}
                  show={showTt}
                  setShow={setShowTt}
                  placeholder="C4XXXXXXXXXXXXXXXXXX"
                  fieldId="tt-pixel"
                  codePreview={ttPixelId ? `ttq.load('${ttPixelId}');` : ""}
                  hint="أدخل معرّف البيكسل من TikTok Ads Manager ← Assets ← Events"
                />
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                    <h3 className="text-gray-800 font-bold text-sm">كيف يعمل البيكسل؟</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { t: "تتبع الزوار", d: "يسجّل كل زائر يدخل موقعك" },
                      { t: "قياس التحويلات", d: "يعرف من أكمل طلبه فعلاً" },
                      { t: "جمهور مخصص", d: "يُنشئ جمهور للإعلانات تلقائياً" },
                      { t: "تحسين الحملات", d: "يوصّل إعلانك للمشتري المناسب" },
                    ].map(item => (
                      <div key={item.t} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                        <div className="text-gray-800 text-xs font-bold mb-0.5">{item.t}</div>
                        <div className="text-gray-500 text-xs">{item.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sheets" && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                        <SiGooglesheets className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-gray-800 font-bold">Google Sheets Webhook</h2>
                        <p className="text-gray-400 text-xs">إرسال كل طلب جديد تلقائياً لجدولك</p>
                      </div>
                    </div>
                    <StatusBadge active={!!sheetsWebhook} />
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 block">رابط Google Apps Script (Webhook URL)</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="url"
                            value={sheetsWebhook}
                            onChange={e => setSheetsWebhook(e.target.value)}
                            placeholder="https://script.google.com/macros/s/..."
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 pr-10 pl-4 py-2.5 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 font-mono text-xs"
                            data-testid="input-sheets-webhook"
                          />
                        </div>
                        {sheetsWebhook && (
                          <a href={sheetsWebhook} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-700 rounded-xl text-xs transition-all">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      {sheetsWebhook && (
                        <div className="flex items-center gap-1.5 mt-2 text-emerald-700 text-xs">
                          <CheckCircle className="w-3.5 h-3.5" />
                          كل طلب جديد سيُرسل تلقائياً لـ Google Sheets
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-900 rounded-xl border border-gray-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                          </div>
                          <span className="text-gray-400 text-xs font-mono">Code.gs</span>
                        </div>
                        <CopyButton text={appsScriptCode} />
                      </div>
                      <pre className="p-4 text-xs text-emerald-400 font-mono leading-relaxed overflow-x-auto">{appsScriptCode}</pre>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">خطوات الإعداد</h4>
                      {[
                        "افتح Google Sheets وأنشئ جدول جديد",
                        "اذهب إلى Extensions → Apps Script",
                        "الصق الكود أعلاه في المحرر واحفظه",
                        "اضغط Deploy → New deployment → Web App",
                        "انسخ الـ URL والصقه في الحقل أعلاه",
                      ].map((step, n) => (
                        <div key={n} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs text-gray-500 font-bold">{n + 1}</span>
                          </div>
                          <p className="text-gray-500 text-sm leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>

                    <a href="https://script.google.com" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 border border-gray-200 hover:border-emerald-300 text-gray-400 hover:text-emerald-600 rounded-xl text-sm transition-all">
                      <ExternalLink className="w-4 h-4" />
                      فتح Google Apps Script
                    </a>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-amber-700 font-semibold text-sm mb-2">بيانات تُرسل لكل طلب</h4>
                      <div className="flex flex-wrap gap-2">
                        {["ID", "الاسم", "الهاتف", "الولاية", "نوع التوصيل", "المنتج", "الكمية", "المجموع", "الحالة", "التاريخ"].map(f => (
                          <span key={f} className="px-2 py-0.5 bg-white border border-amber-200 rounded-md text-amber-700 text-xs font-mono">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
