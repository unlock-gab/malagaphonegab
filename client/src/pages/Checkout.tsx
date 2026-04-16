import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { ShoppingBag, Truck, CreditCard, Banknote, ArrowLeft, ChevronLeft, Loader2, Shield, CheckCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const checkoutSchema = z.object({
  customerName: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
  customerEmail: z.string().email("البريد الإلكتروني غير صحيح"),
  customerPhone: z.string().min(10, "رقم الهاتف غير صحيح"),
  customerAddress: z.string().min(10, "العنوان يجب أن يكون أكثر تفصيلاً"),
  customerCity: z.string().min(2, "المدينة مطلوبة"),
  paymentMethod: z.enum(["cod", "card"]),
  notes: z.string().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const [, navigate] = useLocation();
  const { items, totalPrice, clearCart } = useCart();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card">("cod");

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { customerName: "", customerEmail: "", customerPhone: "", customerAddress: "", customerCity: "", paymentMethod: "cod", notes: "" },
  });

  const shipping = totalPrice > 299 ? 0 : 30;
  const total = totalPrice + shipping;

  const mutation = useMutation({
    mutationFn: async (data: CheckoutForm) => {
      const res = await apiRequest("POST", "/api/orders", {
        ...data,
        items,
        subtotal: String(totalPrice),
        shipping: String(shipping),
        total: String(total),
        status: "pending",
      });
      return res.json();
    },
    onSuccess: (order) => {
      clearCart();
      navigate(`/order-success/${order.id}`);
    },
    onError: () => {
      toast({ title: "حدث خطأ", description: "لم نتمكن من إتمام الطلب، يرجى المحاولة مجدداً.", variant: "destructive" });
    },
  });

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">السلة فارغة</h2>
          <p className="text-gray-400 mb-6">أضف منتجات للسلة قبل إتمام الشراء</p>
          <Link href="/products">
            <Button className="bg-violet-600 text-white rounded-xl">تصفح المنتجات</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-violet-700 to-fuchsia-700 pt-24 pb-10 px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-white/70 text-sm mb-4">
            <Link href="/"><span className="hover:text-white cursor-pointer">الرئيسية</span></Link>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-white font-semibold">إتمام الشراء</span>
          </nav>
          <h1 className="text-3xl font-black text-white">إتمام الشراء</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(data => mutation.mutate({ ...data, paymentMethod }))}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 text-violet-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">معلومات الشحن</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="customerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>الاسم الكامل</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="أحمد محمد" className="rounded-xl border-gray-200 focus:border-violet-400" data-testid="input-customer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="customerPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الهاتف</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="" className="rounded-xl border-gray-200 focus:border-violet-400" data-testid="input-customer-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="customerEmail" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>البريد الإلكتروني</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="example@email.com" className="rounded-xl border-gray-200 focus:border-violet-400" data-testid="input-customer-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="customerCity" render={({ field }) => (
                      <FormItem>
                        <FormLabel>المدينة</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="الرياض" className="rounded-xl border-gray-200 focus:border-violet-400" data-testid="input-customer-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="customerAddress" render={({ field }) => (
                      <FormItem>
                        <FormLabel>العنوان التفصيلي</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="الشارع، الحي، رقم المبنى" className="rounded-xl border-gray-200 focus:border-violet-400" data-testid="input-customer-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="أي تعليمات خاصة للتوصيل..." className="rounded-xl border-gray-200 focus:border-violet-400" data-testid="input-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-violet-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">طريقة الدفع</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cod")}
                      className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${paymentMethod === "cod" ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-violet-300"}`}
                      data-testid="button-payment-cod"
                    >
                      <Banknote className={`w-8 h-8 ${paymentMethod === "cod" ? "text-violet-600" : "text-gray-400"}`} />
                      <div>
                        <div className={`font-bold text-sm ${paymentMethod === "cod" ? "text-violet-700" : "text-gray-700"}`}>الدفع عند الاستلام</div>
                        <div className="text-xs text-gray-400 mt-0.5">ادفع عند وصول الطلب</div>
                      </div>
                      {paymentMethod === "cod" && (
                        <CheckCircle className="w-5 h-5 text-violet-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${paymentMethod === "card" ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-violet-300"}`}
                      data-testid="button-payment-card"
                    >
                      <CreditCard className={`w-8 h-8 ${paymentMethod === "card" ? "text-violet-600" : "text-gray-400"}`} />
                      <div>
                        <div className={`font-bold text-sm ${paymentMethod === "card" ? "text-violet-700" : "text-gray-700"}`}>بطاقة بنكية</div>
                        <div className="text-xs text-gray-400 mt-0.5">فيزا، ماستركارد، مدى</div>
                      </div>
                      {paymentMethod === "card" && (
                        <CheckCircle className="w-5 h-5 text-violet-600" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                    <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>جميع المعاملات محمية بتشفير SSL</span>
                  </div>
                </motion.div>
              </div>

              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24"
                >
                  <h2 className="text-lg font-bold text-gray-900 mb-5">ملخص الطلب</h2>
                  <div className="flex flex-col gap-4 mb-5">
                    {items.map(item => (
                      <div key={item.productId} className="flex gap-3" data-testid={`order-item-${item.productId}`}>
                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 line-clamp-2">{item.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">الكمية: {item.quantity}</p>
                          <p className="text-sm font-bold text-violet-700 mt-1">{(item.price * item.quantity).toLocaleString("ar-SA")} ر.س</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="mb-4" />
                  <div className="space-y-3 mb-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">المجموع الفرعي</span>
                      <span className="font-semibold">{totalPrice.toLocaleString("ar-SA")} ر.س</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">رسوم الشحن</span>
                      <span className={`font-semibold ${shipping === 0 ? "text-emerald-600" : ""}`}>
                        {shipping === 0 ? "مجاني" : `${shipping} ر.س`}
                      </span>
                    </div>
                    {shipping === 0 && (
                      <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-1.5">🎉 أحسنت! طلبك يتأهل للشحن المجاني</p>
                    )}
                  </div>
                  <Separator className="mb-4" />
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-lg font-black text-gray-900">الإجمالي</span>
                    <span className="text-xl font-black text-violet-700">{total.toLocaleString("ar-SA")} ر.س</span>
                  </div>
                  <Button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/30 hover:opacity-90 text-base"
                    data-testid="button-place-order"
                  >
                    {mutation.isPending ? (
                      <><Loader2 className="w-5 h-5 animate-spin ml-2" /> جاري تأكيد الطلب...</>
                    ) : (
                      <><ArrowLeft className="w-5 h-5 ml-2" /> تأكيد الطلب</>
                    )}
                  </Button>
                </motion.div>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
