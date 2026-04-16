import { Link } from "wouter";
import { Heart, Phone, MessageCircle, MapPin, Instagram, Facebook } from "lucide-react";
import { motion } from "framer-motion";

const STORE_PHONE = "0555123456";
function whatsapp(msg?: string) {
  const num = STORE_PHONE.replace(/^0/, "213");
  return `https://wa.me/${num}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
}

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-300 pt-16 pb-8" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link href="/">
              <div className="flex items-center gap-3 mb-5 cursor-pointer">
                <div className="h-12 rounded-xl overflow-hidden border border-gray-700 bg-white shadow-sm" style={{ width: 160 }}>
                  <img src="/logo.jpg" alt="MALAGA PHONE" className="w-full h-full object-cover" />
                </div>
              </div>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              متجرك الأول للهواتف الذكية والإكسسوارات في الجزائر. هواتف جديدة ومستعملة معتمدة. توصيل لجميع الولايات الـ58.
            </p>
            <div className="flex items-center gap-2">
              {[Instagram, Facebook].map((Icon, i) => (
                <motion.a key={i} href="#" whileHover={{ scale: 1.15, y: -2 }}
                  className="w-9 h-9 bg-gray-800 hover:bg-blue-600 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <Icon className="w-4 h-4" />
                </motion.a>
              ))}
              <motion.a href={whatsapp()} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.15, y: -2 }}
                className="w-9 h-9 bg-gray-800 hover:bg-green-600 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all">
                <MessageCircle className="w-4 h-4" />
              </motion.a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-bold mb-5">روابط سريعة</h4>
            <ul className="flex flex-col gap-3">
              {[
                { label: "الرئيسية", href: "/" },
                { label: "جميع المنتجات", href: "/products" },
                { label: "هواتف جديدة", href: "/products?type=phone&condition=new" },
                { label: "هواتف مستعملة", href: "/products?condition=used" },
                { label: "العروض والتخفيضات", href: "/products?offers=true" },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-sm text-gray-400 hover:text-blue-400 cursor-pointer transition-all flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-blue-600" />
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-bold mb-5">الفئات</h4>
            <ul className="flex flex-col gap-3">
              {[
                { label: "هواتف Apple iPhone", href: "/products?brand=apple" },
                { label: "هواتف Samsung", href: "/products?brand=samsung" },
                { label: "شواحن وكابلات", href: "/products?category=chargers" },
                { label: "سماعات", href: "/products?category=earphones" },
                { label: "حافظات وحماية", href: "/products?category=cases" },
                { label: "ساعات ذكية", href: "/products?category=smart-watches" },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-sm text-gray-400 hover:text-blue-400 cursor-pointer transition-all flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-blue-600" />
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-5">تواصل معنا</h4>
            <ul className="flex flex-col gap-4 mb-5">
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Phone className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>{STORE_PHONE}</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <MessageCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <a href={whatsapp("مرحباً")} target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">واتساب متاح دائماً</a>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>الجزائر — توصيل لجميع الولايات</span>
              </li>
            </ul>
            <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl space-y-1.5">
              <p className="text-blue-400 text-xs font-bold">✓ الدفع عند الاستلام</p>
              <p className="text-blue-400 text-xs font-bold">✓ ضمان على جميع المنتجات</p>
              <p className="text-gray-500 text-xs">لجميع ولايات الجزائر الـ58</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">© 2026 MALAGA PHONE | جميع الحقوق محفوظة</p>
          <p className="text-sm text-gray-500 flex items-center gap-1">صُنع بـ <Heart className="w-4 h-4 text-red-500 fill-red-500 mx-1" /> في الجزائر</p>
        </div>
      </div>
    </footer>
  );
}
