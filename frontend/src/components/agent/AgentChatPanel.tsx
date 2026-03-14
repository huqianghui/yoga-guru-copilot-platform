import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, PanelRightClose, PanelRightOpen, MapPin } from "lucide-react";
import { useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { useAgentList } from "@/hooks/useAgents";
import { AgentWebSocket } from "@/api/agents";
import { MessageBubble } from "./MessageBubble";
import { CopilotSelector } from "./CopilotSelector";
import { ROUTE_AGENT_MAP, ROUTE_LABEL_MAP, usePageAgent } from "@/contexts/PageAgentContext";
import type { AgentEvent, AgentMessage } from "@/types/agent";

interface AgentChatPanelProps {
  open: boolean;
  onToggle: () => void;
}

export function AgentChatPanel({ open, onToggle }: AgentChatPanelProps) {
  const location = useLocation();
  const { pageContext } = usePageAgent();

  const defaultAgent = ROUTE_AGENT_MAP[location.pathname] || "yoga-general";
  const pageLabel = ROUTE_LABEL_MAP[location.pathname] || "未知页面";

  const [agentName, setAgentName] = useState(defaultAgent);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const wsRef = useRef<AgentWebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef(location.pathname);

  const { data: agents = [] } = useAgentList();

  // Auto-switch agent when page changes
  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      const newDefault = ROUTE_AGENT_MAP[location.pathname] || "yoga-general";
      setAgentName(newDefault);
      setMessages([]);
      setSessionId(null);
      setStreamContent("");
    }
  }, [location.pathname]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent]);

  const handleEvent = useCallback((event: AgentEvent) => {
    switch (event.type) {
      case "session":
        setSessionId(event.session_id || null);
        break;
      case "text":
        setStreamContent((prev) => prev + (event.content || ""));
        break;
      case "done":
        setStreaming(false);
        setStreamContent((prev) => {
          if (prev) {
            setMessages((msgs) => [...msgs, {
              id: Date.now().toString(),
              role: "assistant",
              content: prev,
              created_at: new Date().toISOString(),
            }]);
          }
          return "";
        });
        break;
      case "error":
        setStreaming(false);
        setStreamContent("");
        setMessages((msgs) => [...msgs, {
          id: Date.now().toString(),
          role: "assistant",
          content: `Error: ${event.content}`,
          created_at: new Date().toISOString(),
        }]);
        break;
    }
  }, []);

  const connectWs = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = new AgentWebSocket(agentName, handleEvent);
  }, [agentName, handleEvent]);

  useEffect(() => {
    if (open) {
      connectWs();
    }
    return () => wsRef.current?.close();
  }, [open, connectWs]);

  const handleSend = () => {
    if (!input.trim() || streaming) return;

    // Prepend page context to first message if available
    let messageContent = input.trim();
    if (messages.length === 0 && pageContext.taskHint) {
      messageContent = `[页面上下文: ${pageLabel} - ${pageContext.taskHint}]\n\n${messageContent}`;
    }

    const userMsg: AgentMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setStreamContent("");
    wsRef.current?.send(messageContent, sessionId || undefined);
    setInput("");
  };

  const handleAgentSwitch = (name: string) => {
    setAgentName(name);
    setMessages([]);
    setSessionId(null);
    setStreamContent("");
  };

  const currentAgent = agents.find((a) => a.name === agentName);

  return (
    <aside
      className={cn(
        "bg-white/80 backdrop-blur-sm border-l border-purple-200/50 transition-all duration-300 flex flex-col shadow-lg h-full",
        open ? "w-[400px]" : "w-14"
      )}
    >
      {/* Collapsed state — vertical toggle bar */}
      {!open && (
        <button
          onClick={onToggle}
          className="flex flex-col items-center justify-center gap-3 h-full w-full hover:bg-purple-50/50 transition-colors cursor-pointer group"
        >
          <PanelRightClose className="w-5 h-5 text-purple-500 group-hover:text-purple-700 transition-colors" />
          <span className="text-xs text-gray-500 writing-mode-vertical [writing-mode:vertical-rl] tracking-widest group-hover:text-purple-600 transition-colors">
            {currentAgent?.icon} {currentAgent?.display_name || "AI 助手"}
          </span>
          <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
        </button>
      )}

      {/* Expanded state — full chat panel */}
      {open && (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b border-purple-200/50 bg-gradient-to-r from-purple-50/80 to-green-50/80 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{currentAgent?.icon || "💬"}</span>
                <span className="font-semibold text-gray-800 text-sm">{currentAgent?.display_name || "Copilot"}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer" title="收起面板">
                  <PanelRightOpen className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-red-100 transition-colors cursor-pointer" title="关闭">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            <CopilotSelector agents={agents} selected={agentName} onSelect={handleAgentSwitch} />
            {/* Page context indicator */}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-purple-500">
              <MapPin className="w-3 h-3" />
              <span>当前页面: {pageLabel}</span>
              {pageContext.taskHint && (
                <span className="text-gray-400 truncate ml-1">· {pageContext.taskHint}</span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !streaming && (
              <div className="text-center text-gray-400 mt-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-green-100 flex items-center justify-center">
                  <span className="text-2xl">{currentAgent?.icon || "💬"}</span>
                </div>
                <p className="text-sm font-medium">向 {currentAgent?.display_name} 提问</p>
                <p className="text-xs mt-1 max-w-[260px] mx-auto">{currentAgent?.description}</p>
                <p className="text-xs mt-3 text-purple-400">我了解你当前在「{pageLabel}」页面的上下文</p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} role={msg.role as "user" | "assistant"} content={msg.content} />
            ))}
            {streaming && streamContent && (
              <MessageBubble role="assistant" content={streamContent} isStreaming />
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-purple-200/50 flex-shrink-0">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="输入消息..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-purple-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                disabled={streaming}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className={cn(
                  "p-2.5 rounded-xl transition-all cursor-pointer",
                  input.trim() && !streaming
                    ? "bg-gradient-to-r from-purple-500 to-green-500 text-white shadow-md hover:shadow-lg"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
