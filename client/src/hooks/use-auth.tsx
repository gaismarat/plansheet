import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SafeUser, Permission } from "@shared/schema";

type UserWithPermissions = SafeUser & { permissions: Permission[] };

interface AuthContextType {
  user: UserWithPermissions | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (type: string, resource: string) => boolean;
  hasPageAccess: (page: string) => boolean;
  canEdit: (page: string) => boolean;
  canViewField: (field: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ user: UserWithPermissions }>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: Infinity,
  });

  const user = data?.user ?? null;

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const hasPermission = (type: string, resource: string): boolean => {
    if (!user) return false;
    if (user.isAdmin) return true;
    const perm = user.permissions?.find(
      (p) => p.permissionType === type && p.resource === resource
    );
    return perm?.allowed ?? false;
  };

  const hasPageAccess = (page: string): boolean => {
    return hasPermission("page_access", page);
  };

  const canEdit = (page: string): boolean => {
    return hasPermission("edit_data", page);
  };

  const canViewField = (field: string): boolean => {
    return hasPermission("view_field", field);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasPermission,
        hasPageAccess,
        canEdit,
        canViewField,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
