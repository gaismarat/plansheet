import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type WorkGroupInput, type WorkInput, type WorkUpdateInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { InsertBlock, UpdateBlockRequest, UpdateWorkGroupRequest } from "@shared/schema";

// ============================================
// BLOCKS HOOKS
// ============================================

export function useBlocks() {
  return useQuery({
    queryKey: [api.blocks.list.path],
    queryFn: async () => {
      const res = await fetch(api.blocks.list.path);
      if (!res.ok) throw new Error("Failed to fetch blocks");
      return api.blocks.list.responses[200].parse(await res.json());
    },
  });
}

export function useUnassignedGroups() {
  return useQuery({
    queryKey: [api.blocks.unassignedGroups.path],
    queryFn: async () => {
      const res = await fetch(api.blocks.unassignedGroups.path);
      if (!res.ok) throw new Error("Failed to fetch unassigned groups");
      return api.blocks.unassignedGroups.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBlock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertBlock) => {
      const validated = api.blocks.create.input.parse(data);
      const res = await fetch(api.blocks.create.path, {
        method: api.blocks.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create block");
      return api.blocks.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.blocks.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.blocks.unassignedGroups.path] });
      toast({ title: "Блок создан", description: "Новый блок успешно добавлен" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateBlockRequest) => {
      const validated = api.blocks.update.input.parse(updates);
      const url = buildUrl(api.blocks.update.path, { id });
      const res = await fetch(url, {
        method: api.blocks.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to update block");
      return api.blocks.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.blocks.list.path] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.blocks.delete.path, { id });
      const res = await fetch(url, { method: api.blocks.delete.method });
      if (!res.ok) throw new Error("Failed to delete block");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.blocks.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.blocks.unassignedGroups.path] });
      toast({ title: "Блок удалён", description: "Блок был удалён" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================
// WORK GROUPS HOOKS
// ============================================

export function useWorkGroups() {
  return useQuery({
    queryKey: [api.workGroups.list.path],
    queryFn: async () => {
      const res = await fetch(api.workGroups.list.path);
      if (!res.ok) throw new Error("Failed to fetch work groups");
      return api.workGroups.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateWorkGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: WorkGroupInput) => {
      const validated = api.workGroups.create.input.parse(data);
      const res = await fetch(api.workGroups.create.path, {
        method: api.workGroups.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create work group");
      return api.workGroups.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workGroups.list.path] });
      toast({ title: "Группа создана", description: "Новая группа работ успешно добавлена" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateWorkGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateWorkGroupRequest) => {
      const validated = api.workGroups.update.input.parse(updates);
      const url = buildUrl(api.workGroups.update.path, { id });
      const res = await fetch(url, {
        method: api.workGroups.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to update work group");
      return api.workGroups.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workGroups.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.blocks.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.blocks.unassignedGroups.path] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteWorkGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.workGroups.delete.path, { id });
      const res = await fetch(url, { method: api.workGroups.delete.method });
      if (!res.ok) throw new Error("Failed to delete work group");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workGroups.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.blocks.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.blocks.unassignedGroups.path] });
      toast({ title: "Группа удалена", description: "Группа работ была удалена" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================
// WORKS HOOKS
// ============================================

export function useCreateWork() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: WorkInput) => {
      const validated = api.works.create.input.parse(data);
      const res = await fetch(api.works.create.path, {
        method: api.works.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create work");
      return api.works.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workGroups.list.path] });
      toast({ title: "Работа добавлена", description: "Новая работа успешно создана" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateWork() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & WorkUpdateInput) => {
      const validated = api.works.update.input.parse(updates);
      const url = buildUrl(api.works.update.path, { id });
      const res = await fetch(url, {
        method: api.works.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to update work");
      return api.works.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workGroups.list.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/works/tree'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-people/summary'] });
    },
    onError: (error) => {
      toast({ title: "Ошибка обновления", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteWork() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.works.delete.path, { id });
      const res = await fetch(url, { method: api.works.delete.method });
      if (!res.ok) throw new Error("Failed to delete work");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workGroups.list.path] });
      toast({ title: "Работа удалена", description: "Запись о работе была удалена" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useMoveWorkUp() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.works.moveUp.path, { id });
      const res = await fetch(url, { method: api.works.moveUp.method });
      if (!res.ok) throw new Error("Failed to move work up");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workGroups.list.path] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useMoveWorkDown() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.works.moveDown.path, { id });
      const res = await fetch(url, { method: api.works.moveDown.method });
      if (!res.ok) throw new Error("Failed to move work down");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workGroups.list.path] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================
// HOLIDAYS HOOKS
// ============================================

export function useHolidays() {
  return useQuery({
    queryKey: [api.holidays.list.path],
    queryFn: async () => {
      const res = await fetch(api.holidays.list.path);
      if (!res.ok) throw new Error("Failed to fetch holidays");
      return api.holidays.list.responses[200].parse(await res.json());
    },
  });
}

export function useToggleHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch(api.holidays.toggle.path, {
        method: api.holidays.toggle.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error("Failed to toggle holiday");
      return api.holidays.toggle.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.holidays.list.path] });
    },
  });
}

// ============================================
// WORK PEOPLE HOOKS
// ============================================

export function useWorkPeopleSummary() {
  return useQuery<Record<number, { actualToday: number; averageActual: number; weekendHolidayWorkedDays: number }>>({
    queryKey: ['/api/work-people/summary'],
    queryFn: async () => {
      const res = await fetch('/api/work-people/summary');
      if (!res.ok) throw new Error("Failed to fetch work people summary");
      return res.json();
    },
  });
}

// ============================================
// PROGRESS SUBMISSIONS HOOKS
// ============================================

export function useLatestProgressSubmissions() {
  return useQuery<Record<number, { id: number; workId: number; percent: number; status: string; submitterId: number }>>({
    queryKey: ['/api/progress/latest-all'],
    queryFn: async () => {
      const res = await fetch('/api/progress/latest-all');
      if (!res.ok) throw new Error("Failed to fetch progress submissions");
      return res.json();
    },
  });
}

export function useSubmitProgress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ workId, percent }: { workId: number; percent: number }) => {
      const res = await fetch('/api/progress/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId, percent }),
      });
      if (!res.ok) throw new Error("Failed to submit progress");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress/latest-all'] });
      toast({ title: "Прогресс отправлен", description: "Ожидает согласования" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useApproveProgress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (submissionId: number) => {
      const res = await fetch(`/api/progress/${submissionId}/approve`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error("Failed to approve progress");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress/latest-all'] });
      queryClient.invalidateQueries({ queryKey: [api.workGroups.list.path] });
      toast({ title: "Прогресс согласован" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useRejectProgress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (submissionId: number) => {
      const res = await fetch(`/api/progress/${submissionId}/reject`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error("Failed to reject progress");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress/latest-all'] });
      toast({ title: "Прогресс отклонён" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================
// WORKS TREE HOOKS (PDC-based hierarchy)
// ============================================

import type { WorksTreeResponse, WorkMaterial } from "@shared/schema";

export function useWorksTree() {
  return useQuery<WorksTreeResponse>({
    queryKey: ['/api/works/tree'],
    queryFn: async () => {
      const res = await fetch('/api/works/tree');
      if (!res.ok) throw new Error("Failed to fetch works tree");
      return res.json();
    },
  });
}

export function useWorkMaterials(workId: number) {
  return useQuery<WorkMaterial[]>({
    queryKey: ['/api/works', workId, 'materials'],
    queryFn: async () => {
      const res = await fetch(`/api/works/${workId}/materials`);
      if (!res.ok) throw new Error("Failed to fetch work materials");
      return res.json();
    },
    enabled: workId > 0,
  });
}

// ============================================
// WORK SECTION PROGRESS HOOKS
// ============================================

export interface WorkSectionProgressItem {
  id: number;
  workId: number;
  sectionNumber: number;
  progressPercentage: number;
  volumeActual: number;
  costActual: number;
  updatedAt: string;
}

export function useWorkSectionProgress(workId: number) {
  return useQuery<WorkSectionProgressItem[]>({
    queryKey: ['/api/works', workId, 'section-progress'],
    queryFn: async () => {
      const res = await fetch(`/api/works/${workId}/section-progress`);
      if (!res.ok) throw new Error("Failed to fetch section progress");
      return res.json();
    },
    enabled: workId > 0,
  });
}

export function useAllWorkSectionProgress() {
  return useQuery<Record<number, WorkSectionProgressItem[]>>({
    queryKey: ['/api/work-section-progress/all'],
    queryFn: async () => {
      const res = await fetch('/api/work-section-progress/all');
      if (!res.ok) throw new Error("Failed to fetch all section progress");
      return res.json();
    },
  });
}

export function useUpdateSectionProgress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ workId, sectionNumber, progressPercentage, volumeActual, costActual }: {
      workId: number;
      sectionNumber: number;
      progressPercentage: number;
      volumeActual?: number;
      costActual?: number;
    }) => {
      const res = await fetch(`/api/works/${workId}/section-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionNumber, progressPercentage, volumeActual, costActual }),
      });
      if (!res.ok) throw new Error("Failed to update section progress");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/works', variables.workId, 'section-progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-section-progress/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/works/tree'] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteSectionProgress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ workId, sectionNumber }: { workId: number; sectionNumber: number }) => {
      const res = await fetch(`/api/works/${workId}/section-progress/${sectionNumber}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete section progress");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/works', variables.workId, 'section-progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-section-progress/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/works/tree'] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================
// PROJECTS HOOKS
// ============================================

import type { Project, ProjectPermission, ProjectWithPermission, Notification } from "@shared/schema";

export function useProjects() {
  return useQuery<ProjectWithPermission[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });
}

export function useDeletedProjects() {
  return useQuery<Project[]>({
    queryKey: ['/api/projects/deleted'],
    queryFn: async () => {
      const res = await fetch('/api/projects/deleted');
      if (!res.ok) throw new Error("Failed to fetch deleted projects");
      return res.json();
    },
  });
}

export function useProject(id: number) {
  return useQuery<Project>({
    queryKey: ['/api/projects', id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: id > 0,
  });
}

export function useMyProjectPermission(projectId: number) {
  return useQuery<ProjectPermission | null>({
    queryKey: ['/api/projects', projectId, 'my-permission'],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/my-permission`);
      if (!res.ok) throw new Error("Failed to fetch permission");
      return res.json();
    },
    enabled: projectId > 0,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      return res.json() as Promise<Project>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({ title: "Проект создан" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to update project");
      return res.json() as Promise<Project>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({ title: "Проект обновлён" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete project");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/deleted'] });
      toast({ title: "Проект удалён" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useRestoreProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/projects/${id}/restore`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to restore project");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/deleted'] });
      toast({ title: "Проект восстановлен" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useDuplicateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to duplicate project");
      return res.json() as Promise<Project>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({ title: "Проект дублирован" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================
// NOTIFICATIONS HOOKS
// ============================================

export function useNotifications() {
  return useQuery<(Notification & { projectName: string | null })[]>({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
  });
}

export function useUnreadNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) throw new Error("Failed to fetch unread count");
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/mark-read', { method: 'POST' });
      if (!res.ok) throw new Error("Failed to mark notifications as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });
}

// ============================================
// PROJECT PERMISSIONS HOOKS
// ============================================

export function useProjectPermissions(projectId: number) {
  return useQuery<(ProjectPermission & { username: string })[]>({
    queryKey: ['/api/projects', projectId, 'permissions'],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/permissions`);
      if (!res.ok) throw new Error("Failed to fetch project permissions");
      return res.json();
    },
    enabled: projectId > 0,
  });
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, permission }: { projectId: number; permission: any }) => {
      const res = await fetch(`/api/projects/${projectId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permission),
      });
      if (!res.ok) throw new Error("Failed to add member");
      return res.json();
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'permissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({ title: "Участник добавлен" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateProjectPermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ permissionId, updates }: { permissionId: number; updates: any; projectId: number }) => {
      const res = await fetch(`/api/project-permissions/${permissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update permission");
      return res.json();
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'permissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({ title: "Права обновлены" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: number; userId: number }) => {
      const res = await fetch(`/api/projects/${projectId}/permissions/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to remove member");
      }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'permissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({ title: "Участник удалён" });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, toUserId }: { projectId: number; toUserId: number }) => {
      const res = await fetch(`/api/projects/${projectId}/transfer-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to transfer ownership");
      }
      return res.json();
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'permissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({ title: "Права владельца переданы. Переход завершится через 15 дней." });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}
