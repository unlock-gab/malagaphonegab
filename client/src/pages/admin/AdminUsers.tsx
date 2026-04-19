import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminLang } from "@/context/AdminLangContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, KeyRound, User, Shield } from "lucide-react";

type AdminUser = {
  id: string; username: string; role: string; name: string;
  phone?: string | null; email?: string | null; active: boolean;
  roleId?: string | null; createdAt: string; lastLogin?: string | null;
};
type Role = { id: string; name: string; slug: string; isSystem: boolean };

const emptyForm = { name: "", username: "", phone: "", email: "", password: "", confirmPassword: "", roleId: "", active: true };

export default function AdminUsers() {
  const { t, dir } = useAdminLang();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; user?: AdminUser }>({ open: false });
  const [resetModal, setResetModal] = useState<{ open: boolean; user?: AdminUser }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newPassword, setNewPassword] = useState("");

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"] });
  const { data: roles = [] } = useQuery<Role[]>({ queryKey: ["/api/roles"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const isEdit = !!modal.user;
      const res = await apiRequest(isEdit ? "PATCH" : "POST", isEdit ? `/api/admin/users/${modal.user!.id}` : "/api/admin/users", data);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: modal.user ? "Utilisateur modifié" : "Utilisateur créé" });
      setModal({ open: false });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`, {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Utilisateur supprimé" }); setDeleteConfirm(null); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, { active });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, { password });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    },
    onSuccess: () => { toast({ title: "Mot de passe réinitialisé" }); setResetModal({ open: false }); setNewPassword(""); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  function openCreate() {
    setForm(emptyForm);
    setModal({ open: true });
  }

  function openEdit(u: AdminUser) {
    setForm({ name: u.name, username: u.username, phone: u.phone ?? "", email: u.email ?? "", password: "", confirmPassword: "", roleId: u.roleId ?? "", active: u.active });
    setModal({ open: true, user: u });
  }

  function handleSave() {
    if (!form.username.trim()) return toast({ title: "اسم المستخدم مطلوب", variant: "destructive" });
    if (!modal.user && !form.password.trim()) return toast({ title: "كلمة المرور مطلوبة", variant: "destructive" });
    if (form.password && form.password !== form.confirmPassword) return toast({ title: "كلمتا المرور غير متطابقتان", variant: "destructive" });
    const data: any = { name: form.name, username: form.username, phone: form.phone || null, email: form.email || null, roleId: form.roleId || null, active: form.active };
    if (form.password) data.password = form.password;
    saveMutation.mutate(data);
  }

  function getRoleName(roleId?: string | null) {
    if (!roleId) return null;
    return roles.find(r => r.id === roleId)?.name;
  }

  function getRoleBadgeColor(slug?: string) {
    switch (slug) {
      case "admin": return "bg-blue-100 text-blue-800 border-blue-200";
      case "vendeur": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "manager": return "bg-violet-100 text-violet-800 border-violet-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  function formatDate(d?: string | null) {
    if (!d) return "—";
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-4" dir={dir}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Utilisateurs</h1>
            <p className="text-sm text-gray-500">{users.length} utilisateur(s)</p>
          </div>
          <Button onClick={openCreate} className="gap-2" data-testid="button-create-user">
            <Plus className="w-4 h-4" /> Nouvel utilisateur
          </Button>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 text-xs text-gray-500 uppercase">
                <TableHead>Nom</TableHead>
                <TableHead>Identifiant</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">Chargement...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">Aucun utilisateur</TableCell></TableRow>
              ) : users.map(u => {
                const roleObj = roles.find(r => r.id === u.roleId);
                return (
                  <TableRow key={u.id} className="hover:bg-gray-50" data-testid={`row-user-${u.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{u.name || "—"}</p>
                          {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-gray-700">{u.username}</TableCell>
                    <TableCell>
                      {roleObj ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(roleObj.slug)}`}>
                          <Shield className="w-3 h-3" />{roleObj.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Aucun rôle</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.active}
                          disabled={u.id === "user-admin"}
                          onCheckedChange={(v) => toggleActiveMutation.mutate({ id: u.id, active: v })}
                          data-testid={`switch-active-${u.id}`}
                        />
                        <span className={`text-xs ${u.active ? "text-emerald-600" : "text-gray-400"}`}>
                          {u.active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">{formatDate(u.lastLogin)}</TableCell>
                    <TableCell className="text-xs text-gray-500">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setResetModal({ open: true, user: u }); setNewPassword(""); }} data-testid={`button-reset-${u.id}`}>
                          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)} data-testid={`button-edit-${u.id}`}>
                          <Pencil className="w-3.5 h-3.5 text-blue-500" />
                        </Button>
                        {u.id !== "user-admin" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirm(u)} data-testid={`button-delete-${u.id}`}>
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Create/Edit Modal */}
        <Dialog open={modal.open} onOpenChange={(o) => !o && setModal({ open: false })}>
          <DialogContent className="max-w-md" dir={dir}>
            <DialogHeader>
              <DialogTitle>{modal.user ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nom complet</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom complet" data-testid="input-user-name" />
                </div>
                <div className="space-y-1">
                  <Label>Identifiant *</Label>
                  <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="username" disabled={!!modal.user} data-testid="input-user-username" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Téléphone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0555..." data-testid="input-user-phone" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@..." type="email" data-testid="input-user-email" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Rôle</Label>
                <Select value={form.roleId} onValueChange={v => setForm(f => ({ ...f, roleId: v }))}>
                  <SelectTrigger data-testid="select-user-role">
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!modal.user && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Mot de passe *</Label>
                    <Input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} type="password" placeholder="••••••" data-testid="input-user-password" />
                  </div>
                  <div className="space-y-1">
                    <Label>Confirmer</Label>
                    <Input value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} type="password" placeholder="••••••" data-testid="input-user-confirm-password" />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} data-testid="switch-user-active" />
                <Label>{form.active ? "Compte actif" : "Compte inactif"}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal({ open: false })}>Annuler</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-user">
                {saveMutation.isPending ? "..." : (modal.user ? "Enregistrer" : "Créer")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Modal */}
        <Dialog open={resetModal.open} onOpenChange={(o) => !o && setResetModal({ open: false })}>
          <DialogContent className="max-w-sm" dir={dir}>
            <DialogHeader>
              <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-gray-500">Utilisateur : <span className="font-medium">{resetModal.user?.username}</span></p>
              <div className="space-y-1">
                <Label>Nouveau mot de passe</Label>
                <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="Min. 6 caractères" data-testid="input-new-password" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetModal({ open: false })}>Annuler</Button>
              <Button
                onClick={() => resetModal.user && resetPasswordMutation.mutate({ id: resetModal.user.id, password: newPassword })}
                disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
                data-testid="button-confirm-reset"
              >
                Réinitialiser
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
          <AlertDialogContent dir={dir}>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible. L'utilisateur <strong>{deleteConfirm?.name || deleteConfirm?.username}</strong> sera supprimé définitivement.</AlertDialogDescription>
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
