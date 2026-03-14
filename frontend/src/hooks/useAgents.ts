import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "@/api/agents";

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
