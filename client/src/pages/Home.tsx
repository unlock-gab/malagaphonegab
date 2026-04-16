import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Truck, Shield, MessageCircle, Smartphone, ChevronLeft,
  Headphones, Zap, Watch, Battery, CheckCircle2, PhoneCall, Star,
} from "lucide-react";
import { Product, Category, Brand } from "@shared/schema";
import ProductCard from "@/components/ProductCard";

import { useStoreSettings, buildWhatsAppUrl } from "@/hooks/use-store-settings";

const CAT_ICONS: Record<string, any> = {
  Smartphone, Headphones, Zap, Watch, Battery, Star,
};

function Appear({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

function SectionHead({ title, sub, href }: { title: string; sub?: string; href?: string }) {
  return (
    <div className="flex items-end justify-between mb-7">
      <div>
        <h2 className="text-2xl sm:text-[1.75rem] font-black text-gray-900 leading-tight">{title}</h2>
        {sub && <p className="text-gray-500 mt-1 text-sm">{sub}</p>}
      </div>
      {href && (
        <Link href={href}>
          <span className="hidden sm:flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-sm cursor-pointer transition-colors">
            عرض الكل <ChevronLeft className="w-4 h-4" />
          </span>
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: brands = [] } = useQuery<Brand[]>({ queryKey: ["/api/brands"] });
  const storeSettings = useStoreSettings();
  const waPhone = storeSettings.whatsappNumber || "0555123456";
  const wa = (msg?: string) => buildWhatsAppUrl(waPhone, msg);

  const published = products.filter(p => p.published);
  const featured   = published.filter(p => p.featured).slice(0, 8);
  const newPhones  = published.filter(p => (p.productType === "phone" || p.productType === "tablet") && p.condition === "new").slice(0, 4);
  const usedPhones = published.filter(p => p.condition !== "new").slice(0, 4);
  const offers     = published.filter(p => p.originalPrice && parseFloat(p.originalPrice as string) > parseFloat(p.price as string)).slice(0, 4);
  const accessories = published.filter(p => p.productType === "accessory").slice(0, 4);

  return (
    <div className="min-h-screen bg-white" dir="rtl">

      {/* ── HERO BANNER ── */}
      {storeSettings.heroBannerImage && (
        <section className="bg-white pt-16">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
            className="w-full">
            <img
              src={storeSettings.heroBannerImage}
              alt="banner"
              className="w-full object-cover"
            />
          </motion.div>
        </section>
      )}

      {/* ── TRUST BAR ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Truck,         title: "توصيل لكل الجزائر",    desc: "58 ولاية — منزل أو مكتب",    color: "text-blue-600 bg-blue-50" },
              { icon: Shield,        title: "الدفع عند الاستلام",    desc: "لا دفع مسبق — آمن 100%",      color: "text-indigo-600 bg-indigo-50" },
              { icon: CheckCircle2,  title: "ضمان معتمد",            desc: "على جميع المنتجات",            color: "text-emerald-600 bg-emerald-50" },
              { icon: MessageCircle, title: "دعم واتساب",            desc: "رد خلال دقائق",               color: "text-green-600 bg-green-50" },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 leading-none mb-0.5">{f.title}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CATEGORIES ── */}
      <Appear className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHead title="تسوق حسب الفئة" sub="اختر الفئة التي تبحث عنها" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.slice(0, 8).map((cat, i) => {
            const Icon = CAT_ICONS[cat.icon] ?? Smartphone;
            return (
              <Link key={cat.id} href={`/products?category=${cat.slug}`}>
                <motion.div whileHover={{ y: -5, scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="group cursor-pointer text-center">
                  <div className="aspect-square rounded-2xl flex items-center justify-center mb-2 border border-gray-100 group-hover:border-blue-200 group-hover:shadow-md transition-all"
                    style={{ background: `linear-gradient(135deg, ${cat.color}15, ${cat.color}25)` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: cat.color }}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-700 group-hover:text-blue-600 transition-colors leading-tight">{cat.name}</p>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </Appear>

      {/* ── FEATURED ── */}
      {featured.length > 0 && (
        <Appear className="py-12 bg-gray-50/70 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHead title="⭐ الأكثر طلباً" sub="أفضل المنتجات اختارها آلاف العملاء" href="/products?featured=true" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        </Appear>
      )}

      {/* ── NEW PHONES ── */}
      {newPhones.length > 0 && (
        <Appear className="py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHead title="🆕 هواتف جديدة" sub="أحدث الموديلات بضمان أصلي" href="/products?type=phone&condition=new" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {newPhones.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        </Appear>
      )}

      {/* ── USED PHONES ── */}
      {usedPhones.length > 0 && (
        <Appear>
          <section className="py-14 bg-gray-50 border-y border-gray-100 relative overflow-hidden">
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-7">
                <div>
                  <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-blue-600 text-xs font-semibold">فحص 30 نقطة ✓</span>
                  </div>
                  <h2 className="text-2xl sm:text-[1.75rem] font-black text-gray-900 leading-tight">📱 هواتف مستعملة</h2>
                  <p className="text-gray-500 mt-1 text-sm">مفحوصة ومعتمدة — سعر منافس وبطارية حقيقية</p>
                </div>
                <Link href="/products?condition=used">
                  <span className="hidden sm:flex items-center gap-1 text-blue-600 hover:text-blue-500 font-semibold text-sm cursor-pointer transition-colors">
                    عرض الكل <ChevronLeft className="w-4 h-4" />
                  </span>
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {usedPhones.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>

              {/* Used phones trust points */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: CheckCircle2, t: "فحص شامل قبل البيع",     d: "30 نقطة فحص على كل جهاز" },
                  { icon: Battery,      t: "صحة البطارية معلنة",      d: "نعلن بصدق عن النسبة الحقيقية" },
                  { icon: Shield,       t: "ضمان بعد البيع",          d: "خدمة ما بعد البيع مضمونة" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <f.icon className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-gray-800 text-sm font-bold">{f.t}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{f.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Appear>
      )}

      {/* ── OFFERS ── */}
      {offers.length > 0 && (
        <Appear className="py-14 bg-gradient-to-br from-orange-50/50 to-red-50/30 border-y border-orange-100/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHead title="🔥 عروض وتخفيضات" sub="أسعار استثنائية لفترة محدودة" href="/products?offers=true" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {offers.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        </Appear>
      )}

      {/* ── ACCESSORIES ── */}
      {accessories.length > 0 && (
        <Appear className="py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHead title="🎧 إكسسوارات" sub="شواحن، سماعات، حافظات، وأكثر" href="/products?type=accessory" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {accessories.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        </Appear>
      )}

      {/* ── BRANDS ── */}
      {brands.length > 0 && (
        <Appear>
          <section className="py-12 border-y border-gray-100 bg-gray-50/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-center text-gray-400 text-xs font-semibold uppercase tracking-widest mb-7">الماركات المتوفرة</p>
              <div className="flex flex-wrap justify-center items-center gap-4">
                {brands.map((b, i) => (
                  <motion.div key={b.id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }} whileHover={{ scale: 1.06 }}>
                    <Link href={`/products?brand=${b.slug ?? b.name.toLowerCase()}`}>
                      <div className="h-10 px-5 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-sm">
                        {b.logo ? (
                          <img src={b.logo} alt={b.name} className="h-6 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
                        ) : (
                          <span className="text-sm font-black text-gray-600 hover:text-blue-700 transition-colors">{b.name}</span>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </Appear>
      )}

      {/* ── WHY US ── */}
      <Appear className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHead title="لماذا تختار MALAGA PHONE؟" sub="نعمل على بناء ثقة عملائنا كل يوم" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { e: "🏆", t: "منتجات أصلية 100%",      d: "هواتف جديدة بعبواتها الأصلية وهواتف مستعملة مفحوصة ومعتمدة من فريقنا التقني." },
              { e: "🚚", t: "توصيل لكل الجزائر",      d: "نوصل لجميع ولايات الجزائر الـ58. توصيل للمنزل أو لمكتب التوصيل." },
              { e: "💳", t: "الدفع عند الاستلام",      d: "ادفع فقط عند استلام طلبك. لا مخاطرة ولا دفع مسبق." },
              { e: "🔋", t: "فحص شامل للمستعمل",       d: "30 نقطة فحص على كل جهاز. نعلن بصدق عن نسبة البطارية والحالة." },
              { e: "💬", t: "دعم واتساب سريع",         d: "نرد على استفساراتك في دقائق. نحن معك قبل وبعد الشراء." },
              { e: "🛡️", t: "ضمان على المنتجات",       d: "ضمان حقيقي على الهواتف الجديدة. شروط واضحة على كل منتج." },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.07 }} whileHover={{ y: -3 }}
                className="p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-100 hover:bg-blue-50/40 hover:shadow-sm transition-all">
                <span className="text-2xl mb-3 block">{f.e}</span>
                <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{f.t}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Appear>

      {/* ── WHATSAPP CTA ── */}
      <section className="py-14 bg-gradient-to-r from-green-700 to-emerald-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 15% 50%, white, transparent 50%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}>
            <MessageCircle className="w-10 h-10 text-white/80 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">تحدث معنا مباشرةً!</h2>
            <p className="text-white/70 mb-7 max-w-lg mx-auto">
              لديك سؤال عن هاتف معين؟ تريد مساعدة في الاختيار؟ فريقنا متاح عبر واتساب.
            </p>
            <a href={wa("مرحباً، أريد مساعدة في اختيار هاتف")} target="_blank" rel="noopener noreferrer">
              <button className="inline-flex items-center gap-2.5 px-8 py-4 bg-white text-green-700 font-black rounded-2xl shadow-xl text-base hover:shadow-2xl transition-all"
                data-testid="button-whatsapp-cta">
                <MessageCircle className="w-5 h-5" /> ابدأ المحادثة
              </button>
            </a>
            <p className="text-white/40 text-xs mt-4 flex items-center justify-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5" />{waPhone}
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
