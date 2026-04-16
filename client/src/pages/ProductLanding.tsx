import { useState, useRef, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CheckCircle, Shield, Truck, Zap,
  Clock, Play, Package, BadgeCheck,
  Users, ThumbsUp, Flame
} from "lucide-react";
import { Product } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import OrderForm from "@/components/OrderForm";
import { Link } from "wouter";

function ImageGallery({ images, name }: { images: string[]; mainImage: string; name: string }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="flex flex-col w-full">
      {images.map((img, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          className="w-full"
        >
          <img
            src={img}
            alt={`${name} ${i + 1}`}
            className="w-full h-auto block"
          />
        </motion.div>
      ))}
    </div>
  );
}

export default function ProductLanding() {
  const [, params] = useRoute("/landing/:id");
  const orderFormRef = useRef<HTMLDivElement>(null);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const el = orderFormRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFormVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToForm = () => {
    orderFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", params?.id],
    enabled: !!params?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 to-fuchsia-950 flex items-center justify-center">
        <div className="space-y-4 w-full max-w-lg px-4">
          <Skeleton className="h-72 rounded-3xl bg-white/10" />
          <Skeleton className="h-8 w-3/4 bg-white/10" />
          <Skeleton className="h-48 bg-white/10 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 to-fuchsia-950 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">المنتج غير موجود</h2>
          <Link href="/products"><span className="underline cursor-pointer">تصفح المنتجات</span></Link>
        </div>
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round((1 - parseFloat(product.price as string) / parseFloat(product.originalPrice as string)) * 100)
    : 0;

  const benefits = product.landingBenefits && product.landingBenefits.length > 0
    ? product.landingBenefits
    : ["جودة معتمدة", "توصيل سريع", "دفع عند الاستلام"];

  const landingImages = product.landingImages || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-950" dir="rtl">

      {/* الصور أولاً بدون أي فراغ */}
      <ImageGallery images={landingImages} mainImage={product.image} name={product.name} />

      <div className="max-w-lg mx-auto px-4 pb-6 space-y-6 pt-5">

        {/* نموذج الطلب مباشرة بعد الصور */}
        <motion.div ref={orderFormRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl shadow-2xl shadow-black/40 p-5">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-sm font-bold mb-2">
              <Flame className="w-4 h-4" />
              لا تفوّت الفرصة
            </div>
            <h3 className="text-xl font-black text-gray-900">احجز طلبك الآن 📦</h3>
            <p className="text-gray-500 text-sm mt-1">الدفع عند الاستلام — توصيل لكل ولايات الجزائر</p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="text-3xl font-black text-green-600">{parseFloat(product.price as string).toLocaleString("ar-DZ")} دج</span>
              {product.originalPrice && (
                <>
                  <span className="text-gray-400 line-through text-lg">{parseFloat(product.originalPrice as string).toLocaleString("ar-DZ")} دج</span>
                  {discount > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">-{discount}%</span>}
                </>
              )}
            </div>
          </div>
          <OrderForm product={product} source="landing" idPrefix="landing-bottom-" />
          <div className="flex items-center justify-center gap-5 mt-5 pt-4 border-t border-gray-100">
            {[
              { icon: Shield, label: "دفع آمن" },
              { icon: Truck, label: "توصيل سريع" },
              { icon: Clock, label: "خدمة 7/7" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 text-gray-400">
                <f.icon className="w-4 h-4" />
                <span className="text-xs font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {product.landingHook && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center">
            <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 px-4 py-1.5 rounded-full text-sm font-bold mb-3">
              <Zap className="w-4 h-4 fill-yellow-400" />
              اطلب الآن واستفد من العرض
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
              {product.landingHook}
            </h1>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-2">
          {benefits.map((benefit, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <p className="text-white text-sm font-semibold leading-tight">{benefit}</p>
            </div>
          ))}
        </motion.div>

        {product.landingDescription && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-violet-300" />
              <h3 className="text-white font-bold">تفاصيل المنتج</h3>
            </div>
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">{product.landingDescription}</p>
          </motion.div>
        )}

        {product.landingVideoUrl && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl overflow-hidden border border-white/20">
            <div className="bg-black/30 p-3 flex items-center gap-2">
              <Play className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-sm font-medium">مشاهدة الفيديو</span>
            </div>
            <div className="aspect-video">
              <iframe
                src={product.landingVideoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, value: "+2000", label: "زبون راضي" },
            { icon: BadgeCheck, value: "100%", label: "منتج أصلي" },
            { icon: ThumbsUp, value: "100%", label: "دفع عند الاستلام" },
          ].map((stat, i) => (
            <div key={i} className="bg-white/10 border border-white/20 rounded-xl p-3 text-center">
              <stat.icon className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <div className="text-white font-black text-lg leading-tight">{stat.value}</div>
              <div className="text-white/60 text-xs">{stat.label}</div>
            </div>
          ))}
        </motion.div>


        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 border border-fuchsia-500/30 rounded-2xl p-5">
          <div className="text-center mb-4">
            <Truck className="w-8 h-8 text-fuchsia-300 mx-auto mb-2" />
            <h4 className="text-white font-bold text-lg">التوصيل لكل الجزائر</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "توصيل للمنزل", desc: "خلال 3-5 أيام" },
              { label: "توصيل للمكتب", desc: "خلال 2-3 أيام" },
              { label: "دفع عند الاستلام", desc: "بدون مخاطرة" },
              { label: "ضمان الجودة", desc: "أو استرداد المبلغ" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-semibold text-xs">{item.label}</div>
                  <div className="text-white/60 text-xs">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-center text-white/30 text-xs pb-24">
          © {new Date().getFullYear()} ZoraBio — مكملات غذائية أصلية
        </p>

      </div>

      <motion.div
        className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4"
        animate={{ opacity: formVisible ? 0 : 1, y: formVisible ? 20 : 0, pointerEvents: formVisible ? "none" : "auto" }}
        transition={{ duration: 0.3 }}
      >
        <motion.button
          onClick={scrollToForm}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-bold text-sm px-6 py-3 rounded-full shadow-xl shadow-green-900/50"
        >
          <span>📦</span>
          اطلب الآن — الدفع عند الاستلام
        </motion.button>
      </motion.div>

    </div>
  );
}
