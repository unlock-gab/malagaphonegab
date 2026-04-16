import type { Order } from "@shared/schema";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: string | number;
  total: string | number;
}

interface BonDeLivraisonProps {
  order: Order;
  items: OrderItem[];
  onClose: () => void;
}

export default function BonDeLivraison({ order, items, onClose }: BonDeLivraisonProps) {
  const handlePrint = () => window.print();
  const date = new Intl.DateTimeFormat("ar-DZ", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(order.createdAt ?? Date.now()));

  const formatMoney = (v: string | number | null | undefined) =>
    new Intl.NumberFormat("ar-DZ").format(Math.round(parseFloat(String(v ?? "0")))) + " د.ج";

  const shortId = "#" + order.id.slice(-6).toUpperCase();

  const displayItems = items.length > 0 ? items : order.productName ? [{
    id: "single",
    productName: order.productName,
    quantity: order.quantity ?? 1,
    unitPrice: order.price ?? "0",
    total: parseFloat(String(order.price ?? "0")) * (order.quantity ?? 1),
  }] : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" dir="rtl">
      {/* Screen-only controls */}
      <div className="print:hidden fixed top-4 left-4 flex gap-2 z-50">
        <button onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          🖨️ طباعة
        </button>
        <button onClick={onClose}
          className="bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold shadow-lg hover:bg-gray-50 transition-colors">
          ✕ إغلاق
        </button>
      </div>

      {/* Bon de Livraison Document */}
      <div id="bon-livraison-print" className="bg-white rounded-xl shadow-2xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto print:overflow-visible print:shadow-none print:rounded-none print:max-h-none print:max-w-none print:w-full print:m-0">

        {/* Print styles */}
        <style>{`
          @media print {
            body > * { display: none !important; }
            #bon-livraison-print { display: block !important; position: fixed; inset: 0; padding: 20px; }
            .print\\:hidden { display: none !important; }
          }
        `}</style>

        <div className="p-6 space-y-4" style={{ fontFamily: "Arial, sans-serif" }}>

          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4">
            <div>
              <img src="/logo.jpg" alt="MALAGA PHONE" className="h-12 object-contain mb-1" />
              <p className="text-gray-500 text-xs">VENTE & ÉCHANGE DE SMART-PHONES</p>
            </div>
            <div className="text-left">
              <h1 className="text-xl font-black text-gray-900">وصل التوصيل</h1>
              <p className="text-gray-500 text-sm">BON DE LIVRAISON</p>
              <p className="text-blue-600 font-bold text-lg mt-1">{shortId}</p>
            </div>
          </div>

          {/* Order info + Customer info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="border border-gray-200 rounded-lg p-3 space-y-1.5">
              <p className="text-gray-400 text-xs font-semibold uppercase">معلومات الطلب</p>
              <p><span className="text-gray-500">التاريخ: </span><span className="font-medium">{date}</span></p>
              <p><span className="text-gray-500">رقم الطلب: </span><span className="font-bold text-blue-600">{shortId}</span></p>
              <p><span className="text-gray-500">طريقة الدفع: </span>
                <span className={`font-semibold ${order.paymentMethod === "cash_on_delivery" ? "text-orange-600" : "text-emerald-600"}`}>
                  {order.paymentMethod === "cash_on_delivery" ? "💵 دفع عند الاستلام" : order.paymentMethod === "card" ? "بطاقة" : "تحويل"}
                </span>
              </p>
              <p><span className="text-gray-500">نوع التوصيل: </span>
                <span className="font-medium">{order.deliveryType === "home" ? "للمنزل" : "للمكتب"}</span>
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-3 space-y-1.5">
              <p className="text-gray-400 text-xs font-semibold uppercase">معلومات الزبون</p>
              <p><span className="text-gray-500">الاسم: </span><span className="font-bold">{order.customerName}</span></p>
              <p><span className="text-gray-500">الهاتف: </span><span className="font-mono font-semibold">{order.customerPhone}</span></p>
              <p><span className="text-gray-500">الولاية: </span><span className="font-medium">{order.wilaya}</span></p>
              {order.commune && <p><span className="text-gray-500">البلدية: </span><span className="font-medium">{order.commune}</span></p>}
              {order.address && <p><span className="text-gray-500">العنوان: </span><span className="font-medium text-xs">{order.address}</span></p>}
            </div>
          </div>

          {/* Products Table */}
          <div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-right py-2 px-3 font-semibold rounded-tr-lg">المنتج</th>
                  <th className="text-center py-2 px-3 font-semibold w-16">الكمية</th>
                  <th className="text-left py-2 px-3 font-semibold w-28 rounded-tl-lg">السعر</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="py-2.5 px-3 text-gray-800 font-medium">{item.productName}</td>
                    <td className="py-2.5 px-3 text-center text-gray-700">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-left text-blue-700 font-bold">{formatMoney(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t-2 border-gray-200 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">المجموع الفرعي</span>
              <span className="font-medium">{formatMoney(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">رسوم التوصيل</span>
              <span className="font-medium">{formatMoney(order.deliveryPrice)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
              <span className="font-black text-gray-900">المبلغ الإجمالي</span>
              <span className="font-black text-blue-700 text-lg">{formatMoney(order.total)}</span>
            </div>
            {order.paymentMethod === "cash_on_delivery" && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center mt-2">
                <p className="text-orange-700 font-bold text-sm">💵 الدفع عند الاستلام (COD)</p>
                <p className="text-orange-600 text-xs">المبلغ المطلوب تحصيله: <strong>{formatMoney(order.total)}</strong></p>
              </div>
            )}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-gray-500 text-xs font-semibold mb-1">ملاحظات</p>
              <p className="text-gray-700 text-sm">{order.notes}</p>
            </div>
          )}

          {/* Signature Area */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="border border-gray-200 rounded h-12 mb-2" />
              <p className="text-gray-400 text-xs">توقيع المندوب</p>
            </div>
            <div className="text-center">
              <div className="border border-gray-200 rounded h-12 mb-2" />
              <p className="text-gray-400 text-xs">توقيع الزبون</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-gray-400 text-xs">MALAGA PHONE — شكراً لتسوّقكم معنا</p>
          </div>
        </div>
      </div>
    </div>
  );
}
