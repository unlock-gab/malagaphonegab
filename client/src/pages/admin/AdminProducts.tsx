import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, Search, Package, Loader2, ImageOff, Tag,
  Layers, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown,
  Eye, EyeOff, Star, StarOff, CheckSquare, Square, Filter, Cpu,
  X, ChevronDown, Upload, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";
import { useAdminLang } from "@/context/AdminLangContext";
import type { Product, Category, Brand } from "@shared/schema";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("fr-DZ").format(v) + " DA";
}

const CONDITION_KEYS = ["new", "used_good", "used_acceptable", "refurbished"] as const;
const PRODUCT_TYPE_KEYS = ["phone", "accessory", "tablet", "watch", "earphone", "other"] as const;
const STORAGE_OPTIONS = ["16GB","32GB","64GB","128GB","256GB","512GB","1TB"];
const RAM_OPTIONS = ["2GB","3GB","4GB","6GB","8GB","12GB","16GB","32GB"];
const COLOR_OPTIONS_FR = ["Noir","Blanc","Bleu","Rouge","Vert","Or","Argent","Violet","Gris","Rose","Orange"];
const COLOR_OPTIONS_AR = COLOR_OPTIONS_FR;

const PHONE_TYPES: Record<string, boolean> = { phone: true, tablet: true };

interface ProductForm {
  name: string; slug: string; shortDescription: string; description: string;
  price: string; originalPrice: string; costPrice: string;
  stock: string; minStock: string; sku: string; barcode: string; imei: string;
  categoryId: string; brandId: string; productType: string; condition: string;
  image: string; images: string[];
  published: boolean; featured: boolean;
  color: string; storageGb: string; ram: string;
  batteryHealth: string; screenSize: string; processor: string;
  operatingSystem: string; camera: string; frontCamera: string;
  simType: string; connectivity: string; warrantyDays: string;
}

const EMPTY_FORM: ProductForm = {
  name: "", slug: "", shortDescription: "", description: "",
  price: "", originalPrice: "", costPrice: "",
  stock: "0", minStock: "3", sku: "", barcode: "", imei: "",
  categoryId: "", brandId: "", productType: "phone", condition: "new",
  image: "", images: [],
  published: true, featured: false,
  color: "", storageGb: "", ram: "",
  batteryHealth: "", screenSize: "", processor: "",
  operatingSystem: "", camera: "", frontCamera: "",
  simType: "", connectivity: "", warrantyDays: "0",
};

function fromProduct(p: Product): ProductForm {
  return {
    name: p.name, slug: p.slug ?? "", shortDescription: p.shortDescription ?? "",
    description: p.description ?? "", price: p.price?.toString() ?? "",
    originalPrice: p.originalPrice?.toString() ?? "", costPrice: p.costPrice?.toString() ?? "",
    stock: p.stock.toString(), minStock: (p.minStock ?? 3).toString(),
    sku: p.sku ?? "", barcode: p.barcode ?? "", imei: (p as any).imei ?? "",
    categoryId: p.categoryId ?? "",
    brandId: p.brandId ?? "", productType: p.productType ?? "phone", condition: p.condition ?? "new",
    image: p.image ?? "", images: (p.images ?? []) as string[],
    published: p.published, featured: p.featured, color: p.color ?? "", storageGb: p.storageGb ?? "",
    ram: p.ram ?? "", batteryHealth: p.batteryHealth?.toString() ?? "",
    screenSize: (p as any).screenSize ?? "", processor: (p as any).processor ?? "",
    operatingSystem: (p as any).operatingSystem ?? "", camera: (p as any).camera ?? "",
    frontCamera: (p as any).frontCamera ?? "", simType: (p as any).simType ?? "",
    connectivity: (p as any).connectivity ?? "", warrantyDays: (p.warrantyDays ?? 0).toString(),
  };
}

function toPayload(f: ProductForm) {
  return {
    name: f.name, slug: f.slug || undefined, shortDescription: f.shortDescription || null,
    description: f.description || null, price: parseFloat(f.price) || 0,
    originalPrice: f.originalPrice ? parseFloat(f.originalPrice) : null,
    costPrice: f.costPrice ? parseFloat(f.costPrice) : "0",
    stock: parseInt(f.stock) || 0, minStock: parseInt(f.minStock) || 3,
    sku: f.sku || null, barcode: f.barcode || null, imei: f.imei || null, categoryId: f.categoryId || null,
    brandId: f.brandId || null, productType: f.productType, condition: f.condition,
    image: f.image || "", images: f.images.filter(Boolean),
    published: f.published, featured: f.featured, color: f.color || null, storageGb: f.storageGb || null,
    ram: f.ram || null, batteryHealth: f.batteryHealth ? parseInt(f.batteryHealth) : null,
    screenSize: f.screenSize || null, processor: f.processor || null,
    operatingSystem: f.operatingSystem || null, camera: f.camera || null,
    frontCamera: f.frontCamera || null, simType: f.simType || null,
    connectivity: f.connectivity || null, warrantyDays: parseInt(f.warrantyDays) || 0,
  };
}

const cls = {
  input: "bg-white border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus-visible:ring-blue-400",
  select: "bg-white border-gray-200 text-gray-900 text-sm",
};

function Field({ label, children, full, help }: { label: React.ReactNode; children: React.ReactNode; full?: boolean; help?: string }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <Label className="text-gray-600 text-xs mb-1.5 block font-semibold">{label}</Label>
      {children}
      {help && <p className="text-gray-400 text-[10px] mt-1">{help}</p>}
    </div>
  );
}

function ImageUploader({ value, onChange, label, uploadingLabel, hintLabel, formatsLabel, removeLabel, changeLabel }:
  { value: string; onChange: (url: string) => void; label: string; uploadingLabel: string; hintLabel: string; formatsLabel: string; removeLabel: string; changeLabel: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (data.url) onChange(data.url);
    } catch { /* silent */ } finally { setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <Label className="text-gray-600 text-xs font-semibold block">{label}</Label>
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-colors
          ${value ? "border-blue-200 bg-blue-50/30" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/20 bg-gray-50/50"}`}
      >
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        {value ? (
          <div className="flex items-center gap-3 p-3">
            <img src={value} alt="preview" className="h-20 w-20 object-contain rounded-lg border border-gray-200 bg-white flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 truncate font-mono">{value.split("/").pop()}</p>
              <button onClick={e => { e.stopPropagation(); onChange(""); }}
                className="mt-1.5 text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                <X className="w-3 h-3" /> {removeLabel}
              </button>
            </div>
            <div className="flex-shrink-0 text-right">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : (
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">{changeLabel}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            {uploading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : <Upload className="w-6 h-6 text-gray-400" />}
            <p className="text-xs text-gray-500">{uploading ? uploadingLabel : hintLabel}</p>
            <p className="text-[10px] text-gray-400">{formatsLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MultiImageUploader({ value, onChange, label, uploadingLabel, addLabel }:
  { value: string[]; onChange: (urls: string[]) => void; label: string; uploadingLabel: string; addLabel: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append("images", f));
      const res = await fetch("/api/upload/multiple", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (data.urls) onChange([...value, ...data.urls]);
    } catch { /* silent */ } finally { setUploading(false); }
  };

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <Label className="text-gray-600 text-xs font-semibold block">{label}</Label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt="" className="h-16 w-16 object-contain rounded-lg border border-gray-200 bg-white" />
              <button onClick={() => remove(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }} />
      <button onClick={() => inputRef.current?.click()} disabled={uploading}
        className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        {uploading ? uploadingLabel : addLabel}
      </button>
    </div>
  );
}

function ProductFormDialog({ initial, onSave, onCancel, loading, categories, brands }: {
  initial: ProductForm; onSave: (d: any) => void; onCancel: () => void; loading: boolean;
  categories: Category[]; brands: Brand[];
}) {
  const { t, dir, lang } = useAdminLang();
  const [form, setForm] = useState<ProductForm>(initial);
  const set = (k: keyof ProductForm, v: any) => setForm(f => ({ ...f, [k]: v }));
  const isPhone = PHONE_TYPES[form.productType];
  const isUsed = form.condition !== "new";

  const conditionLabel = (key: string) => {
    const map: Record<string, string> = {
      new: t("cond_new"), used_good: t("cond_used_good"),
      used_acceptable: t("cond_used_acceptable"), refurbished: t("cond_refurbished"),
    };
    return map[key] ?? key;
  };
  const typeLabel = (key: string) => {
    const map: Record<string, string> = {
      phone: t("type_phone"), accessory: t("type_accessory"), tablet: t("type_tablet"),
      watch: t("type_watch"), earphone: t("type_earphone"), other: t("type_other"),
    };
    return map[key] ?? key;
  };

  const colorOptions = lang === "ar" ? COLOR_OPTIONS_AR : COLOR_OPTIONS_FR;

  return (
    <div dir={dir}>
      <Tabs defaultValue="basic">
        <TabsList className="bg-gray-100 border border-gray-200 mb-4 w-full">
          <TabsTrigger value="basic" className="flex-1 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-500 text-xs">{t("tab_basic")}</TabsTrigger>
          <TabsTrigger value="specs" className="flex-1 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-500 text-xs">{t("tab_specs")}</TabsTrigger>
          <TabsTrigger value="stock" className="flex-1 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-500 text-xs">{t("tab_stock")}</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-3">
          <div>
            <Label className="text-gray-600 text-xs mb-1.5 block font-semibold">{t("product_name")}</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} className={cls.input} placeholder={t("product_name_ph")} data-testid="input-product-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("product_type")}>
              <Select value={form.productType} onValueChange={v => set("productType", v)}>
                <SelectTrigger className={cls.select} data-testid="select-product-type"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {PRODUCT_TYPE_KEYS.map(k => <SelectItem key={k} value={k} className="text-gray-800 text-sm">{typeLabel(k)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("condition")}>
              <Select value={form.condition} onValueChange={v => set("condition", v)}>
                <SelectTrigger className={cls.select}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {CONDITION_KEYS.map(k => <SelectItem key={k} value={k} className="text-gray-800 text-sm">{conditionLabel(k)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("category")}>
              <Select value={form.categoryId} onValueChange={v => set("categoryId", v)}>
                <SelectTrigger className={cls.select} data-testid="select-product-category"><SelectValue placeholder={t("select_category")} /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {categories.map(c => <SelectItem key={c.id} value={c.id} className="text-gray-800 text-sm">{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("brand")}>
              <Select value={form.brandId} onValueChange={v => set("brandId", v)}>
                <SelectTrigger className={cls.select} data-testid="select-product-brand"><SelectValue placeholder={t("select_brand")} /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {brands.map(b => <SelectItem key={b.id} value={b.id} className="text-gray-800 text-sm">{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label={t("short_description")} full>
            <Textarea value={form.shortDescription} onChange={e => set("shortDescription", e.target.value)} className={`${cls.input} resize-none`} rows={2} placeholder={t("short_description_ph")} />
          </Field>
          <Field label={t("full_description")} full>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} className={`${cls.input} resize-none`} rows={3} placeholder={t("full_description_ph")} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t("sale_price")} help={t("sale_price_help")}>
              <Input type="number" value={form.price} onChange={e => set("price", e.target.value)} className={cls.input} placeholder="0" data-testid="input-product-price" />
            </Field>
            <Field label={t("original_price")} help={t("original_price_help")}>
              <Input type="number" value={form.originalPrice} onChange={e => set("originalPrice", e.target.value)} className={cls.input} placeholder="0" />
            </Field>
            <Field label={<span>{t("cost_price_field")} <span className="text-red-500">*</span></span>} help={t("cost_price_help")}>
              <Input type="number" value={form.costPrice} onChange={e => set("costPrice", e.target.value)}
                className={`${cls.input} ${(!form.costPrice || parseFloat(form.costPrice) <= 0) ? "border-red-300 focus-visible:ring-red-400" : ""}`}
                placeholder="0" data-testid="input-product-cost" />
              {(!form.costPrice || parseFloat(form.costPrice) <= 0) && (
                <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1">
                  <span>⚠</span> Coût obligatoire — ne peut pas être 0 DA
                </p>
              )}
            </Field>
          </div>
          <div className="flex items-center gap-6 pt-1">
            <div className="flex items-center gap-2">
              <Switch checked={form.published} onCheckedChange={v => set("published", v)} data-testid="switch-product-published" />
              <Label className="text-gray-700 text-sm">{t("published_store")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.featured} onCheckedChange={v => set("featured", v)} />
              <Label className="text-gray-700 text-sm">{t("featured_store")}</Label>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-3">
            <ImageUploader
              label={t("main_image")}
              value={form.image}
              onChange={v => set("image", v)}
              uploadingLabel={t("uploading")}
              hintLabel={t("upload_hint")}
              formatsLabel={t("upload_formats")}
              removeLabel={t("remove_image")}
              changeLabel={t("change_image")}
            />
            <MultiImageUploader
              label={t("extra_images")}
              value={form.images}
              onChange={v => set("images", v)}
              uploadingLabel={t("uploading")}
              addLabel={t("add_images")}
            />
          </div>
        </TabsContent>

        <TabsContent value="specs" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("color_field")}>
              <Select value={form.color} onValueChange={v => set("color", v)}>
                <SelectTrigger className={cls.select}><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  {colorOptions.map(c => <SelectItem key={c} value={c} className="text-gray-800 text-sm">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("warranty_days")} help={t("warranty_help")}>
              <Input type="number" value={form.warrantyDays} onChange={e => set("warrantyDays", e.target.value)} className={cls.input} placeholder="365" />
            </Field>
          </div>
          {isPhone ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("storage_label")}>
                  <Select value={form.storageGb} onValueChange={v => set("storageGb", v)}>
                    <SelectTrigger className={cls.select}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-lg">
                      {STORAGE_OPTIONS.map(s => <SelectItem key={s} value={s} className="text-gray-800 text-sm">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("ram_label")}>
                  <Select value={form.ram} onValueChange={v => set("ram", v)}>
                    <SelectTrigger className={cls.select}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-lg">
                      {RAM_OPTIONS.map(r => <SelectItem key={r} value={r} className="text-gray-800 text-sm">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("screen_size")} help={t("screen_size_help")}>
                  <Input value={form.screenSize} onChange={e => set("screenSize", e.target.value)} className={cls.input} placeholder='6.7"' />
                </Field>
                <Field label={t("processor")} help={t("processor_help")}>
                  <Input value={form.processor} onChange={e => set("processor", e.target.value)} className={cls.input} placeholder="A17 Pro" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("os_label")}>
                  <Input value={form.operatingSystem} onChange={e => set("operatingSystem", e.target.value)} className={cls.input} placeholder="iOS 17" />
                </Field>
                <Field label={t("sim_type")}>
                  <Input value={form.simType} onChange={e => set("simType", e.target.value)} className={cls.input} placeholder="Nano / eSIM" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("rear_camera")}>
                  <Input value={form.camera} onChange={e => set("camera", e.target.value)} className={cls.input} placeholder="48MP + 12MP + 12MP" />
                </Field>
                <Field label={t("front_camera")}>
                  <Input value={form.frontCamera} onChange={e => set("frontCamera", e.target.value)} className={cls.input} placeholder="12MP" />
                </Field>
              </div>
              <Field label={t("connectivity_label")} full>
                <Input value={form.connectivity} onChange={e => set("connectivity", e.target.value)} className={cls.input} placeholder={t("connectivity_ph")} />
              </Field>
              {isUsed && (
                <div className="border border-amber-200 rounded-xl p-3 bg-amber-50 space-y-3">
                  <p className="text-amber-700 text-xs font-bold">{t("used_device_fields")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t("battery_health_pct")} help={t("battery_health_help")}>
                      <Input type="number" value={form.batteryHealth} onChange={e => set("batteryHealth", e.target.value)} className={cls.input} placeholder="85" min="0" max="100" />
                    </Field>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-gray-500 text-sm">
              <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>{t("accessories_no_specs")}</p>
              <p className="text-xs mt-1 text-gray-400">{t("accessories_hint")}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stock" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("current_stock")}>
              <Input type="number" value={form.stock} onChange={e => set("stock", e.target.value)} className={cls.input} data-testid="input-product-stock" />
            </Field>
            <Field label={t("min_stock_label")} help={t("min_stock_help")}>
              <Input type="number" value={form.minStock} onChange={e => set("minStock", e.target.value)} className={cls.input} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("sku_label")}>
              <Input value={form.sku} onChange={e => set("sku", e.target.value)} className={`${cls.input} font-mono`} placeholder="SKU-001" />
            </Field>
            <Field label={t("barcode_label")}>
              <Input value={form.barcode} onChange={e => set("barcode", e.target.value)} className={`${cls.input} font-mono`} placeholder="6291041500213" />
            </Field>
          </div>
          <Field label={t("imei_label")} full help={t("imei_help")}>
            <Input value={form.imei} onChange={e => set("imei", e.target.value)} className={`${cls.input} font-mono`} placeholder="351234567890123" dir="ltr" data-testid="input-product-imei" />
          </Field>
          <Field label={t("slug_label")} full>
            <Input value={form.slug} onChange={e => set("slug", e.target.value)} className={`${cls.input} font-mono`} placeholder="iphone-15-pro-max-256gb" dir="ltr" />
          </Field>
        </TabsContent>
      </Tabs>

      <DialogFooter className="mt-4 gap-2 border-t border-gray-100 pt-4">
        <Button variant="outline" onClick={onCancel} className="border-gray-200 text-gray-600 hover:bg-gray-50">{t("cancel")}</Button>
        <Button onClick={() => onSave(toPayload(form))} disabled={loading || !form.name || !form.price || !form.costPrice || parseFloat(form.costPrice) <= 0}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" data-testid="button-save-product">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />{t("saving")}</> : t("save_product")}
        </Button>
      </DialogFooter>
    </div>
  );
}

type SortKey = "name" | "stock" | "price" | "costPrice" | "published";
type SortDir = "asc" | "desc";

function SortHeader({ label, sortKey, current, onSort }: { label: string; sortKey: SortKey; current: [SortKey, SortDir]; onSort: (k: SortKey) => void }) {
  const [curKey, curDir] = current;
  const active = curKey === sortKey;
  return (
    <button onClick={() => onSort(sortKey)} className={`flex items-center gap-1 hover:text-gray-900 transition-colors group ${active ? "text-gray-900" : ""}`}>
      {label}
      <span className="opacity-50 group-hover:opacity-100">
        {active ? (curDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}
      </span>
    </button>
  );
}

interface ProductVariant {
  id: string; productId: string; storage?: string | null; color?: string | null;
  sku?: string | null; imei?: string | null; costPrice?: string | null;
  price?: string | null; stock: number; active: boolean; createdAt?: string | null;
}

function ProductVariantsDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const { t, dir, lang } = useAdminLang();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [form, setForm] = useState({ storage: "", color: "", sku: "", imei: "", costPrice: "", price: "", stock: "1", active: true });
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const colorOptions = lang === "ar" ? COLOR_OPTIONS_AR : COLOR_OPTIONS_FR;

  const { data: variants = [], isLoading } = useQuery<ProductVariant[]>({
    queryKey: ["/api/products", product.id, "variants"],
    queryFn: async () => {
      const res = await fetch(`/api/products/${product.id}/variants`, { credentials: "include" });
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      let res: Response;
      if (editingVariant) {
        res = await fetch(`/api/variants/${editingVariant.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data), credentials: "include",
        });
      } else {
        res = await fetch(`/api/products/${product.id}/variants`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data), credentials: "include",
        });
      }
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || t("save_failed")); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", product.id, "variants"] });
      setAddOpen(false); setEditingVariant(null);
      setForm({ storage: "", color: "", sku: "", imei: "", costPrice: "", price: "", stock: "1", active: true });
      toast({ title: t("saved_ok") });
    },
    onError: (e: any) => toast({ title: e.message || t("save_failed"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/variants/${id}`, { method: "DELETE", credentials: "include" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", product.id, "variants"] });
      toast({ title: t("deleted_ok") });
    },
  });

  const openEdit = (v: ProductVariant) => {
    setEditingVariant(v);
    setForm({ storage: v.storage || "", color: v.color || "", sku: v.sku || "", imei: v.imei || "",
      costPrice: v.costPrice || "", price: v.price || "", stock: v.stock.toString(), active: v.active });
    setAddOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      storage: form.storage || null, color: form.color || null,
      sku: form.sku || null, imei: form.imei || null,
      costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
      price: form.price ? parseFloat(form.price) : null,
      stock: parseInt(form.stock) || 0, active: form.active,
    });
  };

  const inputCls = "bg-white border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus-visible:ring-blue-400";

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[88vh] overflow-y-auto shadow-xl" dir={dir}>
        <DialogHeader className="border-b border-gray-100 pb-3">
          <DialogTitle className="text-gray-900 flex items-center gap-2 text-sm font-bold">
            <Cpu className="w-4 h-4 text-blue-600" />
            {t("variants_title")} — {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">{variants.length} {t("variants_registered")}</p>
            <Button size="sm" onClick={() => { setEditingVariant(null); setForm({ storage:"",color:"",sku:"",imei:"",costPrice:"",price:"",stock:"1",active:true }); setAddOpen(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-sm" data-testid="btn-add-variant">
              <Plus className="w-3.5 h-3.5 ml-1" /> {t("add_variant")}
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : variants.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Cpu className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-gray-500 text-sm font-semibold">{t("no_variants")}</p>
              <p className="text-gray-400 text-xs mt-0.5">{t("no_variants_hint")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {variants.map(v => (
                <div key={v.id} className={`bg-white border rounded-xl p-3 flex items-center gap-3 ${v.active ? "border-gray-200" : "border-gray-100 opacity-60"}`} data-testid={`variant-row-${v.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {v.color && <span className="text-xs bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-gray-700 font-medium">{v.color}</span>}
                      {v.storage && <span className="text-xs bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-blue-700 font-medium">{v.storage}</span>}
                      {v.sku && <span className="text-[10px] text-gray-400 font-mono">{v.sku}</span>}
                      {!v.active && <span className="text-[10px] text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded bg-amber-50">{t("variant_disabled")}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{t("col_stock")}: <b className="text-gray-700">{v.stock}</b></span>
                      {v.price && <span>{t("col_price")}: <b className="text-blue-700">{v.price} DA</b></span>}
                      {v.imei && <span className="font-mono text-[10px]">IMEI: {v.imei}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (confirm(t("confirm_delete_variant"))) deleteMutation.mutate(v.id); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {addOpen && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <h4 className="text-gray-700 text-sm font-bold">{editingVariant ? t("edit_variant") : t("add_new_variant")}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">{t("color_field")}</Label>
                  <Select value={form.color} onValueChange={v => setF("color", v)}>
                    <SelectTrigger className={`${inputCls} h-9`}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-lg">
                      <SelectItem value="">{t("no_value")}</SelectItem>
                      {colorOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">{t("storage_label")}</Label>
                  <Select value={form.storage} onValueChange={v => setF("storage", v)}>
                    <SelectTrigger className={`${inputCls} h-9`}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-lg">
                      <SelectItem value="">{t("no_value")}</SelectItem>
                      {STORAGE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">{t("sale_price")}</Label>
                  <Input type="number" value={form.price} onChange={e => setF("price", e.target.value)} className={`${inputCls} h-9`} placeholder={product.price?.toString() || "0"} />
                </div>
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block flex items-center gap-1">
                    {t("cost_price_field")} <span className="text-red-500">*</span>
                  </Label>
                  <Input type="number" value={form.costPrice} onChange={e => setF("costPrice", e.target.value)}
                    className={`${inputCls} h-9 ${(!form.costPrice || parseFloat(form.costPrice) <= 0) ? "border-red-300 focus-visible:ring-red-400" : ""}`}
                    placeholder="0" />
                  {(!form.costPrice || parseFloat(form.costPrice) <= 0) && (
                    <p className="text-red-500 text-[10px] mt-0.5">⚠ Coût obligatoire</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">{t("col_stock")}</Label>
                  <Input type="number" value={form.stock} onChange={e => setF("stock", e.target.value)} className={`${inputCls} h-9`} placeholder="1" />
                </div>
                <div>
                  <Label className="text-gray-500 text-xs mb-1 block">SKU</Label>
                  <Input value={form.sku} onChange={e => setF("sku", e.target.value)} className={`${inputCls} h-9 font-mono`} placeholder="SKU-001" dir="ltr" />
                </div>
              </div>
              <div>
                <Label className="text-gray-500 text-xs mb-1 block">IMEI</Label>
                <Input value={form.imei} onChange={e => setF("imei", e.target.value)} className={`${inputCls} h-9 font-mono`} placeholder="351234567890123" dir="ltr" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setF("active", v)} />
                <Label className="text-gray-700 text-sm">{t("variant_active")}</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saveMutation.isPending || !form.costPrice || parseFloat(form.costPrice) <= 0} className="bg-blue-600 hover:bg-blue-700 text-white text-sm flex-1" data-testid="btn-save-variant">
                  {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : null}
                  {editingVariant ? t("update_variant") : t("add")}
                </Button>
                <Button variant="outline" onClick={() => { setAddOpen(false); setEditingVariant(null); }} className="border-gray-200 text-gray-600 text-sm">{t("cancel")}</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminProducts() {
  const { t, dir } = useAdminLang();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [sort, setSort] = useState<[SortKey, SortDir]>(["name", "asc"]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: brands = [] } = useQuery<Brand[]>({ queryKey: ["/api/brands"] });

  const conditionLabel = (key: string) => {
    const map: Record<string, string> = {
      new: t("cond_new"), used_good: t("cond_used_good"),
      used_acceptable: t("cond_used_acceptable"), refurbished: t("cond_refurbished"),
    };
    return map[key] ?? key;
  };
  const typeLabel = (key: string) => {
    const map: Record<string, string> = {
      phone: t("type_phone"), accessory: t("type_accessory"), tablet: t("type_tablet"),
      watch: t("type_watch"), earphone: t("type_earphone"), other: t("type_other"),
    };
    return map[key] ?? key;
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); setOpen(false); toast({ title: t("product_added") }); },
    onError: (e: any) => toast({ title: t("add_failed"), description: e.message, variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); setOpen(false); setEditing(null); toast({ title: t("product_updated") }); },
    onError: (e: any) => toast({ title: t("update_failed"), description: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); toast({ title: t("product_deleted") }); },
    onError: () => toast({ title: t("delete_failed"), variant: "destructive" }),
  });

  const handleSave = (data: any) => editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  const isMutating = createMutation.isPending || updateMutation.isPending;

  const toggleSort = (key: SortKey) => setSort(([k, d]) => k === key ? [k, d === "asc" ? "desc" : "asc"] : [key, "asc"]);

  const filtered = useMemo(() => {
    let list = products.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q);
      const matchCat = catFilter === "all" || p.categoryId === catFilter;
      const matchType = typeFilter === "all" || p.productType === typeFilter;
      const matchStatus = statusFilter === "all" || (statusFilter === "published" && p.published) || (statusFilter === "hidden" && !p.published) || (statusFilter === "low" && p.stock <= (p.minStock ?? 3) && p.stock > 0) || (statusFilter === "out" && p.stock === 0);
      return matchSearch && matchCat && matchType && matchStatus;
    });
    const [key, d] = sort;
    list = [...list].sort((a, b) => {
      let av: any = a[key as keyof Product], bv: any = b[key as keyof Product];
      if (key === "price" || key === "costPrice") { av = parseFloat(av ?? "0"); bv = parseFloat(bv ?? "0"); }
      if (key === "published") { av = a.published ? 1 : 0; bv = b.published ? 1 : 0; }
      if (typeof av === "string") return d === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return d === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [products, search, catFilter, typeFilter, statusFilter, sort]);

  const getBrand = (id?: string | null) => brands.find(b => b.id === id)?.name ?? "—";
  const getCat = (id?: string | null) => categories.find(c => c.id === id)?.name ?? "—";

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.id)));
  };
  const toggleOne = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const bulkPublish = async (published: boolean) => {
    await Promise.all([...selected].map(id => apiRequest("PATCH", `/api/products/${id}`, { published })));
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    setSelected(new Set());
    toast({ title: `${published ? t("bulk_publish") : t("bulk_hide")} — ${selected.size}` });
  };
  const bulkDelete = async () => {
    if (!confirm(`${t("delete")} ${selected.size}?`)) return;
    await Promise.all([...selected].map(id => apiRequest("DELETE", `/api/products/${id}`)));
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    setSelected(new Set());
    toast({ title: t("product_deleted") });
  };

  const stockOk = products.filter(p => p.stock > (p.minStock ?? 3)).length;
  const stockLow = products.filter(p => p.stock > 0 && p.stock <= (p.minStock ?? 3)).length;
  const stockOut = products.filter(p => p.stock === 0).length;

  return (
    <AdminLayout>
      <div className="space-y-4" dir={dir}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">{t("products_title")}</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {products.length} •{" "}
              <span className="text-emerald-600">{stockOk} {t("stock_good")}</span>
              {stockLow > 0 && <> • <span className="text-amber-600">{stockLow} {t("stock_low_label")}</span></>}
              {stockOut > 0 && <> • <span className="text-red-600">{stockOut} {t("stock_out_label")}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <button onClick={() => setViewMode("table")} className={`p-2 transition-colors ${viewMode === "table" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-700 bg-white"}`}><List className="w-4 h-4" /></button>
              <button onClick={() => setViewMode("card")} className={`p-2 transition-colors ${viewMode === "card" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-700 bg-white"}`}><LayoutGrid className="w-4 h-4" /></button>
            </div>
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm shadow-sm" data-testid="button-add-product">
              <Plus className="w-4 h-4" /> {t("new_product")}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search_products")} className="bg-white border-gray-200 text-gray-900 pr-9 text-sm h-9 placeholder:text-gray-400" data-testid="input-product-search" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="bg-white border-gray-200 text-gray-700 w-36 text-xs h-9"><SelectValue placeholder={t("category")} /></SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-lg">
              <SelectItem value="all" className="text-gray-800 text-sm">{t("all_categories")}</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id} className="text-gray-800 text-sm">{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-white border-gray-200 text-gray-700 w-32 text-xs h-9"><SelectValue placeholder={t("col_type")} /></SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-lg">
              <SelectItem value="all" className="text-gray-800 text-sm">{t("all_types")}</SelectItem>
              {PRODUCT_TYPE_KEYS.map(k => <SelectItem key={k} value={k} className="text-gray-800 text-sm">{typeLabel(k)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white border-gray-200 text-gray-700 w-32 text-xs h-9"><SelectValue placeholder={t("col_status")} /></SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-lg">
              <SelectItem value="all" className="text-gray-800 text-sm">{t("all_statuses")}</SelectItem>
              <SelectItem value="published" className="text-gray-800 text-sm">{t("status_published")}</SelectItem>
              <SelectItem value="hidden" className="text-gray-800 text-sm">{t("status_hidden")}</SelectItem>
              <SelectItem value="low" className="text-gray-800 text-sm">{t("status_low_stock")}</SelectItem>
              <SelectItem value="out" className="text-gray-800 text-sm">{t("status_out_stock")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
            <span className="text-blue-700 text-sm font-semibold">{selected.size} {t("selected_count")}</span>
            <div className="flex gap-2 mr-auto">
              <Button size="sm" onClick={() => bulkPublish(true)} className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs h-7"><Eye className="w-3 h-3 ml-1" />{t("bulk_publish")}</Button>
              <Button size="sm" onClick={() => bulkPublish(false)} className="bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 text-xs h-7"><EyeOff className="w-3 h-3 ml-1" />{t("bulk_hide")}</Button>
              <Button size="sm" onClick={bulkDelete} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-xs h-7"><Trash2 className="w-3 h-3 ml-1" />{t("bulk_delete")}</Button>
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())} className="border-gray-200 text-gray-500 text-xs h-7 hover:bg-gray-50">{t("bulk_cancel")}</Button>
            </div>
          </div>
        )}

        {/* TABLE VIEW */}
        {viewMode === "table" && (
          isLoading ? (
            <div className="space-y-1">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Package className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-gray-600 font-semibold text-sm">{t("no_products")}</p>
              <p className="text-gray-400 text-xs mt-1">{t("no_products_hint")}</p>
              <Button onClick={() => { setEditing(null); setOpen(true); }} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm shadow-sm">
                <Plus className="w-4 h-4" /> {t("add_first_product")}
              </Button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs">
                      <th className="p-3 w-10">
                        <button onClick={toggleAll}>{allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-300" />}</button>
                      </th>
                      <th className="text-right p-3 font-semibold min-w-48">
                        <SortHeader label={t("col_product")} sortKey="name" current={sort} onSort={toggleSort} />
                      </th>
                      <th className="text-right p-3 font-semibold hidden md:table-cell">SKU</th>
                      <th className="text-right p-3 font-semibold hidden lg:table-cell">{t("col_category")}</th>
                      <th className="text-right p-3 font-semibold hidden xl:table-cell">{t("col_brand")}</th>
                      <th className="text-right p-3 font-semibold hidden sm:table-cell">{t("col_type")}</th>
                      <th className="text-right p-3 font-semibold hidden md:table-cell">{t("col_condition")}</th>
                      <th className="text-center p-3 font-semibold">
                        <SortHeader label={t("col_stock")} sortKey="stock" current={sort} onSort={toggleSort} />
                      </th>
                      <th className="text-right p-3 font-semibold hidden lg:table-cell">
                        <SortHeader label={t("col_cost")} sortKey="costPrice" current={sort} onSort={toggleSort} />
                      </th>
                      <th className="text-right p-3 font-semibold">
                        <SortHeader label={t("col_price")} sortKey="price" current={sort} onSort={toggleSort} />
                      </th>
                      <th className="text-center p-3 font-semibold hidden sm:table-cell">
                        <SortHeader label={t("col_publish")} sortKey="published" current={sort} onSort={toggleSort} />
                      </th>
                      <th className="text-center p-3 font-semibold hidden md:table-cell">{t("col_featured")}</th>
                      <th className="text-center p-3 font-semibold w-20">{t("col_actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const isLow = p.stock > 0 && p.stock <= (p.minStock ?? 3);
                      const isOut = p.stock === 0;
                      const isSel = selected.has(p.id);
                      return (
                        <tr key={p.id} className={`border-b border-gray-50 transition-colors ${isSel ? "bg-blue-50" : isOut ? "bg-red-50/40" : isLow ? "bg-amber-50/40" : "hover:bg-gray-50/70"}`}
                          data-testid={`row-product-${p.id}`}>
                          <td className="p-3">
                            <button onClick={() => toggleOne(p.id)}>{isSel ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-300" />}</button>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                                {p.image?.trim() ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <ImageOff className="w-4 h-4 text-gray-300 m-auto mt-2.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-gray-800 font-semibold text-xs truncate max-w-40">{p.name}</p>
                                {(p as any).storageGb && <p className="text-gray-400 text-[10px]">{(p as any).storageGb} {p.color ? `• ${p.color}` : ""}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-gray-400 text-xs font-mono hidden md:table-cell">{p.sku ?? "—"}</td>
                          <td className="p-3 text-gray-500 text-xs hidden lg:table-cell">{getCat(p.categoryId)}</td>
                          <td className="p-3 text-gray-500 text-xs hidden xl:table-cell">{getBrand(p.brandId)}</td>
                          <td className="p-3 hidden sm:table-cell">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {typeLabel(p.productType ?? "")}
                            </span>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <span className="text-xs text-gray-500">{conditionLabel(p.condition ?? "")}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                              isOut ? "bg-red-50 text-red-600 border-red-200" :
                              isLow ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>{p.stock}</span>
                          </td>
                          <td className="p-3 text-gray-500 text-xs hidden lg:table-cell">
                            {p.costPrice && parseFloat(p.costPrice.toString()) > 0 ? formatCurrency(parseFloat(p.costPrice.toString())) : "—"}
                          </td>
                          <td className="p-3">
                            <span className="text-blue-700 font-bold text-sm">{formatCurrency(parseFloat(p.price.toString()))}</span>
                          </td>
                          <td className="p-3 text-center hidden sm:table-cell">
                            <button onClick={() => updateMutation.mutate({ id: p.id, data: { published: !p.published } })}
                              className={`transition-colors ${p.published ? "text-emerald-600 hover:text-red-500" : "text-gray-300 hover:text-emerald-600"}`}
                              data-testid={`toggle-published-${p.id}`}>
                              {p.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="p-3 text-center hidden md:table-cell">
                            <button onClick={() => updateMutation.mutate({ id: p.id, data: { featured: !p.featured } })}
                              className={`transition-colors ${p.featured ? "text-amber-500 hover:text-gray-400" : "text-gray-200 hover:text-amber-400"}`}
                              data-testid={`toggle-featured-${p.id}`}>
                              {p.featured ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setVariantsProduct(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors" title="Variantes" data-testid={`btn-variants-${p.id}`}>
                                <Layers className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { setEditing(p); setOpen(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" data-testid={`btn-edit-${p.id}`}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { if (confirm(t("confirm_delete"))) deleteMutation.mutate(p.id); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" data-testid={`btn-delete-${p.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* CARD VIEW */}
        {viewMode === "card" && (
          isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-gray-500 font-semibold">{t("no_products")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(p => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow" data-testid={`card-product-${p.id}`}>
                  <div className="h-36 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {p.image?.trim() ? <img src={p.image} alt={p.name} className="w-full h-full object-contain" /> : <ImageOff className="w-8 h-8 text-gray-200" />}
                  </div>
                  <div className="p-3">
                    <p className="text-gray-800 font-semibold text-xs truncate">{p.name}</p>
                    <p className="text-blue-700 font-bold text-sm mt-1">{formatCurrency(parseFloat(p.price.toString()))}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${p.stock === 0 ? "bg-red-50 text-red-600 border-red-200" : p.stock <= (p.minStock ?? 3) ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{p.stock}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(p); setOpen(true); }} className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" data-testid={`btn-card-edit-${p.id}`}>
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => { if (confirm(t("confirm_delete"))) deleteMutation.mutate(p.id); }}
                          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" data-testid={`btn-card-delete-${p.id}`}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Add/Edit Dialog */}
        {open && (
          <Dialog open onOpenChange={o => { if (!o) { setOpen(false); setEditing(null); } }}>
            <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl" dir={dir}>
              <DialogHeader className="border-b border-gray-100 pb-3">
                <DialogTitle className="text-gray-900 font-bold">
                  {editing ? `${t("edit_product")}: ${editing.name}` : t("add_product")}
                </DialogTitle>
              </DialogHeader>
              <ProductFormDialog
                initial={editing ? fromProduct(editing) : EMPTY_FORM}
                onSave={handleSave}
                onCancel={() => { setOpen(false); setEditing(null); }}
                loading={isMutating}
                categories={categories}
                brands={brands}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Variants Dialog */}
        {variantsProduct && (
          <ProductVariantsDialog product={variantsProduct} onClose={() => setVariantsProduct(null)} />
        )}
      </div>
    </AdminLayout>
  );
}
