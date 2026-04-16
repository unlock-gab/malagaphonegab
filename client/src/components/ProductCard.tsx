import { motion } from "framer-motion";
import { Smartphone, Headphones, Watch, Battery, HardDrive, MessageCircle, Zap } from "lucide-react";
import { Product } from "@shared/schema";
import { useState } from "react";
import { useLocation } from "wouter";

const STORE_PHONE = "0555123456";
function waLink(product: Product) {
  const num = STORE_PHONE.replace(/^0/, "213");
  const msg = `مرحباً، أريد الاستفسار عن: ${product.name} — ${parseFloat(product.price as string).toLocaleString("ar-DZ")} دج`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

const CONDITION: Record<string, { label: string; color: string; dot: string }> = {
  new:             { label: "جديد",         color: "bg-emerald-500/90 text-white", dot: "bg-emerald-400" },
  used_good:       { label: "مستعمل جيد",   color: "bg-sky-500/90 text-white",     dot: "bg-sky-400" },
  used_acceptable: { label: "مستعمل مقبول", color: "bg-amber-500/90 text-white",   dot: "bg-amber-400" },
  refurbished:     { label: "مجدد",         color: "bg-violet-500/90 text-white",  dot: "bg-violet-400" },
};

function Placeholder({ type }: { type?: string | null }) {
  const cls = "w-12 h-12 text-gray-300";
  if (type === "watch")    return <Watch className={cls} />;
  if (type === "earphone") return <Headphones className={cls} />;
  if (type === "accessory") return <Headphones className={cls} />;
  return <Smartphone className={cls} />;
}

function BatteryBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";
  const textColor = value >= 80 ? "text-emerald-600" : value >= 60 ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex items-center gap-2">
      <Battery className={`w-3 h-3 flex-shrink-0 ${textColor}`} />
      <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-[10px] font-bold leading-none ${textColor}`}>{value}%</span>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [, navigate] = useLocation();
  const [imgError, setImgError] = useState(false);

  const price    = parseFloat(product.price as string);
  const oldPrice = product.originalPrice ? parseFloat(product.originalPrice as string) : null;
  const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
  const isPhone  = product.productType === "phone" || product.productType === "tablet";
  const isUsed   = product.condition !== "new";
  const cond     = CONDITION[product.condition ?? "new"] ?? CONDITION.new;
  const outOfStock = product.stock === 0;
  const lowStock   = !outOfStock && product.stock <= (product.minStock ?? 3);
  const hasImage   = !imgError && !!(product.image?.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.035, 0.25) }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className={`group relative bg-white rounded-2xl overflow-hidden border border-gray-100/80 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200 cursor-pointer flex flex-col ${outOfStock ? "opacity-60" : ""}`}
      data-testid={`card-product-${product.id}`}
      onClick={() => navigate(`/products/${product.id}`)}
    >
      {/* ── IMAGE ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100/60"
        style={{ paddingBottom: "100%", height: 0 }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {hasImage ? (
            <img
              src={product.image!}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-contain p-2.5 group-hover:scale-[1.03] transition-transform duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 opacity-30">
              <Placeholder type={product.productType} />
            </div>
          )}
        </div>

        {/* Top-right badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {discount > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow leading-none">-{discount}%</span>
          )}
          {product.featured && !discount && (
            <span className="bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow leading-none">★</span>
          )}
        </div>

        {/* Condition badge — top-left */}
        <div className="absolute top-2 left-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow leading-none backdrop-blur-sm ${cond.color}`}>
            {cond.label}
          </span>
        </div>

        {/* Out-of-stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg">نفد من المخزون</span>
          </div>
        )}

        {/* Hover overlay CTA */}
        {!outOfStock && (
          <div className="absolute inset-x-2 bottom-2 flex gap-1.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
            <button
              onClick={e => { e.stopPropagation(); navigate(`/products/${product.id}`); }}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-[11px] shadow-md transition-colors"
              data-testid={`button-order-${product.id}`}
            >اطلب الآن</button>
            <a href={waLink(product)} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-green-500 hover:bg-green-400 rounded-xl shadow-md transition-colors"
              data-testid={`button-wa-${product.id}`}>
              <MessageCircle className="w-3.5 h-3.5 text-white" />
            </a>
          </div>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Name */}
        <h3 className="text-[13px] font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors flex-1">
          {product.name}
        </h3>

        {/* Phone specs chips */}
        {isPhone && (product.storageGb || product.ram) && (
          <div className="flex flex-wrap gap-1">
            {product.storageGb && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 bg-gray-100 rounded-md px-1.5 py-0.5 leading-none">
                <HardDrive className="w-2.5 h-2.5" />{product.storageGb}
              </span>
            )}
            {product.ram && (
              <span className="text-[10px] text-gray-500 bg-gray-100 rounded-md px-1.5 py-0.5 leading-none">{product.ram}</span>
            )}
            {product.color && (
              <span className="text-[10px] text-gray-400 bg-gray-50 rounded-md px-1.5 py-0.5 leading-none">{product.color}</span>
            )}
          </div>
        )}

        {/* Battery bar for used phones */}
        {isPhone && isUsed && product.batteryHealth && (
          <BatteryBar value={product.batteryHealth} />
        )}

        {/* Price row */}
        <div className="flex items-end justify-between mt-auto gap-1 pt-1 border-t border-gray-50">
          <div>
            <p className="text-base font-black text-blue-700 leading-none" data-testid={`text-price-${product.id}`}>
              {price.toLocaleString("ar-DZ")}
              <span className="text-[10px] font-semibold text-blue-600 mr-0.5">دج</span>
            </p>
            {oldPrice && (
              <p className="text-[10px] text-gray-400 line-through leading-none mt-0.5">{oldPrice.toLocaleString("ar-DZ")} دج</p>
            )}
          </div>
          {lowStock && (
            <span className="flex items-center gap-0.5 text-[9px] text-orange-500 font-bold leading-none">
              <Zap className="w-2.5 h-2.5" />{product.stock} فقط
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
