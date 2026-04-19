import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Undo2, Clock, ShoppingCart, Package, Warehouse, RotateCcw, ArrowLeftRight, AlertTriangle, X, Check } from "lucide-react";
import { useAdminLang } from "@/context/AdminLangContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type OperationHistory = {
  id: string;
  operationType: string;
  module: string;
  recordId: string;
  label: string;
  amount: string | null;
  createdBy: string | null;
  createdAt: string;
  isUndone: boolean;
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s`;
  if (diff < 3600) return `${Math.round(diff / 60)} min`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(dateStr));
}

function opIcon(type: string) {
  switch (type) {
    case "pos_sale": return <ShoppingCart className="w-3.5 h-3.5 text-violet-500" />;
    case "admin_order": return <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />;
    case "purchase": return <Package className="w-3.5 h-3.5 text-emerald-600" />;
    case "versement": return <ArrowLeftRight className="w-3.5 h-3.5 text-orange-500" />;
    case "supplier_return": return <RotateCcw className="w-3.5 h-3.5 text-rose-500" />;
    case "inventory_adjustment": return <Warehouse className="w-3.5 h-3.5 text-amber-500" />;
    case "order_status": return <Clock className="w-3.5 h-3.5 text-sky-500" />;
    default: return <Clock className="w-3.5 h-3.5 text-gray-400" />;
  }
}

function opModuleLabel(type: string): string {
  switch (type) {
    case "pos_sale": return "POS";
    case "admin_order": return "Commandes";
    case "purchase": return "Achats";
    case "versement": return "Versements";
    case "supplier_return": return "Retours";
    case "inventory_adjustment": return "Stock";
    case "order_status": return "Commandes";
    default: return type;
  }
}

function undoDescription(op: OperationHistory): string {
  switch (op.operationType) {
    case "pos_sale":
    case "admin_order":
      return "La commande sera annulée et le stock restauré si applicable.";
    case "purchase":
      return "L'achat sera définitivement supprimé et le stock restitué.";
    case "versement":
      return "Le versement fournisseur sera supprimé.";
    case "supplier_return":
      return "Le retour/échange fournisseur sera annulé.";
    case "inventory_adjustment":
      return "L'ajustement de stock sera inversé.";
    case "order_status":
      return "Le statut de la commande sera rétabli à l'état précédent.";
    default:
      return "Cette opération sera annulée.";
  }
}

export default function RetourButton() {
  const { t } = useAdminLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmOp, setConfirmOp] = useState<OperationHistory | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: ops = [], isLoading } = useQuery<OperationHistory[]>({
    queryKey: ["/api/operation-history"],
    refetchInterval: open ? 5000 : false,
  });

  const undoMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/operation-history/${id}/undo`),
    onSuccess: () => {
      toast({ title: t("retour_success"), variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/operation-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases/payments-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setConfirmOp(null);
      setOpen(false);
    },
    onError: (e: any) => {
      toast({ title: t("retour_error"), description: e?.message ?? "Erreur", variant: "destructive" });
      setConfirmOp(null);
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(v => !v)}
        data-testid="button-retour"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all"
      >
        <Undo2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t("retour")}</span>
        {ops.length > 0 && (
          <span className="w-4 h-4 bg-amber-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
            {ops.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-80 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Undo2 className="w-3.5 h-3.5 text-amber-500" />
              {t("retour_title")}
            </span>
            <button onClick={() => setOpen(false)} className="p-0.5 rounded text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-gray-400">Chargement...</div>
            ) : ops.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">{t("retour_no_ops")}</div>
            ) : (
              ops.map(op => (
                <div key={op.id} className="px-3 py-2.5 hover:bg-gray-50/80 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="mt-0.5 flex-shrink-0">{opIcon(op.operationType)}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{op.label}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {opModuleLabel(op.operationType)}
                          </span>
                          {op.amount && parseFloat(op.amount) > 0 && (
                            <span className="text-[10px] text-emerald-600 font-semibold">
                              {new Intl.NumberFormat("fr-FR").format(parseFloat(op.amount))} DA
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">{timeAgo(op.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmOp(op)}
                      data-testid={`button-undo-${op.id}`}
                      className="flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors"
                    >
                      {t("retour_undo")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {confirmOp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-80 p-5 mx-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">{t("retour_confirm_title")}</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-1">
                {opIcon(confirmOp.operationType)}
                <span className="text-xs font-semibold text-gray-700 truncate">{confirmOp.label}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">{undoDescription(confirmOp)}</p>
            </div>
            <p className="text-xs text-gray-600 mb-4">{t("retour_confirm_body")}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOp(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                data-testid="button-undo-cancel"
              >
                {t("retour_cancel_btn")}
              </button>
              <button
                onClick={() => undoMutation.mutate(confirmOp.id)}
                disabled={undoMutation.isPending}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                data-testid="button-undo-confirm"
              >
                {undoMutation.isPending ? (
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                {t("retour_confirm_btn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
