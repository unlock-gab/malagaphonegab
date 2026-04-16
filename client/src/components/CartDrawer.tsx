import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Plus, Minus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalPrice, totalItems, clearCart } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-full w-full max-w-md z-50 bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">سلة التسوق</h2>
                  <p className="text-sm text-gray-500">{totalItems} منتج</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs">
                    مسح الكل
                  </Button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-all"
                  data-testid="button-close-cart"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full gap-4 text-center"
                >
                  <div className="w-24 h-24 bg-violet-50 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-12 h-12 text-violet-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">السلة فارغة</h3>
                    <p className="text-sm text-gray-400 mt-1">أضف منتجات لتبدأ التسوق</p>
                  </div>
                  <Button
                    onClick={() => setIsOpen(false)}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl"
                  >
                    تصفح المنتجات
                  </Button>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-4">
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div
                        key={item.productId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        className="flex gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100"
                        data-testid={`cart-item-${item.productId}`}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">{item.name}</h4>
                          <p className="text-violet-600 font-bold text-sm">{item.price.toLocaleString("ar-SA")} ر.س</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-violet-50 hover:border-violet-300 transition-all"
                              data-testid={`button-decrease-${item.productId}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-gray-700">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-violet-50 hover:border-violet-300 transition-all"
                              data-testid={`button-increase-${item.productId}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between">
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            data-testid={`button-remove-${item.productId}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <p className="text-sm font-bold text-gray-700">{(item.price * item.quantity).toLocaleString("ar-SA")}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-5 border-t border-gray-100 bg-gray-50/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">المجموع الفرعي</span>
                  <span className="font-semibold">{totalPrice.toLocaleString("ar-SA")} ر.س</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">الشحن</span>
                  <span className="font-semibold text-green-600">{totalPrice > 299 ? "مجاني" : "30 ر.س"}</span>
                </div>
                <Separator className="mb-4" />
                <div className="flex justify-between items-center mb-5">
                  <span className="text-lg font-bold text-gray-900">الإجمالي</span>
                  <span className="text-lg font-bold text-violet-700">
                    {(totalPrice + (totalPrice > 299 ? 0 : 30)).toLocaleString("ar-SA")} ر.س
                  </span>
                </div>
                <Link href="/checkout">
                  <Button
                    className="w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-violet-500/30"
                    onClick={() => setIsOpen(false)}
                    data-testid="button-checkout"
                  >
                    <span>إتمام الشراء</span>
                    <ArrowLeft className="w-5 h-5 mr-2" />
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
