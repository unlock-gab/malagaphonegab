import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldOff, Trash2, Plus, AlertTriangle, Globe, Clock, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./AdminLayout";
import { useAdminLang } from "@/context/AdminLangContext";

type BlockedIp = { id: string; ip: string; reason: string | null; createdAt: string | null };
type Order = { id: string; customerName: string; ip: string | null; createdAt: string | null };

export default function AdminIPBlocker() {
  const { dir } = useAdminLang();
  const { toast } = useToast();
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: blockedIps = [], isLoading } = useQuery<BlockedIp[]>({
    queryKey: ["/api/blocked-ips"],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const blockMutation = useMutation({
    mutationFn: async ({ ip, reason }: { ip: string; reason: string }) => {
      const res = await apiRequest("POST", "/api/blocked-ips", { ip, reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-ips"] });
      setNewIp("");
      setNewReason("");
      setShowForm(false);
      toast({ title: "تم حظر IP ✓" });
    },
    onError: () => toast({ title: "خطأ في الحظر", variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/blocked-ips/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-ips"] });
      toast({ title: "تم رفع الحظر ✓" });
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const ipCounts = orders.reduce((acc: Record<string, number>, o) => {
    if (o.ip) acc[o.ip] = (acc[o.ip] || 0) + 1;
    return acc;
  }, {});

  const suspiciousIps = Object.entries(ipCounts)
    .filter(([ip, count]) => count >= 3 && !blockedIps.find(b => b.ip === ip))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <AdminLayout>
      <div dir={dir}>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-400" />
              حظر IP
            </h1>
            <p className="text-gray-400">منع الطلبات المزيفة عن طريق حظر عناوين IP</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all"
            data-testid="button-show-block-form"
          >
            <Plus className="w-4 h-4" />
            حظر IP
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gray-900 border border-red-500/30 rounded-2xl p-5 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" />حظر عنوان IP</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">عنوان IP</label>
                  <input
                    value={newIp}
                    onChange={e => setNewIp(e.target.value)}
                    placeholder="192.168.1.1"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 font-mono"
                    data-testid="input-block-ip"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">سبب الحظر (اختياري)</label>
                  <input
                    value={newReason}
                    onChange={e => setNewReason(e.target.value)}
                    placeholder="طلبات مزيفة متكررة"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-500"
                    data-testid="input-block-reason"
                  />
                </div>
              </div>
              <button
                onClick={() => blockMutation.mutate({ ip: newIp.trim(), reason: newReason })}
                disabled={!newIp.trim() || blockMutation.isPending}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                data-testid="button-confirm-block-ip"
              >
                {blockMutation.isPending ? "جاري الحظر..." : "تأكيد الحظر"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {suspiciousIps.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-6">
            <h3 className="text-amber-400 font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              IPs مشبوهة ({suspiciousIps.length}) — طلبات متكررة
            </h3>
            <div className="space-y-2">
              {suspiciousIps.map(([ip, count]) => (
                <div key={ip} className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span className="text-white font-mono text-sm">{ip}</span>
                    <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">{count} طلبات</span>
                  </div>
                  <button
                    onClick={() => blockMutation.mutate({ ip, reason: "طلبات متكررة مشبوهة" })}
                    disabled={blockMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 rounded-lg text-xs font-bold transition-all"
                    data-testid={`button-block-suspicious-${ip}`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    حظر
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-white font-bold flex items-center gap-2">
              <ShieldOff className="w-4 h-4 text-red-400" />
              قائمة IP المحظورة ({blockedIps.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
          ) : blockedIps.length === 0 ? (
            <div className="p-16 text-center">
              <Shield className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">لا توجد IPs محظورة</p>
              <p className="text-gray-600 text-sm mt-1">سيتم حظر الطلبات من IPs المضافة تلقائياً</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              <AnimatePresence>
                {blockedIps.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between px-5 py-4"
                    data-testid={`blocked-ip-row-${item.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-red-500/20 rounded-xl flex items-center justify-center">
                        <Globe className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <div className="text-white font-mono font-bold">{item.ip}</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {item.reason && <span className="text-gray-500 text-xs">{item.reason}</span>}
                          {item.createdAt && (
                            <span className="text-gray-600 text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(item.createdAt).toLocaleDateString("ar-DZ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => unblockMutation.mutate(item.id)}
                      disabled={unblockMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:border-red-500 hover:text-red-400 rounded-xl text-xs font-bold transition-all"
                      data-testid={`button-unblock-${item.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      رفع الحظر
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
