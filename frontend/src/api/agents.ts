import { apiClient } from "./client";
import type { AgentConfig, AgentSession, AgentMessage, AgentEvent } from "@/types/agent";

export const agentsApi = {
  list: () =>
    apiClient.get<AgentConfig[]>("/agents/").then((r) => r.data),

  getConfig: (name: string) =>
    apiClient.get<AgentConfig>(`/agents/${name}`).then((r) => r.data),

  listSessions: (agentName?: string) =>
    apiClient
      .get<AgentSession[]>("/agents/sessions/list", { params: { agent_name: agentName } })
      .then((r) => r.data),

  getMessages: (sessionId: string) =>
    apiClient.get<AgentMessage[]>(`/agents/sessions/${sessionId}/messages`).then((r) => r.data),

  createSession: (agentName: string) =>
    apiClient.post<AgentSession>("/agents/sessions", { agent_name: agentName }).then((r) => r.data),
};

export class AgentWebSocket {
  private ws: WebSocket | null = null;
  private onEvent: (event: AgentEvent) => void;

  constructor(agentName: string, onEvent: (event: AgentEvent) => void) {
    this.onEvent = onEvent;
    this.ws = new WebSocket(`ws://${window.location.host}/api/agents/ws/${agentName}`);

    this.ws.onmessage = (e) => {
      const event: AgentEvent = JSON.parse(e.data);
      this.onEvent(event);
    };

    this.ws.onerror = () => {
      this.onEvent({ type: "error", content: "WebSocket connection error" });
    };
  }

  send(message: string, sessionId?: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const token = localStorage.getItem("token");
      this.ws.send(JSON.stringify({ message, session_id: sessionId, token }));
    }
  }

  close() {
    this.ws?.close();
  }
}
