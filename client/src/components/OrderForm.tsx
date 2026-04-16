import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, Phone, User, MapPin, Truck, MessageCircle, Package } from "lucide-react";
import { ALGERIAN_WILAYAS, Product, DeliveryPrices, DEFAULT_DELIVERY_PRICES } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const STORE_PHONE = "0555123456";
function wa(product: Product, orderId?: string) {
  const n = STORE_PHONE.replace(/^0/, "213");
  const msg = `مرحباً، أرسلت طلباً للمنتج:\n📱 ${product.name}\n💰 ${parseFloat(product.price as string).toLocaleString("ar-DZ")} دج${orderId ? `\n🔖 رقم الطلب: ${orderId}` : ""}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
}

const orderSchema = z.object({
  customerName:  z.string().min(3, "الاسم 3 أحرف على الأقل"),
  customerPhone: z.string().min(9, "رقم الهاتف غير صحيح").max(13),
  wilaya:        z.string().min(1, "اختر الولاية"),
  quantity:      z.number().min(1).max(20),
  notes:         z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderSchema>;

interface OrderFormProps {
  product: Product;
  source?: "product" | "landing";
  idPrefix?: string;
}

export default function OrderForm({ product, source = "product", idPrefix = "" }: OrderFormProps) {
  const { toast } = useToast();
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [abandonedSent, setAbandonedSent] = useState(false);

  const { data: settings = {} } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });
  const deliveryPrices: DeliveryPrices = settings.deliveryPrices ? JSON.parse(settings.deliveryPrices) : DEFAULT_DELIVERY_PRICES;
  const showDeliveryPrice = settings.showDeliveryPrice !== "false";
  const deliveryEnabled = settings.deliveryEnabled !== "false";

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { customerName: "", customerPhone: "", wilaya: "", quantity: 1, notes: "" },
  });

  const quantity       = form.watch("quantity");
  const selectedWilaya = form.watch("wilaya");
  const wilayaDelivery = deliveryEnabled && selectedWilaya ? (deliveryPrices[selectedWilaya] || DEFAULT_DELIVERY_PRICES[selectedWilaya]) : null;
  const deliveryPrice  = wilayaDelivery ? wilayaDelivery.home : 0;
  const productTotal   = parseFloat(product.price as string) * quantity;
  const grandTotal     = productTotal + (deliveryEnabled ? deliveryPrice : 0);
  const canDeliver     = !selectedWilaya || deliveryPrice > 0;

  const captureAbandoned = async (phone: string) => {
    if (!phone || phone.length < 9 || abandonedSent) return;
    const v = form.getValues();
    try {
      await fetch("/api/abandoned-carts", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerPhone: phone, customerName: v.customerName || "", wilaya: v.wilaya || "", productId: String(product.id), productName: product.name, source }) });
      setAbandonedSent(true);
    } catch {}
  };

  const orderMutation = useMutation({
    mutationFn: async (data: OrderFormValues) => {
      const effectiveDelivery = deliveryEnabled ? deliveryPrice : 0;
      const effectiveTotal = productTotal + effectiveDelivery;
      const res = await apiRequest("POST", "/api/orders", {
        customerName: data.customerName, customerPhone: data.customerPhone,
        wilaya: data.wilaya || "غير محدد", commune: "", deliveryType: "home",
        deliveryPrice: String(effectiveDelivery),
        productId: product.id, productName: product.name, productImage: product.image,
        quantity: data.quantity, price: String(product.price),
        subtotal: String(productTotal),
        total: String(effectiveTotal),
        status: "pending", notes: data.notes || null, source,
      });
      return res.json();
    },
    onSuccess: (order) => { setOrderSuccess(true); setOrderId(order.id); form.reset(); },
    onError: () => toast({ title: "خطأ", description: "حدث خطأ، يرجى المحاولة مجدداً", variant: "destructive" }),
  });

  /* ── SUCCESS STATE ── */
  if (orderSuccess) {
    return (
      <motion.div key="success" initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-blue-100 rounded-2xl p-6 text-center shadow-sm">
        <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: 2, duration: 0.4 }}>
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
        </motion.div>
        <h3 className="text-xl font-black text-gray-900 mb-1.5">تم استلام طلبك! 🎉</h3>
        <p className="text-gray-500 text-sm mb-1">سيتصل بك فريقنا قريباً لتأكيد التوصيل</p>
        {orderId && <p className="text-xs text-gray-400 mb-5">رقم الطلب: <span className="font-mono font-bold text-blue-600">{orderId}</span></p>}
        <div className="flex gap-3">
          <a href={wa(product, orderId ?? undefined)} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-sm transition-colors">
            <MessageCircle className="w-4 h-4" /> تأكيد واتساب
          </a>
          <button onClick={() => setOrderSuccess(false)}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-semibold text-sm transition-colors">
            طلب جديد
          </button>
        </div>
      </motion.div>
    );
  }

  /* ── FORM ── */
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Product summary */}
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border-b border-blue-100">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-12 h-12 rounded-xl object-contain bg-white border border-gray-100 p-0.5 flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-blue-500" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-800 line-clamp-1">{product.name}</p>
          <p className="text-base font-black text-blue-700">{parseFloat(product.price as string).toLocaleString("ar-DZ")} دج</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
          <Truck className="w-3.5 h-3.5" /> COD
        </div>
      </div>

      <div className="p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(data => orderMutation.mutate(data))} className="space-y-3.5">
            {/* Name */}
            <FormField control={form.control} name="customerName" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-semibold flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5 text-blue-500" /> الاسم الكامل
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="أدخل اسمك الكامل"
                    className="rounded-xl border-gray-200 focus:border-blue-400 h-10 text-sm"
                    data-testid={`${idPrefix}input-order-name`} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )} />

            {/* Phone */}
            <FormField control={form.control} name="customerPhone" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-semibold flex items-center gap-1.5 text-xs">
                  <Phone className="w-3.5 h-3.5 text-blue-500" /> رقم الهاتف
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="07XXXXXXXX"
                    className="rounded-xl border-gray-200 focus:border-blue-400 h-10 text-sm"
                    data-testid={`${idPrefix}input-order-phone`}
                    onBlur={e => { field.onBlur(); captureAbandoned(e.target.value); }} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )} />

            {/* Wilaya */}
            <FormField control={form.control} name="wilaya" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-semibold flex items-center gap-1.5 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" /> الولاية
                </FormLabel>
                <FormControl>
                  <select {...field}
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl text-gray-700 focus:border-blue-400 outline-none bg-white text-sm"
                    data-testid={`${idPrefix}select-order-wilaya`}>
                    <option value="">-- اختر الولاية --</option>
                    {ALGERIAN_WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )} />

            {/* Delivery info — only shown when delivery is enabled */}
            {deliveryEnabled && (
              <AnimatePresence>
                {selectedWilaya && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <div className={`rounded-xl px-3 py-2.5 text-sm flex items-center justify-between ${canDeliver ? "bg-emerald-50 border border-emerald-100" : "bg-red-50 border border-red-100"}`}>
                      {canDeliver ? (
                        <>
                          <span className="text-emerald-700 flex items-center gap-1.5 text-xs">
                            <Truck className="w-3.5 h-3.5" /> التوصيل إلى {selectedWilaya}
                          </span>
                          {showDeliveryPrice && <span className="font-black text-emerald-700 text-sm">{deliveryPrice} دج</span>}
                        </>
                      ) : (
                        <p className="text-red-600 text-xs font-semibold">⚠️ التوصيل غير متاح لهذه الولاية</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Quantity */}
            <div>
              <label className="text-gray-700 font-semibold text-xs mb-2 block">الكمية</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => form.setValue("quantity", Math.max(1, quantity - 1))}
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-blue-100 hover:text-blue-700 font-bold text-lg transition-all flex items-center justify-center">−</button>
                <span className="w-8 text-center font-black text-base text-gray-800">{quantity}</span>
                <button type="button" onClick={() => form.setValue("quantity", Math.min(20, quantity + 1))}
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-blue-100 hover:text-blue-700 font-bold text-lg transition-all flex items-center justify-center">+</button>
              </div>
            </div>

            {/* Order total */}
            {deliveryEnabled ? (
              selectedWilaya && canDeliver && showDeliveryPrice && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>المنتج × {quantity}</span>
                    <span>{productTotal.toLocaleString("ar-DZ")} دج</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>التوصيل</span>
                    <span>{deliveryPrice} دج</span>
                  </div>
                  <div className="flex justify-between font-black text-blue-700 text-sm pt-2 border-t border-gray-200">
                    <span>الإجمالي</span>
                    <span>{grandTotal.toLocaleString("ar-DZ")} دج</span>
                  </div>
                </motion.div>
              )
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex justify-between font-black text-blue-700 text-sm">
                  <span>المجموع</span>
                  <span>{grandTotal.toLocaleString("ar-DZ")} دج</span>
                </div>
              </motion.div>
            )}

            {/* Submit */}
            <button type="submit"
              disabled={orderMutation.isPending || (deliveryEnabled && !!selectedWilaya && !canDeliver)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 text-sm"
              data-testid={`${idPrefix}button-place-order`}>
              {orderMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
              ) : (
                <>
                  اطلب الآن — الدفع عند الاستلام
                  {deliveryEnabled ? (
                    selectedWilaya && canDeliver && showDeliveryPrice && (
                      <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-black">{grandTotal.toLocaleString("ar-DZ")} دج</span>
                    )
                  ) : (
                    <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-black">{grandTotal.toLocaleString("ar-DZ")} دج</span>
                  )}
                </>
              )}
            </button>

            {/* Notes */}
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <textarea {...field}
                    placeholder="ملاحظات إضافية (اختياري)..."
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl resize-none focus:border-blue-400 outline-none text-gray-600 bg-gray-50"
                    rows={2} />
                </FormControl>
              </FormItem>
            )} />
          </form>
        </Form>

        {/* Trust note */}
        <p className="text-[10px] text-gray-400 text-center mt-3 leading-relaxed">
          🔒 معلوماتك محفوظة — الدفع فقط عند استلام طلبك
        </p>
      </div>
    </div>
  );
}
