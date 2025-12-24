import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type WorkGroupInput, type WorkInput, type WorkUpdateInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

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
      // Toasts can be noisy for frequent updates like sliders, maybe optional here
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
