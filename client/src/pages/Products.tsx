import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, SlidersHorizontal, Smartphone } from "lucide-react";
import { Product, Category, Brand } from "@shared/schema";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const sortOptions = [
  { value: "newest",     label: "الأحدث" },
  { value: "price-asc",  label: "السعر ↑" },
  { value: "price-desc", label: "السعر ↓" },
  { value: "name",       label: "الاسم أ-ي" },
];

const CONDITION_OPTIONS = [
  { value: "",            label: "الكل" },
  { value: "new",         label: "جديد" },
  { value: "used",        label: "مستعمل" },
  { value: "refurbished", label: "مجدد" },
];

function parseParam(loc: string, key: string) {
  return new URLSearchParams(loc.split("?")[1] || "").get(key) || "";
}

interface ChipProps { label: string; active: boolean; onClick: () => void; count?: number; }
function Chip({ label, active, onClick, count }: ChipProps) {
  return (
    <button onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600"
      }`}>
      {label}
      {count !== undefined && (
        <span className={`text-[10px] leading-none ${active ? "opacity-70" : "text-gray-400"}`}>
          ({count})
        </span>
      )}
    </button>
  );
}

export default function Products() {
  const [location] = useLocation();
  const [search, setSearch]       = useState(parseParam(location, "search"));
  const [catFilter, setCatFilter] = useState(parseParam(location, "category"));
  const [brandFilter, setBrandFilter] = useState(parseParam(location, "brand"));
  const [condFilter, setCondFilter]   = useState(parseParam(location, "condition"));
  const [typeFilter, setTypeFilter]   = useState(parseParam(location, "type"));
  const [offersOnly, setOffersOnly]   = useState(parseParam(location, "offers") === "true");
  const [sort, setSort]           = useState("newest");
  const [priceMax, setPriceMax]   = useState(500000);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: brands = [] }    = useQuery<Brand[]>({ queryKey: ["/api/brands"] });

  useEffect(() => {
    const p = new URLSearchParams(location.split("?")[1] || "");
    setSearch(p.get("search") || "");
    setCatFilter(p.get("category") || "");
    setBrandFilter(p.get("brand") || "");
    const cond = p.get("condition") || "";
    setCondFilter(cond === "used" ? "used" : cond);
    setTypeFilter(p.get("type") || "");
    setOffersOnly(p.get("offers") === "true");
  }, [location]);

  const clearAll = () => {
    setCatFilter(""); setBrandFilter(""); setCondFilter(""); setTypeFilter("");
    setOffersOnly(false); setSearch(""); setPriceMax(500000);
  };

  const activeCount = [catFilter, brandFilter, condFilter, typeFilter].filter(Boolean).length + (offersOnly ? 1 : 0);

  const pub = useMemo(() => products.filter(p => p.published), [products]);

  const filtered = useMemo(() => {
    let list = [...pub];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q));
    }
    if (catFilter) {
      const cat = categories.find(c => c.slug === catFilter);
      if (cat) list = list.filter(p => p.categoryId === cat.id);
    }
    if (brandFilter) {
      const br = brands.find(b => (b.slug ?? b.name.toLowerCase()) === brandFilter);
      if (br) list = list.filter(p => p.brandId === br.id);
    }
    if (condFilter === "used") list = list.filter(p => p.condition !== "new");
    else if (condFilter)       list = list.filter(p => p.condition === condFilter);
    if (typeFilter) {
      const types = typeFilter.split(",");
      list = list.filter(p => types.includes(p.productType ?? ""));
    }
    if (offersOnly) list = list.filter(p => p.originalPrice && parseFloat(p.originalPrice as string) > parseFloat(p.price as string));
    list = list.filter(p => parseFloat(p.price as string) <= priceMax);
    switch (sort) {
      case "price-asc":  return list.sort((a, b) => parseFloat(a.price as string) - parseFloat(b.price as string));
      case "price-desc": return list.sort((a, b) => parseFloat(b.price as string) - parseFloat(a.price as string));
      case "name":       return list.sort((a, b) => a.name.localeCompare(b.name, "ar"));
      default:           return list.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    }
  }, [pub, search, catFilter, brandFilter, condFilter, typeFilter, offersOnly, priceMax, sort, categories, brands]);

  const pageTitle =
    offersOnly       ? "🔥 العروض والتخفيضات"
    : condFilter === "used" ? "📱 هواتف مستعملة"
    : typeFilter === "phone" ? "هواتف"
    : typeFilter === "tablet" ? "أجهزة لوحية"
    : typeFilter === "accessory" ? "إكسسوارات"
    : catFilter ? (categories.find(c => c.slug === catFilter)?.name ?? "منتجات")
    : brandFilter ? (brands.find(b => (b.slug ?? b.name.toLowerCase()) === brandFilter)?.name ?? "منتجات")
    : "جميع المنتجات";

  const quickChips = [
    { label: "الكل",           active: !catFilter && !condFilter && !typeFilter && !offersOnly && !brandFilter, onClick: clearAll },
    { label: "جديد",           active: condFilter === "new" && !typeFilter, onClick: () => { setCondFilter("new"); setTypeFilter(""); setCatFilter(""); } },
    { label: "مستعمل",        active: condFilter === "used" && !typeFilter, onClick: () => { setCondFilter("used"); setTypeFilter(""); setCatFilter(""); } },
    { label: "هواتف",          active: typeFilter === "phone" && !condFilter, onClick: () => { setTypeFilter("phone"); setCondFilter(""); setCatFilter(""); } },
    { label: "إكسسوارات",     active: typeFilter === "accessory", onClick: () => { setTypeFilter("accessory"); setCondFilter(""); setCatFilter(""); } },
    { label: "🔥 عروض",       active: offersOnly, onClick: () => { setOffersOnly(!offersOnly); } },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16" dir="rtl">

      {/* ── PAGE HEADER ── */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Row 1: title + search + controls */}
          <div className="flex items-center gap-3 py-3">
            <div className="flex-shrink-0">
              <h1 className="text-base font-black text-gray-900 leading-none">{pageTitle}</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">{filtered.length} نتيجة</p>
            </div>

            {/* Search (desktop) */}
            <div className="relative flex-1 hidden sm:block max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ابحث..."
                className="pr-8 h-8 rounded-full border-gray-200 focus:border-blue-400 bg-gray-50 text-xs"
                data-testid="input-product-search" />
            </div>

            <div className="flex items-center gap-2 mr-auto">
              {/* Sort */}
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="h-8 px-2.5 border border-gray-200 rounded-full text-xs bg-white text-gray-600 focus:border-blue-400 outline-none cursor-pointer"
                data-testid="select-sort">
                {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {/* Filter button */}
              <button onClick={() => setFilterOpen(true)}
                className={`h-8 px-3 flex items-center gap-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activeCount > 0 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}
                data-testid="button-filter">
                <SlidersHorizontal className="w-3 h-3" />
                فلاتر
                {activeCount > 0 && <span className="w-4 h-4 rounded-full bg-white/25 text-white text-[9px] flex items-center justify-center font-black">{activeCount}</span>}
              </button>
            </div>
          </div>

          {/* Row 2: Quick chips */}
          <div className="flex gap-2 pb-2.5 overflow-x-auto scrollbar-none -mx-1 px-1">
            {quickChips.map((c, i) => <Chip key={i} {...c} />)}
            {/* Brand chips if brand filter active, show clear */}
            {brandFilter && (
              <Chip label={`× ${brands.find(b => (b.slug ?? b.name.toLowerCase()) === brandFilter)?.name ?? brandFilter}`}
                active onClick={() => setBrandFilter("")} />
            )}
            {catFilter && (
              <Chip label={`× ${categories.find(c => c.slug === catFilter)?.name ?? catFilter}`}
                active onClick={() => setCatFilter("")} />
            )}
          </div>

          {/* Mobile search */}
          <div className="sm:hidden pb-2.5 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="pr-8 rounded-full border-gray-200 focus:border-blue-400 bg-gray-50 text-sm h-9"
              data-testid="input-product-search-mobile" />
          </div>
        </div>
      </div>

      {/* ── PRODUCTS GRID ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <Skeleton className="aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Smartphone className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-base font-bold text-gray-600 mb-1.5">لا توجد نتائج</h3>
            <p className="text-sm text-gray-400 mb-5">جرب تغيير الفلاتر أو عبارة البحث</p>
            <Button onClick={clearAll} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs px-6">
              عرض جميع المنتجات
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${catFilter}|${brandFilter}|${condFilter}|${typeFilter}|${search}|${sort}|${offersOnly}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── FILTER DRAWER ── */}
      <AnimatePresence>
        {filterOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setFilterOpen(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 bg-white z-50 w-72 shadow-2xl flex flex-col" dir="rtl">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm">الفلاتر</h3>
                <div className="flex items-center gap-2">
                  {activeCount > 0 && <button onClick={clearAll} className="text-xs text-red-500 font-semibold hover:text-red-700">مسح الكل</button>}
                  <button onClick={() => setFilterOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Condition */}
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">الحالة</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CONDITION_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => setCondFilter(o.value)}
                        className={`py-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                          condFilter === o.value ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 bg-white"
                        }`}>{o.label}</button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">الفئة</h4>
                  <div className="space-y-0.5">
                    <button onClick={() => setCatFilter("")}
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs font-medium transition-all ${!catFilter ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-blue-50"}`}>
                      جميع الفئات
                    </button>
                    {categories.map(cat => {
                      const cnt = pub.filter(p => p.categoryId === cat.id).length;
                      return (
                        <button key={cat.id} onClick={() => setCatFilter(cat.slug)}
                          className={`w-full text-right px-3 py-2 rounded-xl text-xs font-medium transition-all flex justify-between ${catFilter === cat.slug ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-blue-50"}`}>
                          {cat.name}
                          <span className={`text-[9px] rounded-full px-1.5 ${catFilter === cat.slug ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"}`}>{cnt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Brands */}
                {brands.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">الماركة</h4>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => setBrandFilter("")}
                        className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${!brandFilter ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:border-blue-300"}`}>الكل</button>
                      {brands.map(b => {
                        const slug = b.slug ?? b.name.toLowerCase();
                        return (
                          <button key={b.id} onClick={() => setBrandFilter(slug)}
                            className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${brandFilter === slug ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:border-blue-300"}`}>
                            {b.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Price range */}
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">الحد الأقصى للسعر</h4>
                  <p className="text-blue-600 font-black text-base mb-2">{priceMax.toLocaleString("ar-DZ")} <span className="text-xs font-semibold">دج</span></p>
                  <input type="range" min={0} max={500000} step={5000} value={priceMax}
                    onChange={e => setPriceMax(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1.5" />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>0</span><span>500,000 دج</span></div>
                </div>

                {/* Offers toggle */}
                <button onClick={() => setOffersOnly(!offersOnly)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all ${offersOnly ? "bg-red-500 text-white border-red-500" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-red-300"}`}>
                  🔥 عروض وتخفيضات فقط
                </button>
              </div>

              <div className="p-3 border-t border-gray-100">
                <button onClick={() => setFilterOpen(false)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors">
                  عرض {filtered.length} منتج
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
