import { apiClient } from "./client";

export interface DashboardStats {
  videos: number;
  courses: number;
  feedbacks: number;
  surveys: number;
}

export const dashboardApi = {
  getStats: () =>
    apiClient.get<DashboardStats>("/dashboard/stats").then((r) => r.data),
};
