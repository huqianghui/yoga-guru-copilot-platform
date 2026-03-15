import { apiClient } from "./client";
import type { AgentConfig, AgentSession, AgentMessage, AgentEvent, AgentConfigAdmin, AgentConfigCreate, AgentConfigUpdate, AdapterInfo } from "@/types/agent";

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

  createSession: (agentName: string, mode?: string, source?: string) =>
    apiClient.post<AgentSession>("/agents/sessions", {
      agent_name: agentName,
      mode: mode || "ask",
      source: source || "playground",
    }).then((r) => r.data),

  deleteSession: (sessionId: string) =>
    apiClient.delete(`/agents/sessions/${sessionId}`),

  // Admin methods
  listAdapters: () =>
    apiClient.get<AdapterInfo[]>("/agents/adapters").then((r) => r.data),

  refreshAgents: () =>
    apiClient.post<{ refreshed: Array<{ name: string; available: boolean; version: string | null }> }>("/agents/refresh").then((r) => r.data),

  getAgentLocalConfig: (name: string) =>
    apiClient.get<Record<string, unknown>>(`/agents/configs/${name}/local-config`).then((r) => r.data),

  createConfig: (body: AgentConfigCreate) =>
    apiClient.post<AgentConfigAdmin>("/agents/configs", body).then((r) => r.data),

  updateConfig: (name: string, body: AgentConfigUpdate) =>
    apiClient.patch<AgentConfigAdmin>(`/agents/configs/${name}`, body).then((r) => r.data),

  deleteConfig: (name: string) =>
    apiClient.delete(`/agents/configs/${name}`),
};

export class AgentWebSocket {
  private ws: WebSocket | null = null;
  private onEvent: (event: AgentEvent) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private agentName: string;

  constructor(agentName: string, onEvent: (event: AgentEvent) => void) {
    this.onEvent = onEvent;
    this.agentName = agentName;
    this.connect();
  }

  private connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.ws = new WebSocket(`${protocol}//${window.location.host}/api/agents/ws/${this.agentName}`);

    this.ws.onmessage = (e) => {
      const event: AgentEvent = JSON.parse(e.data);
      this.onEvent(event);
    };

    this.ws.onerror = () => {
      this.onEvent({ type: "error", content: "WebSocket connection error" });
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 8000);
        setTimeout(() => this.connect(), delay);
      }
    };

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };
  }

  send(message: string, sessionId?: string, mode?: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const token = localStorage.getItem("token");
      this.ws.send(JSON.stringify({ message, session_id: sessionId, token, mode }));
    }
  }

  close() {
    this.maxReconnectAttempts = 0; // Prevent reconnect on intentional close
    this.ws?.close();
  }
}
