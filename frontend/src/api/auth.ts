import { apiClient } from "./client";
import type { LoginRequest, TokenResponse, User } from "@/types/auth";

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>("/auth/login", data).then((r) => r.data),

  getMe: () =>
    apiClient.get<User>("/users/me").then((r) => r.data),
};
