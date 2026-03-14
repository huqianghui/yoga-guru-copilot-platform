import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { videosApi } from "@/api/videos";
import type { GenerateCaptionRequest } from "@/types/video";

export function useVideos() {
  return useQuery({
    queryKey: ["videos"],
    queryFn: videosApi.list,
  });
}

export function useVideo(id: string) {
  return useQuery({
    queryKey: ["videos", id],
    queryFn: () => videosApi.get(id),
    enabled: !!id,
  });
}

export function useUploadVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, file }: { title: string; file: File }) =>
      videosApi.upload(title, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => videosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useAnalyzeVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => videosApi.analyze(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

export function useGenerateCaption() {
  return useMutation({
    mutationFn: (data: GenerateCaptionRequest) =>
      videosApi.generateCaption(data),
  });
}
