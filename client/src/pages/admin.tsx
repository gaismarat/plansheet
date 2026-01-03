import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Key, Settings, User, Shield, ArrowLeft } from "lucide-react";
import type { SafeUser, Permission } from "@shared/schema";

type UserWithPermissions = SafeUser & { permissions: Permission[] };

const PAGES = [
  { id: "works", label: "Работы" },
  { id: "ksp", label: "КСП" },
  { id: "budget", label: "Бюджет" },
  { id: "holidays", label: "Праздники" },
];

const FIELDS = [
  { id: "cost", label: "Стоимость (работы)" },
];

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showAddUser, setShowAddUser] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState<number | null>(null);
  const [showPermissions, setShowPermissions] = useState<number | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [changePassword, setChangePassword] = useState("");

  if (!user?.isAdmin) {
    setLocation("/");
    return null;
  }

  const { data: users = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });

  const { data: selectedUserData } = useQuery<UserWithPermissions>({
    queryKey: ["/api/users", showPermissions],
    enabled: showPermissions !== null,
  });

  const createUser = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/users", {
        username: newUsername,
        password: newPassword,
        isAdmin: newIsAdmin,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowAddUser(false);
      setNewUsername("");
      setNewPassword("");
      setNewIsAdmin(false);
      toast({ title: "Пользователь создан" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Ошибка", description: err.message });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Пользователь удалён" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Ошибка", description: err.message });
    },
  });

  const updatePassword = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/users/${id}/password`, { password: changePassword });
    },
    onSuccess: () => {
      setShowChangePassword(null);
      setChangePassword("");
      toast({ title: "Пароль изменён" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Ошибка", description: err.message });
    },
  });

  const setPermission = useMutation({
    mutationFn: async ({ userId, permissionType, resource, allowed }: {
      userId: number;
      permissionType: string;
      resource: string;
      allowed: boolean;
    }) => {
      await apiRequest("POST", `/api/users/${userId}/permissions`, {
        permissionType,
        resource,
        allowed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", showPermissions] });
    },
  });

  const hasPermission = (perms: Permission[] | undefined, type: string, resource: string): boolean => {
    if (!perms) return false;
    const perm = perms.find(p => p.permissionType === type && p.resource === resource);
    return perm?.allowed ?? false;
  };

  const togglePermission = (userId: number, perms: Permission[] | undefined, type: string, resource: string) => {
    const current = hasPermission(perms, type, resource);
    setPermission.mutate({ userId, permissionType: type, resource, allowed: !current });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Управление пользователями</h1>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Пользователи</CardTitle>
            <Button onClick={() => setShowAddUser(true)} data-testid="button-add-user">
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                  data-testid={`user-row-${u.id}`}
                >
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{u.username}</span>
                    {u.isAdmin && (
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                        Админ
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPermissions(u.id)}
                      disabled={u.isAdmin}
                      title="Разрешения"
                      data-testid={`button-permissions-${u.id}`}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowChangePassword(u.id)}
                      title="Сменить пароль"
                      data-testid={`button-change-password-${u.id}`}
                    >
                      <Key className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteUser.mutate(u.id)}
                      disabled={u.id === user?.id}
                      title="Удалить"
                      data-testid={`button-delete-user-${u.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый пользователь</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Логин</Label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  data-testid="input-new-username"
                />
              </div>
              <div className="space-y-2">
                <Label>Пароль</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="input-new-password"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isAdmin"
                  checked={newIsAdmin}
                  onCheckedChange={(c) => setNewIsAdmin(!!c)}
                  data-testid="checkbox-is-admin"
                />
                <Label htmlFor="isAdmin">Администратор</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddUser(false)}>
                Отмена
              </Button>
              <Button onClick={() => createUser.mutate()} data-testid="button-confirm-add-user">
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showChangePassword !== null} onOpenChange={() => setShowChangePassword(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Смена пароля</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Новый пароль</Label>
                <Input
                  type="password"
                  value={changePassword}
                  onChange={(e) => setChangePassword(e.target.value)}
                  data-testid="input-change-password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowChangePassword(null)}>
                Отмена
              </Button>
              <Button
                onClick={() => showChangePassword && updatePassword.mutate(showChangePassword)}
                data-testid="button-confirm-change-password"
              >
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPermissions !== null} onOpenChange={() => setShowPermissions(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Разрешения: {users.find(u => u.id === showPermissions)?.username}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Доступ к страницам</h4>
                <div className="space-y-2">
                  {PAGES.map((page) => (
                    <div key={page.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={hasPermission(selectedUserData?.permissions, "page_access", page.id)}
                        onCheckedChange={() =>
                          showPermissions && togglePermission(
                            showPermissions,
                            selectedUserData?.permissions,
                            "page_access",
                            page.id
                          )
                        }
                        data-testid={`checkbox-page-${page.id}`}
                      />
                      <Label>{page.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Редактирование данных</h4>
                <div className="space-y-2">
                  {PAGES.map((page) => (
                    <div key={page.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={hasPermission(selectedUserData?.permissions, "edit_data", page.id)}
                        onCheckedChange={() =>
                          showPermissions && togglePermission(
                            showPermissions,
                            selectedUserData?.permissions,
                            "edit_data",
                            page.id
                          )
                        }
                        data-testid={`checkbox-edit-${page.id}`}
                      />
                      <Label>{page.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Видимость полей</h4>
                <div className="space-y-2">
                  {FIELDS.map((field) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={hasPermission(selectedUserData?.permissions, "view_field", field.id)}
                        onCheckedChange={() =>
                          showPermissions && togglePermission(
                            showPermissions,
                            selectedUserData?.permissions,
                            "view_field",
                            field.id
                          )
                        }
                        data-testid={`checkbox-field-${field.id}`}
                      />
                      <Label>{field.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowPermissions(null)}>Готово</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
