import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronLeft, Shield, Truck, MessageCircle, ShoppingBag,
  Battery, HardDrive, Cpu, Monitor, Camera, Wifi, CreditCard,
  CheckCircle2, Info, Tag,
} from "lucide-react";
import { Product, Category, Brand } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import ProductCard from "@/components/ProductCard";
import OrderForm from "@/components/OrderForm";
import { useState } from "react";

const STORE_PHONE = "0555123456";

function waLink(product: Product, extra?: string) {
  const num = STORE_PHONE.replace(/^0/, "213");
  const msg = [
    `مرحباً، أريد الاستفسار عن:`,
    `📱 ${product.name}`,
    `💰 السعر: ${parseFloat(product.price as string).toLocaleString("ar-DZ")} دج`,
    extra ? extra : "",
  ].filter(Boolean).join("\n");
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

const CONDITION_CFG: Record<string, { label: string; cls: string; desc: string }> = {
  new:             { label: "جديد",         cls: "bg-emerald-100 text-emerald-700 border-emerald-200", desc: "جهاز جديد بعبوته الأصلية وضمان كامل" },
  used_good:       { label: "مستعمل جيد",   cls: "bg-blue-100 text-blue-700 border-blue-200",         desc: "الجهاز في حالة ممتازة، علامات استخدام بسيطة جداً" },
  used_acceptable: { label: "مستعمل مقبول", cls: "bg-amber-100 text-amber-700 border-amber-200",      desc: "يعمل بشكل ممتاز، قد يوجد خدوش خفيفة على الهيكل" },
  refurbished:     { label: "مجدد",         cls: "bg-purple-100 text-purple-700 border-purple-200",   desc: "جهاز مجدد ومفحوص بالكامل من قبل الفريق التقني" },
};

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const [selectedImage, setSelectedImage] = useState(0);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", params?.id],
    enabled: !!params?.id,
  });
  const { data: allProducts = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: brands = [] } = useQuery<Brand[]>({ queryKey: ["/api/brands"] });

  const related = allProducts.filter(p => p.published && p.categoryId === product?.categoryId && p.id !== product?.id).slice(0, 4);
  const category = categories.find(c => c.id === product?.categoryId);
  const brand = brands.find(b => b.id === product?.brandId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <Skeleton className="aspect-square rounded-3xl" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">المنتج غير موجود</h2>
          <Link href="/products">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">تصفح المنتجات</Button>
          </Link>
        </div>
      </div>
    );
  }

  const price = parseFloat(product.price as string);
  const oldPrice = product.originalPrice ? parseFloat(product.originalPrice as string) : null;
  const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

  const isPhone = product.productType === "phone" || product.productType === "tablet";
  const isUsed = product.condition !== "new";
  const condCfg = CONDITION_CFG[product.condition ?? "new"] ?? CONDITION_CFG.new;
  const outOfStock = product.stock === 0;

  // Build phone specs list
  const phoneSpecs = [
    product.processor     && { icon: Cpu,      label: "المعالج",        value: product.processor },
    product.screenSize    && { icon: Monitor,   label: "حجم الشاشة",    value: product.screenSize },
    product.ram           && { icon: HardDrive, label: "الرام",         value: product.ram },
    product.storageGb     && { icon: HardDrive, label: "التخزين",       value: product.storageGb },
    product.camera        && { icon: Camera,    label: "الكاميرا الخلفية", value: product.camera },
    product.frontCamera   && { icon: Camera,    label: "الكاميرا الأمامية", value: product.frontCamera },
    product.connectivity  && { icon: Wifi,      label: "الاتصال",       value: product.connectivity },
    product.simType       && { icon: CreditCard, label: "بطاقة SIM",     value: product.simType },
    product.operatingSystem && { icon: Info,    label: "نظام التشغيل",  value: product.operatingSystem },
  ].filter(Boolean) as { icon: any; label: string; value: string }[];

  const scrollToForm = () => document.getElementById("order-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Images: main + any additional
  const images = [product.image, ...(product.images ?? [])].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 lg:pb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-8 flex-wrap">
          <Link href="/"><span className="hover:text-blue-600 cursor-pointer transition-colors">الرئيسية</span></Link>
          <ChevronLeft className="w-3.5 h-3.5" />
          <Link href="/products"><span className="hover:text-blue-600 cursor-pointer transition-colors">المنتجات</span></Link>
          {category && (<><ChevronLeft className="w-3.5 h-3.5" /><Link href={`/products?category=${category.slug}`}><span className="hover:text-blue-600 cursor-pointer transition-colors">{category.name}</span></Link></>)}
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-gray-700 font-medium line-clamp-1 max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
          {/* ── IMAGE GALLERY ── */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
            <div className="relative bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 aspect-square mb-3">
              <motion.img
                key={images[selectedImage]}
                src={images[selectedImage] ?? "/placeholder-phone.svg"}
                alt={product.name}
                className="w-full h-full object-contain p-4"
                initial={{ opacity: 0.7, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              />
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-black px-3 py-1 rounded-xl shadow-lg">-{discount}%</div>
              )}
              {product.badge && (
                <div className="absolute top-4 right-4 bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-xl shadow-lg">{product.badge}</div>
              )}
              {outOfStock && (
                <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center rounded-3xl">
                  <span className="bg-gray-900 text-white font-bold px-6 py-2 rounded-2xl">غير متوفر حالياً</span>
                </div>
              )}
            </div>
            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 justify-center">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`w-14 h-14 rounded-xl border-2 overflow-hidden transition-all ${selectedImage === i ? "border-blue-500 shadow-md" : "border-gray-200 opacity-60 hover:opacity-90"}`}>
                    <img src={img} alt="" className="w-full h-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── PRODUCT INFO ── */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex flex-col">
            {/* Brand + condition */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {brand && (
                <Link href={`/products?brand=${brand.slug ?? brand.name.toLowerCase()}`}>
                  <span className="text-sm font-bold text-blue-600 hover:underline cursor-pointer">{brand.name}</span>
                </Link>
              )}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${condCfg.cls}`}>{condCfg.label}</span>
              {product.featured && <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full border border-amber-200">⭐ مميز</span>}
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 mb-4 leading-tight" data-testid="text-product-name">
              {product.name}
            </h1>

            {/* Condition description */}
            <div className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2 mb-4 ${condCfg.cls.replace("text-", "text-").replace("bg-", "bg-").replace("border-", "border-")} bg-opacity-50`} style={{ backgroundColor: `${condCfg.cls.includes("emerald") ? "#ecfdf5" : condCfg.cls.includes("blue") ? "#eff6ff" : condCfg.cls.includes("amber") ? "#fffbeb" : "#faf5ff"}` }}>
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{condCfg.desc}</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-4xl font-black text-blue-700" data-testid="text-product-price">
                {price.toLocaleString("ar-DZ")} <span className="text-xl font-bold">دج</span>
              </span>
              {oldPrice && (
                <span className="text-xl text-gray-400 line-through">{oldPrice.toLocaleString("ar-DZ")} دج</span>
              )}
            </div>

            {/* Battery health for used phones */}
            {isPhone && isUsed && product.batteryHealth && (
              <div className="mb-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Battery className={`w-4 h-4 ${product.batteryHealth >= 80 ? "text-emerald-600" : product.batteryHealth >= 60 ? "text-amber-500" : "text-red-500"}`} />
                    <span className="text-sm font-bold text-gray-800">صحة البطارية</span>
                  </div>
                  <span className={`text-lg font-black ${product.batteryHealth >= 80 ? "text-emerald-600" : product.batteryHealth >= 60 ? "text-amber-500" : "text-red-500"}`}>
                    {product.batteryHealth}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${product.batteryHealth >= 80 ? "bg-emerald-500" : product.batteryHealth >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${product.batteryHealth}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {product.batteryHealth >= 80 ? "بطارية ممتازة" : product.batteryHealth >= 60 ? "بطارية جيدة" : "بطارية تحتاج تبديل قريباً"}
                </p>
              </div>
            )}

            {/* Quick specs pills */}
            {isPhone && (product.storageGb || product.ram || product.color) && (
              <div className="flex flex-wrap gap-2 mb-5">
                {product.storageGb && <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700"><HardDrive className="w-3.5 h-3.5 text-blue-500" />{product.storageGb} تخزين</span>}
                {product.ram && <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700"><Cpu className="w-3.5 h-3.5 text-blue-500" />{product.ram} رام</span>}
                {product.color && <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700"><Tag className="w-3.5 h-3.5 text-blue-500" />{product.color}</span>}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-gray-600 text-sm leading-relaxed mb-5">{product.description}</p>
            )}

            {/* Stock status */}
            <div className="flex items-center gap-2 mb-5">
              {outOfStock ? (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-red-500"><span className="w-2 h-2 rounded-full bg-red-500" />غير متوفر حالياً</span>
              ) : product.stock <= (product.minStock ?? 3) ? (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-orange-500"><span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />باقي {product.stock} قطع فقط!</span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500" />متوفر في المخزون</span>
              )}
            </div>

            {/* Trust row */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[
                { icon: Truck,         title: "توصيل لكل الجزائر" },
                { icon: Shield,        title: "دفع عند الاستلام" },
                { icon: CheckCircle2,  title: "ضمان معتمد" },
              ].map((f, i) => (
                <div key={i} className="text-center p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                  <f.icon className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <div className="text-[10px] font-bold text-gray-700 leading-tight">{f.title}</div>
                </div>
              ))}
            </div>

            {/* WhatsApp CTA */}
            {!outOfStock && (
              <a href={waLink(product)} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-500/25 transition-all mb-4 text-base"
                data-testid="button-whatsapp-product">
                <MessageCircle className="w-5 h-5" />
                اطلب عبر واتساب
              </a>
            )}

            {/* Order form */}
            {!outOfStock && (
              <div id="order-form-section">
                <div className="border-t border-gray-100 pt-5 mt-1">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-blue-600" /> إتمام الطلب
                  </h3>
                  <OrderForm product={product} source="product" />
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── FULL SPECS TABLE (phones only) ── */}
        {isPhone && phoneSpecs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mb-12 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-3">
              <Cpu className="w-5 h-5 text-white" />
              <h2 className="text-white font-black text-lg">المواصفات الكاملة</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {phoneSpecs.map((spec, i) => (
                <div key={i} className={`flex items-center gap-4 px-6 py-3.5 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}>
                  <spec.icon className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-sm text-gray-500 w-36 shrink-0">{spec.label}</span>
                  <span className="text-sm font-semibold text-gray-800">{spec.value}</span>
                </div>
              ))}
              {product.sku && (
                <div className="flex items-center gap-4 px-6 py-3.5 bg-white">
                  <Tag className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-sm text-gray-500 w-36 shrink-0">رمز المنتج (SKU)</span>
                  <span className="text-sm font-mono font-semibold text-gray-800">{product.sku}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── RELATED PRODUCTS ── */}
        {related.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-black text-gray-900 mb-6">منتجات مشابهة</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── MOBILE STICKY CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-50 p-3 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-2xl">
        <div className="flex items-center gap-2 max-w-md mx-auto">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-400 leading-none">السعر</div>
            <div className="text-lg font-black text-blue-700 leading-tight">{price.toLocaleString("ar-DZ")} دج</div>
          </div>
          <a href={waLink(product)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm shadow">
            <MessageCircle className="w-4 h-4" /> واتساب
          </a>
          {!outOfStock && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={scrollToForm}
              className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-1.5 text-sm"
              data-testid="button-scroll-to-order">
              <ShoppingBag className="w-4 h-4" /> اطلب الآن
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
