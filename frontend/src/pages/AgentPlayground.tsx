import { useState, useRef, useEffect, useCallback } from "react";
import { Wrench, Plug, Plus, Send, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentList } from "@/hooks/useAgents";
import { AgentWebSocket } from "@/api/agents";
import { MessageBubble } from "@/components/agent/MessageBubble";
import type { AgentConfig, AgentEvent, AgentMessage } from "@/types/agent";

type AgentMode = "plan" | "ask" | "code";

export default function AgentPlayground() {
  const { data: agents } = useAgentList();

  // Show all agents: system agents first, then copilot agents
  const allAgents = agents ?? [];
  const systemAgents = allAgents.filter((a) => a.agent_type === "system");
  const copilotAgents = allAgents.filter((a) => a.agent_type !== "system");

  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [mode, setMode] = useState<AgentMode>("ask");
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [queue, setQueue] = useState<string[]>([]);

  const wsRef = useRef<AgentWebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgCounterRef = useRef(0);

  // Auto-select first system agent (or first available agent)
  useEffect(() => {
    if (allAgents.length > 0 && !selectedAgent) {
      setSelectedAgent(systemAgents[0] ?? allAgents[0]);
    }
  }, [allAgents, systemAgents, selectedAgent]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Cleanup WS on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const processQueue = useCallback(() => {
    if (queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    sendMessageToAgent(next);
  }, [queue]);

  // Process queue when streaming ends
  useEffect(() => {
    if (!isStreaming && queue.length > 0) {
      processQueue();
    }
  }, [isStreaming, queue, processQueue]);

  const handleEvent = useCallback((event: AgentEvent) => {
    switch (event.type) {
      case "session":
        if (event.session_id) setSessionId(event.session_id);
        break;
      case "text":
      case "code":
        setStreamingContent((prev) => prev + (event.content ?? ""));
        break;
      case "done":
        setStreamingContent((prev) => {
          if (prev) {
            const newMsg: AgentMessage = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: prev,
              created_at: new Date().toISOString(),
            };
            setMessages((msgs) => [...msgs, newMsg]);
          }
          return "";
        });
        setIsStreaming(false);
        break;
      case "error":
        setStreamingContent("");
        setIsStreaming(false);
        const errMsg: AgentMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Error: ${event.content ?? "Unknown error"}`,
          created_at: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, errMsg]);
        break;
    }
  }, []);

  const sendMessageToAgent = useCallback((text: string) => {
    if (!selectedAgent || !text.trim()) return;

    // Ensure WS connection
    if (!wsRef.current) {
      wsRef.current = new AgentWebSocket(selectedAgent.name, handleEvent);
      // Wait for connection
      setTimeout(() => {
        wsRef.current?.send(text.trim(), sessionId || undefined, mode);
      }, 500);
    } else {
      wsRef.current.send(text.trim(), sessionId || undefined, mode);
    }

    msgCounterRef.current++;
    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((msgs) => [...msgs, userMsg]);
    setIsStreaming(true);
    setStreamingContent("");
  }, [selectedAgent, sessionId, mode, handleEvent]);

  const handleSend = () => {
    if (!input.trim()) return;

    if (isStreaming) {
      // Queue the message
      setQueue((q) => [...q, input.trim()]);
      setInput("");
      return;
    }

    sendMessageToAgent(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const switchAgent = (agent: AgentConfig) => {
    // Close existing WS
    wsRef.current?.close();
    wsRef.current = null;
    // Reset state
    setSelectedAgent(agent);
    setSessionId("");
    setMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
    setQueue([]);
    msgCounterRef.current = 0;
    // Default mode to first available (copilot agents default to "ask")
    if (agent.modes && agent.modes.length > 0) {
      setMode((agent.modes.includes("ask") ? "ask" : agent.modes[0]) as AgentMode);
    } else {
      setMode("ask");
    }
  };

  const startNewSession = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setSessionId("");
    setMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
    setQueue([]);
    msgCounterRef.current = 0;
  };

  const agentModes = selectedAgent?.modes ?? ["ask"];

  const renderAgentCard = (agent: AgentConfig) => (
    <button
      key={agent.name}
      onClick={() => switchAgent(agent)}
      className={cn(
        "w-full text-left p-3 rounded-xl transition-all border",
        selectedAgent?.name === agent.name
          ? "border-blue-300 bg-blue-50/80 shadow-sm"
          : "border-transparent hover:bg-gray-50/80"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{agent.icon}</span>
          <span className="font-semibold text-sm text-gray-800">{agent.display_name}</span>
        </div>
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
          agent.available
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500"
        )}>
          {agent.available ? "ON" : "OFF"}
        </span>
      </div>
      <p className="text-xs text-gray-500 line-clamp-2 mb-1.5">
        {agent.description}
      </p>
      {agent.version && (
        <p className="text-[10px] text-gray-400 mb-1.5">v{agent.version}</p>
      )}
      <div className="flex items-center gap-2">
        {(agent.tools?.length ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">
            <Wrench className="w-2.5 h-2.5" />
            {agent.tools?.length} tools
          </span>
        )}
        {(agent.mcp_servers?.length ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full">
            <Plug className="w-2.5 h-2.5" />
            {agent.mcp_servers?.length} MCP
          </span>
        )}
      </div>
    </button>
  );

  return (
    <div className="flex h-full">
      {/* Left Panel - Agent List */}
      <div className="w-64 border-r border-purple-200/50 bg-white/60 backdrop-blur-sm flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-purple-200/50">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Agents</h2>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-1">
          {/* System Agents */}
          {systemAgents.length > 0 && (
            <div className="space-y-1">
              {systemAgents.map(renderAgentCard)}
            </div>
          )}

          {/* Copilot Agents */}
          {copilotAgents.length > 0 && (
            <>
              <div className="pt-2 pb-1 px-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Copilots</span>
              </div>
              <div className="space-y-1">
                {copilotAgents.map(renderAgentCard)}
              </div>
            </>
          )}
        </div>
        <div className="p-3 border-t border-purple-200/50">
          <button
            onClick={startNewSession}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Invoke New Session
          </button>
        </div>
      </div>

      {/* Center Panel - Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mode Tabs */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-purple-200/50 bg-white/40 backdrop-blur-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">Mode</span>
          {(["plan", "ask", "code"] as AgentMode[]).map((m) => {
            const available = agentModes.includes(m);
            return (
              <button
                key={m}
                onClick={() => available && setMode(m)}
                disabled={!available}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize",
                  m === mode
                    ? "bg-blue-500 text-white shadow-sm"
                    : available
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      : "bg-gray-50 text-gray-300 cursor-not-allowed"
                )}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Context bar */}
        <div className="px-6 py-2 text-xs text-gray-400 bg-white/20">
          No context attached
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-sm">Start a conversation with the agent</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={msg.id} className="relative">
              <MessageBubble role={msg.role === "user" ? "user" : "assistant"} content={msg.content} />
              <span className="absolute -right-2 bottom-0 text-[10px] text-gray-300 font-medium">
                {idx + 1}
              </span>
            </div>
          ))}
          {isStreaming && streamingContent && (
            <div className="relative">
              <MessageBubble role="assistant" content={streamingContent} isStreaming />
              <span className="absolute -right-2 bottom-0 text-[10px] text-gray-300 font-medium">
                {messages.length + 1}
              </span>
            </div>
          )}
          {isStreaming && !streamingContent && (
            <div className="flex justify-start">
              <div className="bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-2xl px-4 py-3 text-sm text-gray-500">
                <span>Thinking</span>
                <span className="animate-pulse">...</span>
                <div className="mt-1 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Queue indicator */}
        {queue.length > 0 && (
          <div className="px-6 py-1.5 bg-amber-50/80 border-t border-amber-200/50 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-600">Queued ({queue.length}):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {queue.map((text, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs bg-amber-100 text-amber-700 pl-2.5 pr-1 py-1 rounded-full max-w-[260px]"
                >
                  <span className="font-medium text-amber-800">{i + 1}.</span>
                  <span className="truncate">{text}</span>
                  <button
                    onClick={() => {
                      setInput(text);
                      setQueue((prev) => prev.filter((_item, j) => j !== i));
                    }}
                    className="hover:text-amber-900 p-0.5"
                    title="Edit"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setQueue((prev) => prev.filter((_item, j) => j !== i))}
                    className="hover:text-amber-900 p-0.5"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-6 py-3 border-t border-purple-200/50 bg-white/40 backdrop-blur-sm">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isStreaming ? "Type to queue next message..." : "Type a message..."}
              rows={2}
              className="flex-1 resize-none bg-white/80 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !selectedAgent}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {isStreaming && queue.length > 0 && (
            <div className="flex items-center justify-end mt-1.5">
              <span className="text-[10px] text-gray-400">{queue.length} message{queue.length > 1 ? "s" : ""} queued</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Agent Detail */}
      <div className="w-80 border-l border-purple-200/50 bg-white/60 backdrop-blur-sm flex-shrink-0 overflow-auto">
        {selectedAgent ? (
          <div className="p-5">
            {/* Agent header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{selectedAgent.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-800">{selectedAgent.display_name}</h3>
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    selectedAgent.available
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  )}>
                    {selectedAgent.available ? "ON" : "OFF"}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-500 mb-3">{selectedAgent.description}</p>

            {/* Version */}
            {selectedAgent.version && (
              <p className="text-xs text-gray-400 mb-4">
                Version: {selectedAgent.version}
              </p>
            )}

            {/* Provider & Model */}
            {(selectedAgent.provider || selectedAgent.model_name) && (
              <div className="mb-4 text-xs text-gray-500 space-y-1">
                {selectedAgent.provider && (
                  <p>Provider: <span className="font-medium text-gray-700">{selectedAgent.provider}</span></p>
                )}
                {selectedAgent.model_name && (
                  <p>Model: <span className="font-medium text-gray-700">{selectedAgent.model_name}</span></p>
                )}
              </div>
            )}

            {/* Modes */}
            <div className="mb-5">
              <div className="flex items-center gap-2 flex-wrap">
                {agentModes.map((m) => (
                  <span
                    key={m}
                    className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium capitalize"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Tools */}
            {(selectedAgent.tools?.length ?? 0) > 0 && (
              <div className="mb-5">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                  <Wrench className="w-3.5 h-3.5" />
                  Tools ({selectedAgent.tools?.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.tools?.map((tool) => (
                    <span
                      key={tool}
                      className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* MCP Servers */}
            {(selectedAgent.mcp_servers?.length ?? 0) > 0 && (
              <div className="mb-5">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                  <Plug className="w-3.5 h-3.5" />
                  MCP Servers ({selectedAgent.mcp_servers?.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.mcp_servers?.map((server) => (
                    <span
                      key={server}
                      className="text-[11px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full"
                    >
                      {server}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Skills (for copilot agents) */}
            {(selectedAgent.skills?.length ?? 0) > 0 && (
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Skills ({selectedAgent.skills?.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.skills?.map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">Select an agent</p>
          </div>
        )}
      </div>
    </div>
  );
}
