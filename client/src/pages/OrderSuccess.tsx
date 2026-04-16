import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, Package, Truck, Home, ShoppingBag, Phone } from "lucide-react";
import { Order } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function OrderSuccess() {
  const [, params] = useRoute("/order-success/:id");
  const { data: order } = useQuery<Order>({
    queryKey: ["/api/orders", params?.id],
    enabled: !!params?.id,
  });

  const items = (order?.items as any[]) || [];
  const statusSteps = [
    { icon: CheckCircle, label: "تم تأكيد الطلب", done: true },
    { icon: Package, label: "جاري التجهيز", done: order?.status === "processing" || order?.status === "shipped" || order?.status === "delivered" },
    { icon: Truck, label: "في الطريق إليك", done: order?.status === "shipped" || order?.status === "delivered" },
    { icon: Home, label: "تم التسليم", done: order?.status === "delivered" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-24">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
            className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/40"
          >
            <CheckCircle className="w-16 h-16 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-4xl font-black text-gray-900 mb-3"
          >
            تم تأكيد طلبك! 🎉
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-gray-500 text-lg"
          >
            شكراً لتسوقك معنا. سيصلك طلبك قريباً.
          </motion.p>
          {order && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="inline-block mt-3 px-4 py-2 bg-violet-100 rounded-xl text-violet-700 font-bold text-sm"
            >
              رقم الطلب: {order.id}
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-6"
        >
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-lg mb-4">حالة الطلب</h2>
            <div className="flex items-center justify-between">
              {statusSteps.map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${step.done ? "bg-emerald-500 shadow-lg shadow-emerald-500/40" : "bg-gray-100"}`}>
                    <step.icon className={`w-6 h-6 ${step.done ? "text-white" : "text-gray-400"}`} />
                  </div>
                  <span className={`text-xs font-medium text-center hidden sm:block ${step.done ? "text-emerald-600" : "text-gray-400"}`}>
                    {step.label}
                  </span>
                  {i < statusSteps.length - 1 && (
                    <div className="absolute" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {order && (
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 mb-1">العميل</p>
                  <p className="font-bold text-gray-800">{order.customerName}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 mb-1">المدينة</p>
                  <p className="font-bold text-gray-800">{order.customerCity}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 mb-1">طريقة الدفع</p>
                  <p className="font-bold text-gray-800">{order.paymentMethod === "cod" ? "الدفع عند الاستلام" : "بطاقة بنكية"}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 mb-1">إجمالي الطلب</p>
                  <p className="font-bold text-violet-700">{parseFloat(order.total as string).toLocaleString("ar-SA")} ر.س</p>
                </div>
              </div>

              <h3 className="font-bold text-gray-900 mb-4">المنتجات المطلوبة ({items.length})</h3>
              <div className="flex flex-col gap-3">
                {items.map((item: any, i: number) => (
                  <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-2xl">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">الكمية: {item.quantity}</p>
                      <p className="text-sm font-bold text-violet-700 mt-1">{(item.price * item.quantity).toLocaleString("ar-SA")} ر.س</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl p-5 text-white mb-6"
        >
          <div className="flex items-center gap-3">
            <Phone className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-bold">هل تحتاج مساعدة؟</p>
              <p className="text-white/80 text-sm">تواصل معنا على 920-000-123</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Link href="/" className="flex-1">
            <Button className="w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/30" data-testid="button-back-home">
              <Home className="w-5 h-5 ml-2" />
              العودة للرئيسية
            </Button>
          </Link>
          <Link href="/products" className="flex-1">
            <Button variant="outline" className="w-full h-12 border-violet-200 text-violet-700 rounded-2xl font-bold hover:bg-violet-50" data-testid="button-continue-shopping">
              <ShoppingBag className="w-5 h-5 ml-2" />
              مواصلة التسوق
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
