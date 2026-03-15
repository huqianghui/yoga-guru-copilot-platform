export interface AgentConfig {
  id: string;
  name: string;
  display_name: string;
  icon: string;
  description: string;
  available: boolean;
  skills: string[];
  preferred_agent: string;
  agent_type: "copilot" | "system";
  modes?: string[];
  version?: string;
  provider?: string;
  model_name?: string;
  install_hint?: string;
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

export interface AgentConfigAdmin {
  id: string;
  name: string;
  display_name: string;
  icon: string;
  description: string;
  system_prompt: string;
  skills: string[];
  preferred_agent: string;
  fallback_agents: string[];
  available: boolean;
  model_config_json: Record<string, unknown>;
  agent_type: "copilot" | "system";
  modes?: string[];
  version?: string;
  provider?: string;
  model_name?: string;
  install_hint?: string;
  tools?: string[];
  mcp_servers?: string[];
  created_at: string;
  updated_at: string;
}

export interface AgentConfigCreate {
  name: string;
  display_name: string;
  icon?: string;
  description?: string;
  system_prompt?: string;
  skills?: string[];
  preferred_agent?: string;
  fallback_agents?: string[];
  available?: boolean;
  model_config_json?: Record<string, unknown>;
  agent_type?: "copilot" | "system";
  modes?: string[];
  version?: string;
  provider?: string;
  model_name?: string;
  install_hint?: string;
  tools?: string[];
  mcp_servers?: string[];
}

export interface AgentConfigUpdate {
  display_name?: string;
  icon?: string;
  description?: string;
  system_prompt?: string;
  skills?: string[];
  preferred_agent?: string;
  fallback_agents?: string[];
  available?: boolean;
  model_config_json?: Record<string, unknown>;
  agent_type?: "copilot" | "system";
  modes?: string[];
  version?: string;
  provider?: string;
  model_name?: string;
  install_hint?: string;
  tools?: string[];
  mcp_servers?: string[];
}

export interface AdapterInfo {
  name: string;
  available: boolean;
}
