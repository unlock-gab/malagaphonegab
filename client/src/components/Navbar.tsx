import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Menu, X, MessageCircle, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useStoreSettings, buildWhatsAppUrl } from "@/hooks/use-store-settings";

const navLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/products", label: "جميع المنتجات" },
  { href: "/products?type=phone&condition=new", label: "هواتف جديدة" },
  { href: "/products?condition=used", label: "هواتف مستعملة" },
  { href: "/products?type=accessory", label: "إكسسوارات" },
  { href: "/products?offers=true", label: "العروض" },
];

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const settings = useStoreSettings();

  const phone1 = settings.storePhone || "";
  const phone2 = settings.storePhone2 || "";
  const waPhone = settings.whatsappNumber || phone1 || "0555123456";
  const wa = (msg?: string) => buildWhatsAppUrl(waPhone, msg);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery("");
      setMenuOpen(false);
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/98 backdrop-blur-xl shadow-sm border-b border-gray-100"
        dir="rtl"
      >
        {/* ── Top phone bar ─────────────────────────────────────────────── */}
        {(phone1 || phone2) && (
          <div className="border-b border-gray-100 bg-gray-50/60 px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-end gap-4 py-1.5">
              {phone1 && (
                <a href={`tel:${phone1}`}
                  className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  data-testid="link-phone1">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100">
                    <Phone className="w-3 h-3" />
                  </span>
                  <span className="font-mono tracking-wide">{phone1}</span>
                </a>
              )}
              {phone2 && (
                <a href={`tel:${phone2}`}
                  className="flex items-center gap-1.5 text-sm font-bold text-amber-500 hover:text-amber-600 transition-colors"
                  data-testid="link-phone2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100">
                    <Phone className="w-3 h-3" />
                  </span>
                  <span className="font-mono tracking-wide">{phone2}</span>
                </a>
              )}
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[66px]">
            {/* Logo */}
            <Link href="/">
              <motion.div whileHover={{ scale: 1.04 }} className="flex items-center gap-2 cursor-pointer">
                <div className="h-10 rounded-xl overflow-hidden border border-gray-200 bg-white transition-all shadow-sm" style={{ width: 180 }}>
                  <img src="/logo.jpg" alt="MALAGA PHONE" className="w-full h-full object-contain" />
                </div>
              </motion.div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-0.5">
              {navLinks.map((link) => {
                const active = link.href === "/" ? location === "/" : location.startsWith(link.href.split("?")[0]) && link.href !== "/";
                return (
                  <Link key={link.href} href={link.href}>
                    <motion.span
                      whileHover={{ y: -1 }}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer block ${
                        active ? "text-blue-600 bg-blue-50" : "text-gray-700 hover:text-blue-600 hover:bg-blue-50/60"
                      }`}
                    >
                      {link.label}
                      {link.label === "العروض" && (
                        <span className="mr-1 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">جديد</span>
                      )}
                    </motion.span>
                  </Link>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setSearchOpen(true)}
                className="p-2.5 rounded-xl transition-all text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                data-testid="button-search"
              >
                <Search className="w-5 h-5" />
              </motion.button>

              {/* WhatsApp button desktop */}
              <a href={wa("مرحباً، أريد الاستفسار عن منتج")} target="_blank" rel="noopener noreferrer"
                className="hidden lg:flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-green-500/25"
                data-testid="button-whatsapp-nav">
                <MessageCircle className="w-4 h-4" />
                واتساب
              </a>

              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2.5 rounded-xl transition-all text-gray-600 hover:bg-gray-100"
                onClick={() => setMenuOpen(!menuOpen)}
                data-testid="button-mobile-menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-gray-100 shadow-xl overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {/* Mobile search */}
                <form onSubmit={handleSearch} className="relative mb-3">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن هاتف أو إكسسوار..."
                    className="pr-10 rounded-xl border-gray-200 focus:border-blue-400 bg-gray-50"
                    data-testid="input-mobile-search"
                  />
                </form>

                {/* Mobile phone numbers */}
                {(phone1 || phone2) && (
                  <div className="flex gap-2 mb-2">
                    {phone1 && (
                      <a href={`tel:${phone1}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-xl text-sm"
                        data-testid="link-mobile-phone1">
                        <Phone className="w-4 h-4" />{phone1}
                      </a>
                    )}
                    {phone2 && (
                      <a href={`tel:${phone2}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-50 border border-amber-200 text-amber-600 font-bold rounded-xl text-sm"
                        data-testid="link-mobile-phone2">
                        <Phone className="w-4 h-4" />{phone2}
                      </a>
                    )}
                  </div>
                )}

                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <span onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium cursor-pointer transition-all text-sm">
                      {link.label}
                    </span>
                  </Link>
                ))}
                <a href={wa("مرحباً، أريد الاستفسار عن منتج")} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 bg-green-500 text-white font-bold rounded-xl text-sm mt-2">
                  <MessageCircle className="w-4 h-4" /> تواصل معنا واتساب
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-28 px-4"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: -20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl"
            >
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن هاتف، ماركة، إكسسوار..."
                  className="w-full h-16 text-lg pr-14 pl-6 rounded-2xl border-2 border-blue-300 focus:border-blue-500 shadow-2xl bg-white"
                  data-testid="input-search"
                />
              </form>
              <p className="text-white/60 text-sm text-center mt-3">اضغط Enter للبحث أو ESC للإغلاق</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
