import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/admin";

export function useServiceConfigs(category?: string) {
  return useQuery({
    queryKey: ["service-configs", category],
    queryFn: () => adminApi.listConfigs(category),
  });
}

export function useUpsertConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminApi.upsertConfig(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-configs"] });
    },
  });
}

export function useDeleteConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => adminApi.deleteConfig(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-configs"] });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (serviceName: string) => adminApi.testConnection(serviceName),
  });
}

export function useSeedDefaults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.seedDefaults(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-configs"] });
    },
  });
}
