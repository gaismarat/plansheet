import { useState, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  useProjects, 
  useProjectPermissions, 
  useAddProjectMember, 
  useUpdateProjectPermission, 
  useRemoveProjectMember,
  useTransferOwnership 
} from "@/hooks/use-construction";
import { Plus, Trash2, Key, Settings, User, Shield, ArrowLeft, Crown, UserCog, UserMinus, AlertTriangle, Building2 } from "lucide-react";
import type { SafeUser, Permission, ProjectPermission, ProjectWithPermission } from "@shared/schema";

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

const PROJECT_PERMISSIONS = [
  { key: "worksView", label: "Работы - просмотр", group: "works" },
  { key: "worksEdit", label: "Работы - редактирование", group: "works" },
  { key: "worksEditProgress", label: "Работы - редактировать прогресс", group: "works" },
  { key: "worksSeeAmounts", label: "Работы - видеть суммы", group: "works" },
  { key: "pdcView", label: "ПДС - просмотр", group: "pdc" },
  { key: "pdcEdit", label: "ПДС - редактирование", group: "pdc" },
  { key: "budgetView", label: "Бюджет - просмотр", group: "budget" },
  { key: "budgetEdit", label: "Бюджет - редактирование", group: "budget" },
  { key: "kspView", label: "КСП - просмотр", group: "ksp" },
  { key: "kspEdit", label: "КСП - редактирование", group: "ksp" },
  { key: "peopleView", label: "Люди - просмотр", group: "people" },
  { key: "peopleEdit", label: "Люди - редактирование", group: "people" },
  { key: "analyticsView", label: "Аналитика - просмотр", group: "analytics" },
  { key: "calendarView", label: "Календарь - просмотр", group: "calendar" },
  { key: "calendarEdit", label: "Календарь - редактирование", group: "calendar" },
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
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<number | null>(null);
  const [showEditMemberPermissions, setShowEditMemberPermissions] = useState<(ProjectPermission & { username: string }) | null>(null);
  const [showTransferOwnership, setShowTransferOwnership] = useState(false);
  const [transferToUserId, setTransferToUserId] = useState<number | null>(null);

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  
  const manageableProjects = useMemo(() => {
    return projects.filter(p => p.permission?.isOwner || p.permission?.isAdmin);
  }, [projects]);
  
  const canManageAnyProject = manageableProjects.length > 0;
  const isSystemAdmin = user?.isAdmin ?? false;
  
  if (!projectsLoading && !isSystemAdmin && !canManageAnyProject) {
    setLocation("/");
    return null;
  }

  const { data: users = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
    enabled: isSystemAdmin || canManageAnyProject,
  });

  const { data: selectedUserData } = useQuery<UserWithPermissions>({
    queryKey: ["/api/users", showPermissions],
    enabled: showPermissions !== null,
  });

  const { data: projectPermissions = [] } = useProjectPermissions(selectedProjectId || 0);
  
  const addMember = useAddProjectMember();
  const updatePermission = useUpdateProjectPermission();
  const removeMember = useRemoveProjectMember();
  const transferOwnership = useTransferOwnership();

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const myProjectPerm = selectedProject?.permission;
  const canManageProject = myProjectPerm?.isOwner || myProjectPerm?.isAdmin;

  const usersNotInProject = useMemo(() => {
    if (!selectedProjectId) return [];
    const memberUserIds = new Set(projectPermissions.map(p => p.userId));
    return users.filter(u => !memberUserIds.has(u.id));
  }, [users, projectPermissions, selectedProjectId]);

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

  const handleAddMember = () => {
    if (!selectedProjectId || !selectedUserToAdd) return;
    
    addMember.mutate({
      projectId: selectedProjectId,
      permission: {
        userId: selectedUserToAdd,
        isOwner: false,
        isAdmin: false,
        worksView: true,
        worksEdit: false,
        worksEditProgress: true,
        worksSeeAmounts: false,
        pdcView: false,
        pdcEdit: false,
        budgetView: false,
        budgetEdit: false,
        kspView: true,
        kspEdit: false,
        peopleView: true,
        peopleEdit: false,
        analyticsView: false,
        calendarView: true,
        calendarEdit: false,
      }
    });
    setShowAddMember(false);
    setSelectedUserToAdd(null);
  };

  const handleUpdateMemberPermission = (key: string, value: boolean) => {
    if (!showEditMemberPermissions || !selectedProjectId) return;
    
    updatePermission.mutate({
      permissionId: showEditMemberPermissions.id,
      projectId: selectedProjectId,
      updates: { [key]: value }
    });
    
    setShowEditMemberPermissions(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleToggleAdmin = (perm: ProjectPermission & { username: string }) => {
    if (!selectedProjectId) return;
    
    updatePermission.mutate({
      permissionId: perm.id,
      projectId: selectedProjectId,
      updates: { isAdmin: !perm.isAdmin }
    });
  };

  const handleRemoveMember = (userId: number) => {
    if (!selectedProjectId) return;
    removeMember.mutate({ projectId: selectedProjectId, userId });
  };

  const handleTransferOwnership = () => {
    if (!selectedProjectId || !transferToUserId) return;
    
    transferOwnership.mutate({ projectId: selectedProjectId, toUserId: transferToUserId });
    setShowTransferOwnership(false);
    setTransferToUserId(null);
  };

  const getRoleBadge = (perm: ProjectPermission) => {
    if (perm.isOwner) {
      return <Badge variant="default" className="bg-yellow-600"><Crown className="w-3 h-3 mr-1" />Владелец</Badge>;
    }
    if (perm.isAdmin) {
      return <Badge variant="default" className="bg-blue-600"><Shield className="w-3 h-3 mr-1" />Администратор</Badge>;
    }
    return <Badge variant="secondary">Участник</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Управление пользователями</h1>
          </div>
        </div>

        <Tabs defaultValue={isSystemAdmin ? "users" : "projects"} className="w-full">
          <TabsList>
            {isSystemAdmin && (
              <TabsTrigger value="users" data-testid="tab-users">
                <User className="w-4 h-4 mr-2" />
                Пользователи системы
              </TabsTrigger>
            )}
            {canManageAnyProject && (
              <TabsTrigger value="projects" data-testid="tab-projects">
                <Building2 className="w-4 h-4 mr-2" />
                Права в проектах
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="users" className="mt-4">
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
                          <Badge variant="default" className="bg-primary">
                            Админ системы
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowPermissions(u.id)}
                          disabled={u.isAdmin}
                          title="Глобальные разрешения"
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
          </TabsContent>

          <TabsContent value="projects" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Выберите проект</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedProjectId?.toString() || ""}
                  onValueChange={(v) => setSelectedProjectId(Number(v))}
                >
                  <SelectTrigger data-testid="select-project">
                    <SelectValue placeholder="Выберите проект..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                        {p.permission?.isOwner && " (Владелец)"}
                        {p.permission?.isAdmin && !p.permission?.isOwner && " (Админ)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedProjectId && canManageProject && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <CardTitle>Участники проекта</CardTitle>
                  <div className="flex gap-2">
                    {myProjectPerm?.isOwner && (
                      <Button 
                        variant="outline" 
                        onClick={() => setShowTransferOwnership(true)}
                        data-testid="button-transfer-ownership"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Передать владение
                      </Button>
                    )}
                    <Button onClick={() => setShowAddMember(true)} data-testid="button-add-member">
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить участника
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {projectPermissions.map((perm) => (
                      <div
                        key={perm.id}
                        className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                        data-testid={`project-member-${perm.userId}`}
                      >
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">{perm.username}</span>
                          {getRoleBadge(perm)}
                          {perm.ownerExpiresAt && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Переход владения
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {!perm.isOwner && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowEditMemberPermissions(perm)}
                                title="Редактировать права"
                                data-testid={`button-edit-member-${perm.userId}`}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                              {myProjectPerm?.isOwner && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleAdmin(perm)}
                                  title={perm.isAdmin ? "Снять администратора" : "Назначить администратором"}
                                  data-testid={`button-toggle-admin-${perm.userId}`}
                                >
                                  <UserCog className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveMember(perm.userId)}
                                title="Удалить из проекта"
                                data-testid={`button-remove-member-${perm.userId}`}
                              >
                                <UserMinus className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {projectPermissions.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">Нет участников</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedProjectId && !canManageProject && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  У вас нет прав на управление участниками этого проекта
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

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
                <Label htmlFor="isAdmin">Администратор системы</Label>
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
                Глобальные разрешения: {users.find(u => u.id === showPermissions)?.username}
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

        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить участника</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Выберите пользователя</Label>
                <Select
                  value={selectedUserToAdd?.toString() || ""}
                  onValueChange={(v) => setSelectedUserToAdd(Number(v))}
                >
                  <SelectTrigger data-testid="select-user-to-add">
                    <SelectValue placeholder="Выберите пользователя..." />
                  </SelectTrigger>
                  <SelectContent>
                    {usersNotInProject.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Участник будет добавлен с правами по умолчанию: просмотр Работ, КСП, Людей, Календаря; 
                редактирование прогресса; без доступа к суммам.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddMember(false)}>
                Отмена
              </Button>
              <Button 
                onClick={handleAddMember} 
                disabled={!selectedUserToAdd}
                data-testid="button-confirm-add-member"
              >
                Добавить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditMemberPermissions !== null} onOpenChange={() => setShowEditMemberPermissions(null)}>
          <DialogContent className="max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                Права участника: {showEditMemberPermissions?.username}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-4">
                {["works", "pdc", "budget", "ksp", "people", "analytics", "calendar"].map((group) => {
                  const groupPerms = PROJECT_PERMISSIONS.filter(p => p.group === group);
                  const groupLabels: Record<string, string> = {
                    works: "Работы",
                    pdc: "ПДС",
                    budget: "Бюджет",
                    ksp: "КСП",
                    people: "Люди",
                    analytics: "Аналитика",
                    calendar: "Календарь"
                  };
                  
                  return (
                    <div key={group}>
                      <h4 className="font-medium mb-2">{groupLabels[group]}</h4>
                      <div className="space-y-2 pl-2">
                        {groupPerms.map((perm) => (
                          <div key={perm.key} className="flex items-center gap-2">
                            <Checkbox
                              checked={showEditMemberPermissions?.[perm.key as keyof ProjectPermission] as boolean}
                              onCheckedChange={(c) => handleUpdateMemberPermission(perm.key, !!c)}
                              data-testid={`checkbox-perm-${perm.key}`}
                            />
                            <Label className="text-sm">{perm.label.split(" - ")[1]}</Label>
                          </div>
                        ))}
                      </div>
                      <Separator className="mt-3" />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button onClick={() => setShowEditMemberPermissions(null)}>Готово</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showTransferOwnership} onOpenChange={setShowTransferOwnership}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Передача владения проектом
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                После передачи права владельца перейдут новому владельцу через 15 дней. 
                В течение этого периода оба пользователя будут иметь полные права. 
                После завершения перехода вы станете Администратором проекта.
              </p>
              <p className="text-sm font-medium text-destructive">
                Это действие нельзя отменить!
              </p>
              <div className="space-y-2">
                <Label>Новый владелец</Label>
                <Select
                  value={transferToUserId?.toString() || ""}
                  onValueChange={(v) => setTransferToUserId(Number(v))}
                >
                  <SelectTrigger data-testid="select-transfer-to">
                    <SelectValue placeholder="Выберите нового владельца..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projectPermissions
                      .filter(p => !p.isOwner && p.userId !== user?.id)
                      .map((p) => (
                        <SelectItem key={p.userId} value={p.userId.toString()}>
                          {p.username}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransferOwnership(false)}>
                Отмена
              </Button>
              <Button 
                variant="destructive"
                onClick={handleTransferOwnership} 
                disabled={!transferToUserId}
                data-testid="button-confirm-transfer"
              >
                Передать владение
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
