import { apiClient } from "./client";
import type { Video, VideoDetail, GenerateCaptionRequest } from "@/types/video";

export const videosApi = {
  list: () => apiClient.get<Video[]>("/videos/").then((r) => r.data),
  get: (id: string) =>
    apiClient.get<VideoDetail>(`/videos/${id}`).then((r) => r.data),
  upload: (title: string, file: File) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);
    return apiClient
      .post<Video>("/videos/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  delete: (id: string) => apiClient.delete(`/videos/${id}`),
  analyze: (id: string) =>
    apiClient
      .post<{ status: string; analysis: VideoDetail["analysis"] }>(
        `/videos/${id}/analyze`
      )
      .then((r) => r.data),
  generateCaption: (data: GenerateCaptionRequest) =>
    apiClient
      .post<{ caption: string }>("/videos/generate-caption", data)
      .then((r) => r.data),
};
