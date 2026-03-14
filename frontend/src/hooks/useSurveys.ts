import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { surveysApi } from "@/api/surveys";
import type {
  CreateSurveyRequest,
  GenerateQuestionsRequest,
  GenerateReplyRequest,
} from "@/types/survey";

export function useSurveys() {
  return useQuery({
    queryKey: ["surveys"],
    queryFn: surveysApi.list,
  });
}

export function useSurvey(id: string) {
  return useQuery({
    queryKey: ["surveys", id],
    queryFn: () => surveysApi.get(id),
    enabled: !!id,
  });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSurveyRequest) => surveysApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => surveysApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useGenerateQuestions() {
  return useMutation({
    mutationFn: (data: GenerateQuestionsRequest) => surveysApi.generateQuestions(data),
  });
}

export function useGenerateReply() {
  return useMutation({
    mutationFn: (data: GenerateReplyRequest) => surveysApi.generateReply(data),
  });
}
