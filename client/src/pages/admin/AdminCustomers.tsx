import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Search, Phone, MapPin, ShoppingCart, DollarSign,
  Clock, MessageCircle, ChevronRight, X, Package, TrendingUp,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ORDER_STATUSES } from "@shared/schema";

interface CustomerSummary {
  phone: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
  wilaya: string;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  wilaya: string;
  status: string;
  total: string;
  createdAt: string;
  productName?: string;
  paymentMethod: string;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("ar-DZ").format(Math.round(v)) + " د.ج";
}
function formatDate(d: string) {
  return new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}
function shortId(id: string) { return "#" + id.slice(-6).toUpperCase(); }

function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUSES.find(s => s.key === status);
  if (!s) return <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-medium ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function whatsappUrl(phone: string) {
  const cleaned = phone.replace(/\D/g, "").replace(/^0/, "213");
  return `https://wa.me/${cleaned}`;
}

function CustomerOrders({ phone, name }: { phone: string; name: string }) {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/customers", phone, "orders"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${encodeURIComponent(phone)}/orders`);
      return res.json();
    },
  });

  const totalSpent = orders.filter(o => o.status === "delivered").reduce((s, o) => s + parseFloat(o.total || "0"), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "إجمالي الطلبات", value: orders.length, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "الطلبات المسلّمة", value: orders.filter(o => o.status === "delivered").length, icon: Package, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "إجمالي الإنفاق", value: formatCurrency(totalSpent), icon: DollarSign, color: "text-violet-600", bg: "bg-violet-50" },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
            <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
            </div>
            {isLoading ? <Skeleton className="h-5 w-16 mx-auto mb-1" /> : <p className="text-gray-900 font-black text-sm">{s.value}</p>}
            <p className="text-gray-400 text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="text-gray-600 text-xs font-semibold">سجل الطلبات</h4>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">لا توجد طلبات</div>
        ) : (
          orders.map(o => (
            <div key={o.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:border-gray-200 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-700 text-xs font-bold">{shortId(o.id)}</span>
                  <StatusBadge status={o.status} />
                  {o.productName && <span className="text-gray-500 text-[10px] truncate max-w-[120px]">{o.productName}</span>}
                </div>
                <p className="text-gray-400 text-[10px] mt-0.5">{formatDate(o.createdAt)} · {o.wilaya}</p>
              </div>
              <span className="text-gray-800 font-bold text-sm shrink-0">{formatCurrency(parseFloat(o.total || "0"))}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  const { data: customers = [], isLoading } = useQuery<CustomerSummary[]>({
    queryKey: ["/api/customers"],
  });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.wilaya.includes(search)
  );

  const selectedCustomer = customers.find(c => c.phone === selectedPhone);

  return (
    <AdminLayout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              الزبائن
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {isLoading ? "..." : `${customers.length} زبون`} — مجمّع من سجلات الطلبات
            </p>
          </div>
        </div>

        {/* Summary */}
        {!isLoading && customers.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "إجمالي الزبائن", value: customers.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "إجمالي الطلبات", value: customers.reduce((s, c) => s + c.orderCount, 0), icon: ShoppingCart, color: "text-violet-600", bg: "bg-violet-50" },
              { label: "متوسط الطلبات / زبون", value: (customers.reduce((s, c) => s + c.orderCount, 0) / customers.length).toFixed(1), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-xl font-black text-gray-900">{s.value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-5">
          {/* List */}
          <div className={`${selectedPhone ? "hidden lg:block lg:w-80 lg:flex-shrink-0" : "flex-1"}`}>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الهاتف أو الولاية..."
                className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                data-testid="input-customer-search"
              />
            </div>

            <div className="space-y-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
              ) : filtered.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl py-12 text-center">
                  <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-semibold text-sm">لا يوجد زبائن</p>
                  <p className="text-gray-400 text-xs mt-0.5">سيظهر الزبائن بعد إنشاء الطلبات</p>
                </div>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.phone}
                    onClick={() => setSelectedPhone(c.phone === selectedPhone ? null : c.phone)}
                    className={`w-full text-right bg-white border rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all ${c.phone === selectedPhone ? "border-blue-300 bg-blue-50/50" : "border-gray-200"}`}
                    data-testid={`btn-customer-${c.phone}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm">
                          {c.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-800 font-bold text-sm truncate">{c.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-gray-400 text-xs flex items-center gap-0.5">
                              <Phone className="w-3 h-3" /> {c.phone}
                            </span>
                            <span className="text-gray-400 text-xs flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" /> {c.wilaya}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">{c.orderCount} طلب</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100">
                      <span className="text-gray-500 text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> آخر طلب: {formatDate(c.lastOrderDate)}
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${c.phone === selectedPhone ? "text-blue-500 rotate-90" : "text-gray-300"}`} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selectedPhone && selectedCustomer && (
            <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-start justify-between p-5 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-md">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-gray-900 font-black text-lg">{selectedCustomer.name}</h2>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-gray-500 text-sm flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {selectedCustomer.phone}
                      </span>
                      <span className="text-gray-500 text-sm flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {selectedCustomer.wilaya}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={whatsappUrl(selectedCustomer.phone)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-100 transition-colors"
                    data-testid={`btn-whatsapp-${selectedCustomer.phone}`}>
                    <MessageCircle className="w-3.5 h-3.5" /> واتساب
                  </a>
                  <button onClick={() => setSelectedPhone(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors lg:hidden">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <CustomerOrders phone={selectedPhone} name={selectedCustomer.name} />
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
