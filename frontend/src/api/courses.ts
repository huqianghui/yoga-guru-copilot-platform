import { apiClient } from "./client";
import type { Course, CreateCourseRequest, GenerateCourseRequest } from "@/types/course";

export const coursesApi = {
  list: () => apiClient.get<Course[]>("/courses/").then((r) => r.data),
  get: (id: string) => apiClient.get<Course>(`/courses/${id}`).then((r) => r.data),
  create: (data: CreateCourseRequest) =>
    apiClient.post<Course>("/courses/", data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/courses/${id}`),
  generate: (data: GenerateCourseRequest) =>
    apiClient
      .post<{ generated_content: string }>("/courses/generate", data)
      .then((r) => r.data),
};
