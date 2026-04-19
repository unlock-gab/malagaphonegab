import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminLang } from "@/context/AdminLangContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PERMISSION_GROUPS, ALL_PERMISSIONS } from "@shared/schema";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Shield, Check, Lock, ChevronRight, Users } from "lucide-react";

type Role = {
  id: string; name: string; slug: string; isSystem: boolean;
  permissions: string; createdAt: string;
};

function parsePerms(p: string): string[] {
  try { return JSON.parse(p); } catch { return []; }
}

const PERM_LABELS: Record<string, string> = {
  "view": "Voir", "create": "Créer", "update": "Modifier",
  "delete": "Supprimer", "sell": "Vendre", "print": "Imprimer",
  "adjust": "Ajuster", "cancel": "Annuler",
};

function permLabel(p: string) {
  const action = p.split(".")[1];
  return PERM_LABELS[action] ?? action;
}

export default function AdminRoles() {
  const { dir } = useAdminLang();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Role | null>(null);
  const [pendingPerms, setPendingPerms] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null);

  const { data: roles = [], isLoading } = useQuery<Role[]>({ queryKey: ["/api/roles"] });

  function selectRole(r: Role) {
    if (dirty && !confirm("Vous avez des modifications non enregistrées. Continuer ?")) return;
    setSelected(r);
    setPendingPerms(parsePerms(r.permissions));
    setDirty(false);
  }

  function togglePerm(p: string) {
    if (selected?.isSystem) return;
    setPendingPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    setDirty(true);
  }

  function toggleGroup(perms: readonly string[]) {
    if (selected?.isSystem) return;
    const all = perms.every(p => pendingPerms.includes(p));
    if (all) {
      setPendingPerms(prev => prev.filter(p => !perms.includes(p)));
    } else {
      setPendingPerms(prev => Array.from(new Set([...prev, ...perms])));
    }
    setDirty(true);
  }

  function selectAll() {
    if (selected?.isSystem) return;
    setPendingPerms(ALL_PERMISSIONS.slice());
    setDirty(true);
  }

  function clearAll() {
    if (selected?.isSystem) return;
    setPendingPerms([]);
    setDirty(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const res = await apiRequest("PATCH", `/api/roles/${selected.id}`, { permissions: pendingPerms });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/roles"] });
      setDirty(false);
      toast({ title: "Permissions enregistrées" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/roles", { name, permissions: [] });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json() as Promise<Role>;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Rôle créé" });
      setCreateModal(false);
      setNewName("");
      setSelected(r);
      setPendingPerms([]);
      setDirty(false);
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/roles/${id}`, {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Rôle supprimé" });
      setDeleteConfirm(null);
      if (selected?.id === deleteConfirm?.id) { setSelected(null); setPendingPerms([]); setDirty(false); }
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  function getRoleColor(slug: string) {
    switch (slug) {
      case "admin": return "from-blue-500 to-blue-700";
      case "vendeur": return "from-emerald-500 to-emerald-700";
      case "manager": return "from-violet-500 to-violet-700";
      default: return "from-gray-400 to-gray-600";
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-4" dir={dir}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Rôles &amp; Permissions</h1>
            <p className="text-sm text-gray-500">Gérer les rôles et leurs droits d'accès</p>
          </div>
          <Button onClick={() => { setCreateModal(true); setNewName(""); }} className="gap-2" data-testid="button-create-role">
            <Plus className="w-4 h-4" /> Nouveau rôle
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-4 min-h-[600px]">
          {/* Role list */}
          <div className="col-span-3 space-y-2">
            {isLoading ? (
              <div className="text-sm text-gray-400 text-center py-8">Chargement...</div>
            ) : roles.map(r => (
              <div
                key={r.id}
                onClick={() => selectRole(r)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${selected?.id === r.id ? "border-blue-400 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"}`}
                data-testid={`role-card-${r.id}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getRoleColor(r.slug)} flex items-center justify-center flex-shrink-0`}>
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                    <p className="text-xs text-gray-400">{parsePerms(r.permissions).length} permissions</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {r.isSystem && <Lock className="w-3 h-3 text-gray-400" title="Rôle système" />}
                    {selected?.id === r.id && <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Permission matrix */}
          <div className="col-span-9 bg-white rounded-xl border shadow-sm overflow-hidden">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-16">
                <Shield className="w-10 h-10 opacity-30" />
                <p className="text-sm">Sélectionnez un rôle pour gérer ses permissions</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${getRoleColor(selected.slug)} flex items-center justify-center`}>
                      <Shield className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{selected.name}</span>
                      {selected.isSystem && <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Système</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selected.isSystem && (
                      <>
                        <Button variant="outline" size="sm" onClick={selectAll} className="text-xs h-7">Tout sélectionner</Button>
                        <Button variant="outline" size="sm" onClick={clearAll} className="text-xs h-7">Tout désélectionner</Button>
                        <Button
                          size="sm"
                          disabled={!dirty || saveMutation.isPending}
                          onClick={() => saveMutation.mutate()}
                          className="h-7 gap-1"
                          data-testid="button-save-permissions"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {saveMutation.isPending ? "..." : "Enregistrer"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteConfirm(selected)}
                          data-testid="button-delete-role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    {selected.isSystem && <p className="text-xs text-gray-400 italic">Rôle système – non modifiable</p>}
                  </div>
                </div>
                <div className="p-6 overflow-y-auto max-h-[550px] space-y-5">
                  {PERMISSION_GROUPS.map(g => {
                    const groupPerms = g.perms;
                    const allChecked = groupPerms.every(p => pendingPerms.includes(p));
                    const someChecked = groupPerms.some(p => pendingPerms.includes(p));
                    return (
                      <div key={g.group} className="space-y-2">
                        <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                          <Checkbox
                            checked={allChecked}
                            data-state={someChecked && !allChecked ? "indeterminate" : undefined}
                            onCheckedChange={() => toggleGroup(groupPerms)}
                            disabled={selected.isSystem}
                            className="rounded"
                            data-testid={`checkbox-group-${g.group}`}
                          />
                          <span className="text-sm font-semibold text-gray-700">{g.groupFr}</span>
                          <span className="text-xs text-gray-400 ml-auto">{groupPerms.filter(p => pendingPerms.includes(p)).length}/{groupPerms.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-6">
                          {groupPerms.map(p => (
                            <label
                              key={p}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                                pendingPerms.includes(p)
                                  ? "bg-blue-50 border-blue-300 text-blue-800"
                                  : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                              } ${selected.isSystem ? "cursor-default opacity-70" : ""}`}
                            >
                              <Checkbox
                                checked={pendingPerms.includes(p)}
                                onCheckedChange={() => togglePerm(p)}
                                disabled={selected.isSystem}
                                className="w-3 h-3 rounded-sm"
                                data-testid={`checkbox-perm-${p}`}
                              />
                              <span className="font-medium">{permLabel(p)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Create Role Dialog */}
        <Dialog open={createModal} onOpenChange={(o) => !o && setCreateModal(false)}>
          <DialogContent className="max-w-sm" dir={dir}>
            <DialogHeader>
              <DialogTitle>Nouveau rôle</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label>Nom du rôle *</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Livreur, Technicien..."
                  onKeyDown={e => e.key === "Enter" && newName.trim() && createMutation.mutate(newName.trim())}
                  data-testid="input-role-name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModal(false)}>Annuler</Button>
              <Button
                onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
                disabled={!newName.trim() || createMutation.isPending}
                data-testid="button-create-role-confirm"
              >
                {createMutation.isPending ? "..." : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
          <AlertDialogContent dir={dir}>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le rôle ?</AlertDialogTitle>
              <AlertDialogDescription>Le rôle <strong>{deleteConfirm?.name}</strong> sera supprimé. Les utilisateurs assignés à ce rôle n'auront plus de rôle.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
