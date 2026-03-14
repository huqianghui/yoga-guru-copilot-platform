import { apiClient } from "./client";
import type {
  Survey,
  CreateSurveyRequest,
  GenerateQuestionsRequest,
  GenerateReplyRequest,
} from "@/types/survey";

export const surveysApi = {
  list: () => apiClient.get<Survey[]>("/surveys/").then((r) => r.data),
  get: (id: string) => apiClient.get<Survey>(`/surveys/${id}`).then((r) => r.data),
  create: (data: CreateSurveyRequest) =>
    apiClient.post<Survey>("/surveys/", data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/surveys/${id}`),
  generateQuestions: (data: GenerateQuestionsRequest) =>
    apiClient
      .post<{ generated_content: string }>("/surveys/generate-questions", data)
      .then((r) => r.data),
  generateReply: (data: GenerateReplyRequest) =>
    apiClient
      .post<{ generated_reply: string }>("/surveys/generate-reply", data)
      .then((r) => r.data),
};
