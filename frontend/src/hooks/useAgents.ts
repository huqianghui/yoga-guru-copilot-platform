import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsApi } from "@/api/agents";
import type { AgentConfigCreate, AgentConfigUpdate } from "@/types/agent";

export function useAgentList() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: agentsApi.list,
  });
}

export function useAgentSessions(agentName?: string) {
  return useQuery({
    queryKey: ["agent-sessions", agentName],
    queryFn: () => agentsApi.listSessions(agentName),
  });
}

export function useAgentMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ["agent-messages", sessionId],
    queryFn: () => agentsApi.getMessages(sessionId!),
    enabled: !!sessionId,
  });
}

export function useAdapters() {
  return useQuery({
    queryKey: ["adapters"],
    queryFn: agentsApi.listAdapters,
  });
}

export function useRefreshAgents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentsApi.refreshAgents,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}

export function useAgentLocalConfig(name: string) {
  return useQuery({
    queryKey: ["agent-local-config", name],
    queryFn: () => agentsApi.getAgentLocalConfig(name),
    enabled: !!name,
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => agentsApi.deleteSession(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-sessions"] }),
  });
}

export function useCreateAgentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AgentConfigCreate) => agentsApi.createConfig(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}

export function useUpdateAgentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, body }: { name: string; body: AgentConfigUpdate }) =>
      agentsApi.updateConfig(name, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}

export function useDeleteAgentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => agentsApi.deleteConfig(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}
