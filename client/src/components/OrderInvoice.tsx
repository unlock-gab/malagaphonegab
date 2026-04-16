import { useQuery } from "@tanstack/react-query";
import { Printer, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Order, InvoiceTemplate } from "@shared/schema";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

interface InvoiceProps {
  order: Order;
  onClose: () => void;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("ar-DZ").format(Math.round(v)) + " د.ج";
}
function formatDate(d: string | null | undefined) {
  if (!d) return "";
  return new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}
function shortId(id: string) { return "#" + id.slice(-6).toUpperCase(); }

const PAYMENT_METHOD_MAP: Record<string, string> = {
  cash_on_delivery: "دفع عند الاستلام (COD)",
  card: "بطاقة بنكية",
  transfer: "تحويل بنكي",
};
const PAYMENT_STATUS_MAP: Record<string, string> = {
  pending: "معلق",
  paid: "مدفوع",
  failed: "فشل",
  refunded: "مرتجع",
};
const STATUS_MAP: Record<string, string> = {
  new: "جديد", confirmed: "مؤكد", preparing: "قيد التجهيز",
  shipped: "تم الشحن", delivered: "تم التسليم", cancelled: "ملغي",
};
const DELIVERY_TYPE_MAP: Record<string, string> = {
  home: "توصيل للمنزل",
  desk: "توصيل لمكتب الشركة",
  pickup: "استلام من المتجر",
};

export default function OrderInvoice({ order, onClose }: InvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: items = [] } = useQuery<OrderItem[]>({
    queryKey: ["/api/orders", order.id, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${order.id}`);
      const data = await res.json();
      return data.items || [];
    },
  });

  // Get categoryId from first item's product to load the right invoice template
  const firstProductId = items[0]?.productId || order.productId || null;
  const { data: firstProduct } = useQuery<{ id: string; categoryId?: string | null }>({
    queryKey: ["/api/products", firstProductId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${firstProductId}`);
      return res.ok ? res.json() : null;
    },
    enabled: !!firstProductId,
  });

  const categoryId = firstProduct?.categoryId || null;
  const { data: invoiceTpl } = useQuery<InvoiceTemplate | null>({
    queryKey: ["/api/invoice-templates/by-category", categoryId ?? "default"],
    queryFn: async () => {
      const key = categoryId ?? "default";
      const res = await fetch(`/api/invoice-templates/by-category/${key}`);
      return res.ok ? res.json() : null;
    },
  });

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "invoice-print-style";
    style.textContent = `
      @media print {
        body > * { display: none !important; }
        #invoice-print-root { display: block !important; }
        #invoice-print-root .no-print { display: none !important; }
        #invoice-print-root .print-page {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: white; z-index: 99999;
          font-family: 'Arial', 'Tahoma', sans-serif;
        }
        @page { margin: 15mm; size: A4; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById("invoice-print-style")?.remove(); };
  }, []);

  const subtotal = parseFloat(order.subtotal as string || "0");
  const deliveryPrice = parseFloat(order.deliveryPrice as string || "0");
  const total = parseFloat(order.total as string || "0");

  const displayItems: Array<{ name: string; qty: number; price: number; total: number }> =
    items.length > 0
      ? items.map(i => ({
          name: i.productName,
          qty: i.quantity,
          price: parseFloat(i.unitPrice),
          total: parseFloat(i.total),
        }))
      : order.productName
        ? [{ name: order.productName, qty: order.quantity || 1, price: parseFloat(order.price as string || "0"), total: subtotal }]
        : [];

  return (
    <div id="invoice-print-root" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Controls - hidden on print */}
        <div className="no-print flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-gray-800 font-bold flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-600" />
            فاتورة الطلب {shortId(order.id)}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
              data-testid="btn-print-invoice"
            >
              <Printer className="w-4 h-4" />
              طباعة / PDF
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice content */}
        <div className="print-page p-8" ref={printRef}>
          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-800">
            <div>
              {(invoiceTpl?.showLogo !== false) && (
                <div className="h-14 rounded-xl overflow-hidden border border-gray-200 bg-white mb-2" style={{ width: 200 }}>
                  <img src="/logo.jpg" alt="MALAGA PHONE" className="w-full h-full object-contain" />
                </div>
              )}
              <p className="font-black text-gray-900 text-base">{invoiceTpl?.companyName || "MALAGA PHONE"}</p>
              {(invoiceTpl?.headerText || "Vente & Échange de Smart-Phones") && (
                <p className="text-gray-500 text-sm">{invoiceTpl?.headerText || "Vente & Échange de Smart-Phones"}</p>
              )}
              {(invoiceTpl?.companyAddress || "الجزائر") && (
                <p className="text-gray-500 text-sm">{invoiceTpl?.companyAddress || "الجزائر"}</p>
              )}
              {invoiceTpl?.companyPhone && (
                <p className="text-gray-400 text-sm">{invoiceTpl.companyPhone}</p>
              )}
            </div>
            <div className="text-left">
              <div className="inline-block bg-gray-900 text-white px-4 py-2 rounded-lg mb-2">
                <span className="text-sm font-bold">فاتورة</span>
              </div>
              <p className="text-gray-800 font-black text-xl">{shortId(order.id)}</p>
              <p className="text-gray-500 text-sm mt-1">{formatDate(order.createdAt)}</p>
            </div>
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">معلومات الزبون</p>
              <p className="text-gray-900 font-bold text-sm">{order.customerName}</p>
              <p className="text-gray-600 text-sm mt-1">{order.customerPhone}</p>
              {order.wilaya && <p className="text-gray-600 text-sm">{order.wilaya}{order.commune ? ` - ${order.commune}` : ""}</p>}
              {order.address && <p className="text-gray-500 text-xs mt-1">{order.address}</p>}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">تفاصيل الطلب</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">الحالة:</span>
                  <span className="font-semibold text-gray-800">{STATUS_MAP[order.status] || order.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">طريقة الدفع:</span>
                  <span className="font-semibold text-gray-800">{PAYMENT_METHOD_MAP[order.paymentMethod] || order.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">حالة الدفع:</span>
                  <span className="font-semibold text-gray-800">{PAYMENT_STATUS_MAP[order.paymentStatus] || order.paymentStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">التوصيل:</span>
                  <span className="font-semibold text-gray-800">{DELIVERY_TYPE_MAP[order.deliveryType] || order.deliveryType}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-right px-4 py-3 text-sm font-semibold rounded-tr-lg">المنتج</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold">الكمية</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold">سعر الوحدة</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold rounded-tl-lg">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                    <td className="px-4 py-3 text-gray-800 font-medium text-sm">{item.name}</td>
                    <td className="px-4 py-3 text-center text-gray-600 text-sm">{item.qty}</td>
                    <td className="px-4 py-3 text-center text-gray-600 text-sm">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-3 text-left text-gray-800 font-semibold text-sm">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
                {displayItems.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">لا توجد بنود</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">المجموع الفرعي:</span>
                  <span className="text-gray-800 font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                {deliveryPrice > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">رسوم التوصيل:</span>
                    <span className="text-gray-800 font-semibold">{formatCurrency(deliveryPrice)}</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-800 pt-2 flex justify-between">
                  <span className="text-gray-900 font-black text-base">الإجمالي:</span>
                  <span className="text-gray-900 font-black text-base">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-amber-700 text-xs font-semibold mb-1">ملاحظات:</p>
              <p className="text-amber-800 text-sm">{order.notes}</p>
            </div>
          )}

          {/* Warranty */}
          {invoiceTpl?.warrantyText && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
              <p className="text-blue-700 text-xs font-semibold mb-1">الضمان</p>
              <p className="text-blue-800 text-sm">{invoiceTpl.warrantyText}</p>
            </div>
          )}

          {/* Terms */}
          {invoiceTpl?.termsText && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <p className="text-gray-600 text-xs font-semibold mb-1">الشروط والأحكام</p>
              <p className="text-gray-500 text-sm">{invoiceTpl.termsText}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 text-center">
            <p className="text-gray-400 text-xs">
              {invoiceTpl?.footerText || "شكراً لتعاملكم مع MALAGA PHONE — الجزائر"}
            </p>
            <p className="text-gray-300 text-xs mt-0.5">هذه الفاتورة صادرة إلكترونياً وصالحة بدون توقيع</p>
          </div>
        </div>
      </div>
    </div>
  );
}
