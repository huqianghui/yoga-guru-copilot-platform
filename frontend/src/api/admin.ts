import { apiClient } from "./client";
import type { ServiceConfig, ConnectionTestResult } from "@/types/admin";

export const adminApi = {
  listConfigs: (category?: string) => {
    const params = category ? { category } : {};
    return apiClient
      .get<ServiceConfig[]>("/admin/configs", { params })
      .then((r) => r.data);
  },

  upsertConfig: (key: string, value: string) =>
    apiClient
      .put<ServiceConfig>(`/admin/configs/${key}`, { value })
      .then((r) => r.data),

  deleteConfig: (key: string) => apiClient.delete(`/admin/configs/${key}`),

  testConnection: (serviceName: string) =>
    apiClient
      .post<ConnectionTestResult>(`/admin/test-connection/${serviceName}`)
      .then((r) => r.data),

  seedDefaults: () => apiClient.post("/admin/seed-defaults"),
};
