export interface AgentConfig {
  id: string;
  name: string;
  display_name: string;
  icon: string;
  description: string;
  available: boolean;
  skills: string[];
  preferred_agent: string;
}

export interface AgentSession {
  id: string;
  agent_name: string;
  title: string;
  created_at: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface AgentEvent {
  type: "text" | "error" | "done" | "session";
  content?: string;
  session_id?: string;
}
