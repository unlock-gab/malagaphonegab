import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Phone, MapPin, Package, Clock, Trash2, Search, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./AdminLayout";
import { useAdminLang } from "@/context/AdminLangContext";

type AbandonedCart = {
  id: string;
  customerPhone: string;
  customerName: string | null;
  wilaya: string | null;
  productId: string;
  productName: string;
  source: string | null;
  ip: string | null;
  createdAt: string | null;
};

export default function AdminAbandoned() {
  const { dir } = useAdminLang();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: carts = [], isLoading } = useQuery<AbandonedCart[]>({
    queryKey: ["/api/abandoned-carts"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/abandoned-carts/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/abandoned-carts"] });
      setDeleteConfirmId(null);
      toast({ title: "تم الحذف ✓" });
    },
    onError: () => toast({ title: "خطأ في الحذف", variant: "destructive" }),
  });

  const filtered = carts.filter(c =>
    !search ||
    c.customerPhone.includes(search) ||
    (c.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.wilaya || "").includes(search) ||
    c.productName.toLowerCase().includes(search.toLowerCase())
  );

  const byProduct = carts.reduce((acc: Record<string, number>, c) => {
    acc[c.productName] = (acc[c.productName] || 0) + 1;
    return acc;
  }, {});

  const topProducts = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <AdminLayout>
      <div dir={dir}>
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-orange-400" />
            السلة المهجورة
          </h1>
          <p className="text-gray-400">زوار أدخلوا رقم هاتفهم لكن لم يكملوا الطلب</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="text-3xl font-black text-orange-400">{carts.length}</div>
            <div className="text-gray-400 text-sm">إجمالي المهجورة</div>
          </div>
          {topProducts.map(([name, count], i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="text-2xl font-black text-white">{count}</div>
              <div className="text-gray-400 text-sm truncate">{name}</div>
              <div className="text-xs text-orange-400 mt-1">الأكثر تخلياً</div>
            </div>
          ))}
        </div>

        <div className="relative mb-5">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالهاتف أو الاسم أو الولاية..."
            className="w-full bg-gray-900 border border-gray-800 text-white placeholder-gray-500 pr-11 pl-4 py-3 rounded-xl focus:outline-none focus:border-orange-500"
            data-testid="input-abandoned-search"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-right px-5 py-4 text-gray-400 font-medium text-sm">العميل</th>
                  <th className="text-right px-5 py-4 text-gray-400 font-medium text-sm hidden md:table-cell">الولاية</th>
                  <th className="text-right px-5 py-4 text-gray-400 font-medium text-sm">المنتج</th>
                  <th className="text-right px-5 py-4 text-gray-400 font-medium text-sm hidden md:table-cell">المصدر</th>
                  <th className="text-right px-5 py-4 text-gray-400 font-medium text-sm hidden lg:table-cell">التاريخ</th>
                  <th className="text-right px-5 py-4 text-gray-400 font-medium text-sm">إجراء</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-800/50">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.map(cart => (
                    <motion.tr
                      key={cart.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      data-testid={`abandoned-row-${cart.id}`}
                    >
                      <td className="px-5 py-4">
                        <div className="text-white font-medium">{cart.customerName || "—"}</div>
                        <div className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />{cart.customerPhone}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-400 hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-600" />
                          {cart.wilaya || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">{cart.productName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${cart.source === "landing" ? "bg-violet-500/20 text-violet-400" : "bg-gray-800 text-gray-400"}`}>
                          {cart.source === "landing" ? "Landing" : "متجر"}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                          <Clock className="w-3 h-3" />
                          {cart.createdAt ? new Date(cart.createdAt).toLocaleDateString("ar-DZ") : "—"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {deleteConfirmId === cart.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteMutation.mutate(cart.id)}
                              disabled={deleteMutation.isPending}
                              className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-60"
                              data-testid={`button-confirm-delete-abandoned-${cart.id}`}
                            >
                              تأكيد
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1.5 bg-gray-700 text-gray-400 rounded-lg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(cart.id)}
                            className="p-2 bg-gray-800 hover:bg-red-600/20 border border-gray-700 hover:border-red-500 text-gray-400 hover:text-red-400 rounded-xl transition-all"
                            data-testid={`button-delete-abandoned-${cart.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          {!isLoading && filtered.length === 0 && (
            <div className="py-16 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">{search ? "لا توجد نتائج" : "لا توجد سلات مهجورة"}</p>
              <p className="text-gray-600 text-sm mt-1">ستظهر هنا عندما يدخل شخص رقمه ولا يكمل الطلب</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
