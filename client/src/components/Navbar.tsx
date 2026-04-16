import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Menu, X, MessageCircle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

const STORE_PHONE = "0555123456";

function whatsapp(msg?: string) {
  const num = STORE_PHONE.replace(/^0/, "213");
  return `https://wa.me/${num}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
}

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
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 30 || window.innerWidth < 1024);
    update();
    window.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery("");
      setMenuOpen(false);
    }
  };

  const bg = scrolled ? "bg-white/98 backdrop-blur-xl shadow-lg shadow-blue-900/6 border-b border-gray-100" : "bg-transparent";
  const textColor = scrolled ? "text-gray-700" : "text-white";
  const activeColor = "text-blue-600";

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${bg}`}
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[66px]">
            {/* Logo */}
            <Link href="/">
              <motion.div whileHover={{ scale: 1.04 }} className="flex items-center gap-2 cursor-pointer">
                <div className={`h-10 rounded-xl overflow-hidden border transition-all shadow-sm ${scrolled ? "border-gray-200 bg-white" : "border-white/30 bg-white/95"}`} style={{ width: 180 }}>
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
                        active ? `${activeColor} bg-blue-50` : `${textColor} hover:text-blue-600 hover:bg-blue-50/60`
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
                className={`p-2.5 rounded-xl transition-all ${scrolled ? "text-gray-600 hover:bg-blue-50 hover:text-blue-600" : "text-white/80 hover:bg-white/15 hover:text-white"}`}
                data-testid="button-search"
              >
                <Search className="w-5 h-5" />
              </motion.button>

              {/* WhatsApp button desktop */}
              <a href={whatsapp("مرحباً، أريد الاستفسار عن منتج")} target="_blank" rel="noopener noreferrer"
                className="hidden lg:flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-green-500/25"
                data-testid="button-whatsapp-nav">
                <MessageCircle className="w-4 h-4" />
                واتساب
              </a>

              {/* Mobile menu button */}
              <button
                className={`lg:hidden p-2.5 rounded-xl transition-all ${scrolled ? "text-gray-600 hover:bg-gray-100" : "text-white/80 hover:bg-white/15"}`}
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
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <span onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium cursor-pointer transition-all text-sm">
                      {link.label}
                    </span>
                  </Link>
                ))}
                <a href={whatsapp("مرحباً، أريد الاستفسار عن منتج")} target="_blank" rel="noopener noreferrer"
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
