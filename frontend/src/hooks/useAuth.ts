import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { authStore } from "@/stores/authStore";
import type { LoginRequest } from "@/types/auth";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getMe,
    enabled: authStore.isAuthenticated(),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data) => {
      authStore.setToken(data.access_token);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });

  const logout = () => {
    authStore.clearToken();
    queryClient.clear();
  };

  return {
    user,
    isLoading,
    isAuthenticated: authStore.isAuthenticated(),
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    logout,
  };
}
