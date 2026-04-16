import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ExternalLink, Save, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { DELIVERY_SHIPPERS, type ShipperInfo, type DeliveryCompany } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdminLang } from "@/context/AdminLangContext";

type ShipperRow = ShipperInfo & Partial<DeliveryCompany> & { enabled: boolean };

function ShipperCard({ shipper, saved }: { shipper: ShipperRow; saved: Partial<DeliveryCompany> | undefined }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    apiKey: saved?.apiKey || "",
    apiToken: saved?.apiToken || "",
    accountId: saved?.accountId || "",
    storeId: saved?.storeId || "",
    notes: saved?.notes || "",
  });

  const toggleMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/shippers/${shipper.slug}`, { enabled: !shipper.enabled }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/shippers"] }); },
  });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/shippers/${shipper.slug}`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shippers"] });
      toast({ title: "تم الحفظ", description: `تم حفظ بيانات ${shipper.name} بنجاح` });
    },
  });

  const hasCredentials = form.apiKey || form.apiToken || form.accountId || form.storeId;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 p-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-md"
          style={{ backgroundColor: shipper.color }}
        >
          {shipper.initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-800 font-bold text-sm">{shipper.name}</span>
            {hasCredentials && shipper.enabled && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> مُربوط
              </span>
            )}
            {hasCredentials && !shipper.enabled && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                مُعدّ / غير مفعّل
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs mt-0.5 truncate">{shipper.description}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <a href={shipper.website} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            title="زيارة الموقع" data-testid={`link-shipper-website-${shipper.slug}`}>
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors ${shipper.enabled ? "bg-emerald-500" : "bg-gray-200"}`}
            style={{ height: "22px", width: "40px" }}
            data-testid={`toggle-shipper-${shipper.slug}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${shipper.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>

          <button
            onClick={() => setOpen(o => !o)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            data-testid={`btn-expand-shipper-${shipper.slug}`}
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm font-semibold">بيانات الربط API</span>
            <button
              onClick={() => setShowKeys(s => !s)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-all"
              data-testid={`btn-toggle-keys-${shipper.slug}`}
            >
              {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showKeys ? "إخفاء المفاتيح" : "إظهار المفاتيح"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shipper.fields.map(f => (
              <div key={f.key}>
                <label className="text-gray-500 text-xs font-semibold mb-1 block">{f.label}</label>
                <input
                  type={showKeys ? "text" : "password"}
                  value={form[f.key] || ""}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-900 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none transition-colors placeholder:text-gray-400"
                  data-testid={`input-${f.key}-${shipper.slug}`}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="text-gray-500 text-xs font-semibold mb-1 block">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="ملاحظات خاصة بهذه الشركة..."
              rows={2}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-900 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none transition-colors placeholder:text-gray-400 resize-none"
              data-testid={`textarea-notes-${shipper.slug}`}
            />
          </div>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 shadow-sm"
            data-testid={`btn-save-shipper-${shipper.slug}`}
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ البيانات
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminShippers() {
  const { t, dir } = useAdminLang();
  const { data: savedList = [] } = useQuery<DeliveryCompany[]>({ queryKey: ["/api/shippers"] });

  const savedMap = Object.fromEntries(savedList.map(s => [s.slug, s]));

  const shippers: ShipperRow[] = DELIVERY_SHIPPERS.map(s => ({
    ...s,
    ...(savedMap[s.slug] || {}),
    enabled: savedMap[s.slug]?.enabled ?? false,
  }));

  const activeCount = shippers.filter(s => s.enabled).length;
  const connectedCount = shippers.filter(s => (savedMap[s.slug]?.apiKey || savedMap[s.slug]?.apiToken) && s.enabled).length;

  return (
    <AdminLayout>
      <div className="space-y-5" dir={dir}>
        <div>
          <h1 className="text-lg font-black text-gray-900">شركات التوصيل</h1>
          <p className="text-gray-500 text-xs mt-0.5">اربط حساباتك مع شركات التوصيل الجزائرية عبر API</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-gray-900">{shippers.length}</div>
            <div className="text-gray-400 text-xs mt-1">شركة متاحة</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-emerald-700">{activeCount}</div>
            <div className="text-gray-400 text-xs mt-1">مفعّلة</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-blue-700">{connectedCount}</div>
            <div className="text-gray-400 text-xs mt-1">مُربوطة بـ API</div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-amber-500 text-lg">💡</span>
          <div>
            <p className="text-amber-700 text-sm font-semibold">كيفية الربط؟</p>
            <p className="text-amber-600/70 text-xs mt-1 leading-relaxed">
              1. سجّل في موقع شركة التوصيل وأنشئ حساباً تجارياً.&nbsp;
              2. احصل على مفاتيح API من لوحة تحكم الشركة.&nbsp;
              3. أدخل المفاتيح هنا واضغط "حفظ" ثم فعّل التبديل.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {shippers.map(s => (
            <ShipperCard key={s.slug} shipper={s} saved={savedMap[s.slug]} />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
