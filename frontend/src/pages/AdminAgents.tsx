import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Terminal,
  RefreshCw,
  Play,
  Wrench,
  Plug,
} from "lucide-react";
import {
  PageHeader,
  GlassCard,
  GradientButton,
  SectionTitle,
  Badge,
  InfoBox,
} from "@/components/shared";
import {
  useAgentList,
  useAdapters,
  useCreateAgentConfig,
  useUpdateAgentConfig,
  useDeleteAgentConfig,
  useRefreshAgents,
} from "@/hooks/useAgents";
import {
  useAgentSkills,
  useAssignSkill,
  useRemoveSkill,
  useSkillList,
} from "@/hooks/useSkills";
import { cn } from "@/lib/utils";
import type { AgentConfig, AgentConfigCreate, AgentConfigUpdate } from "@/types/agent";

const emptyForm: AgentConfigCreate = {
  name: "",
  display_name: "",
  icon: "",
  description: "",
  system_prompt: "",
  skills: [],
  preferred_agent: "azure-openai",
  fallback_agents: ["mock"],
};

function AgentSkillAssignment({ agentName }: { agentName: string }) {
  const { data: assigned } = useAgentSkills(agentName);
  const { data: allSkills } = useSkillList();
  const assignMut = useAssignSkill();
  const removeMut = useRemoveSkill();

  const unassigned = allSkills?.filter(
    (s) => !assigned?.some((a) => a.id === s.id)
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {assigned?.map((skill) => (
          <span key={skill.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-100 text-sm">
            <Zap className="w-3 h-3 text-purple-600" />
            {skill.display_name}
            <button
              onClick={() => removeMut.mutate({ agentName, skillId: skill.id })}
              className="ml-1 text-red-400 hover:text-red-600 cursor-pointer"
            >&times;</button>
          </span>
        ))}
        {(!assigned || assigned.length === 0) && (
          <span className="text-xs text-gray-400">暂无已分配 Skill</span>
        )}
      </div>
      {unassigned && unassigned.length > 0 && (
        <select
          onChange={(e) => {
            if (e.target.value) {
              assignMut.mutate({ agentName, skillId: e.target.value });
              e.target.value = "";
            }
          }}
          className="px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
          defaultValue=""
        >
          <option value="" disabled>+ 添加 Skill</option>
          {unassigned.map((s) => (
            <option key={s.id} value={s.id}>{s.display_name}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function SystemAgentTable({ agents }: { agents: AgentConfig[] }) {
  const navigate = useNavigate();
  const refreshMut = useRefreshAgents();
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  return (
    <GlassCard padding="lg">
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Agent Configuration</SectionTitle>
        <div className="flex items-center gap-2">
          <GradientButton
            size="sm"
            variant="secondary"
            onClick={() => refreshMut.mutate()}
            disabled={refreshMut.isPending}
          >
            <span className="flex items-center gap-1.5">
              <RefreshCw className={cn("w-3.5 h-3.5", refreshMut.isPending && "animate-spin")} />
              {refreshMut.isPending ? "Refreshing..." : "Refresh"}
            </span>
          </GradientButton>
          <GradientButton size="sm" onClick={() => navigate("/playground")}>
            <span className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" />
              Invoke Agent
            </span>
          </GradientButton>
        </div>
      </div>

      {/* Table Header */}
      <div className="rounded-xl border border-purple-100/50 overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_80px_100px_1fr_80px_80px_40px] gap-2 px-4 py-2.5 bg-gray-50/80 border-b border-gray-200/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <span>Agent</span>
          <span>Provider</span>
          <span>Model</span>
          <span>Status</span>
          <span>Version</span>
          <span>Modes</span>
          <span>Tools</span>
          <span>MCP</span>
          <span></span>
        </div>

        {agents.map((agent) => (
          <div key={agent.name}>
            {/* Row */}
            <div
              className={cn(
                "grid grid-cols-[2fr_1fr_1fr_80px_100px_1fr_80px_80px_40px] gap-2 px-4 py-3 items-center border-b border-gray-100/50 hover:bg-blue-50/30 transition-colors cursor-pointer",
                expandedAgent === agent.name && "bg-blue-50/40"
              )}
              onClick={() => setExpandedAgent(expandedAgent === agent.name ? null : agent.name)}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{agent.icon}</span>
                <div>
                  <span className="text-sm font-semibold text-gray-800">{agent.display_name}</span>
                  <p className="text-[10px] text-gray-400">{agent.name}</p>
                </div>
              </div>
              <span className="text-xs text-gray-600">{agent.provider ?? "-"}</span>
              <span className="text-xs text-gray-600 truncate">{agent.model_name ?? "-"}</span>
              <span>
                <Badge variant={agent.available ? "success" : "outline"}>
                  {agent.available ? "ON" : "OFF"}
                </Badge>
              </span>
              <span className="text-[11px] text-gray-500 truncate">{agent.version ?? "-"}</span>
              <div className="flex flex-wrap gap-1">
                {agent.modes?.map((m) => (
                  <span key={m} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full capitalize">{m}</span>
                ))}
              </div>
              <span className="text-xs text-gray-500">{agent.tools?.length ?? 0}</span>
              <span className="text-xs text-gray-500">{agent.mcp_servers?.length ?? 0}</span>
              <span>
                {expandedAgent === agent.name
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
              </span>
            </div>

            {/* Expanded */}
            {expandedAgent === agent.name && (
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100/50 space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
                    <p className="text-gray-700">{agent.description}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Provider + Model</label>
                    <p className="text-gray-700">{agent.provider} / {agent.model_name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Install Command</label>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded block mt-0.5">{agent.install_hint ?? "N/A"}</code>
                  </div>
                </div>

                {/* Tools */}
                {(agent.tools?.length ?? 0) > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">
                      <Wrench className="w-3 h-3 inline mr-1" />
                      Tools ({agent.tools?.length})
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.tools?.map((tool) => (
                        <span key={tool} className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200/50">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* MCP Servers */}
                {(agent.mcp_servers?.length ?? 0) > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">
                      <Plug className="w-3 h-3 inline mr-1" />
                      MCP Servers ({agent.mcp_servers?.length})
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.mcp_servers?.map((server) => (
                        <span key={server} className="text-[11px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200/50">
                          {server}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills assignment */}
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">
                    <Zap className="w-3 h-3 inline mr-1" />
                    Assigned Skills
                  </label>
                  <AgentSkillAssignment agentName={agent.name} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export default function AdminAgents() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [formData, setFormData] = useState<AgentConfigCreate>({ ...emptyForm });
  const [editData, setEditData] = useState<AgentConfigUpdate>({});
  const [activeTab, setActiveTab] = useState<"copilot" | "system">("copilot");

  const { data: agents, isLoading } = useAgentList();
  const { data: adapters } = useAdapters();
  const createMutation = useCreateAgentConfig();
  const updateMutation = useUpdateAgentConfig();
  const deleteMutation = useDeleteAgentConfig();

  const copilotAgents = agents?.filter((a) => (a.agent_type ?? "copilot") === "copilot") ?? [];
  const systemAgents = agents?.filter((a) => a.agent_type === "system") ?? [];

  const handleCreate = async () => {
    await createMutation.mutateAsync(formData);
    setShowCreate(false);
    setFormData({ ...emptyForm });
  };

  const handleUpdate = async (name: string) => {
    await updateMutation.mutateAsync({ name, body: editData });
    setEditingAgent(null);
    setEditData({});
  };

  const handleDelete = async (name: string) => {
    if (confirm(`确定要删除 Agent "${name}" 吗？`)) {
      await deleteMutation.mutateAsync(name);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Agent 管理"
        description="配置 AI 助手的 System Prompt、Skills、模型后端"
      />

      {/* Adapter Status */}
      <GlassCard padding="lg">
        <SectionTitle>AI 后端适配器</SectionTitle>
        <div className="flex flex-wrap gap-3 mt-4">
          {adapters?.map((adapter) => (
            <div
              key={adapter.name}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                adapter.available
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              {adapter.available ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm font-medium">{adapter.name}</span>
              <Badge variant={adapter.available ? "gradient" : "outline"}>
                {adapter.available ? "可用" : "未配置"}
              </Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Agent Type Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("copilot")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all cursor-pointer",
            activeTab === "copilot"
              ? "bg-gradient-to-r from-purple-400 to-green-400 text-white border-transparent shadow-md"
              : "bg-white/50 border-purple-200 text-gray-700 hover:bg-purple-50"
          )}
        >
          <Bot className="w-4 h-4" /> Copilot 助手
        </button>
        <button
          onClick={() => setActiveTab("system")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all cursor-pointer",
            activeTab === "system"
              ? "bg-gradient-to-r from-purple-400 to-green-400 text-white border-transparent shadow-md"
              : "bg-white/50 border-purple-200 text-gray-700 hover:bg-purple-50"
          )}
        >
          <Terminal className="w-4 h-4" /> System Agent
        </button>
      </div>

      {/* System Agent Table View */}
      {activeTab === "system" && !isLoading && (
        <SystemAgentTable agents={systemAgents} />
      )}

      {/* Copilot Agent List View */}
      {activeTab === "copilot" && (
        <GlassCard padding="lg">
          <div className="flex items-center justify-between">
            <SectionTitle>Copilot 列表</SectionTitle>
            <GradientButton size="sm" onClick={() => setShowCreate(!showCreate)}>
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                创建 Agent
              </span>
            </GradientButton>
          </div>

          {showCreate && (
            <div className="mt-6 p-6 rounded-xl bg-gradient-to-r from-purple-50/50 to-green-50/50 border border-purple-200/30 space-y-4">
              <h4 className="font-semibold text-gray-800">创建新 Agent</h4>
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="名称标识 (英文, 如 my-agent)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
                />
                <input
                  placeholder="显示名称 (中文)"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
                />
              </div>
              <input
                placeholder="描述"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
              />
              <textarea
                placeholder="System Prompt"
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm font-mono"
              />
              <select
                value={formData.preferred_agent}
                onChange={(e) => setFormData({ ...formData, preferred_agent: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
              >
                {adapters?.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name} {a.available ? "(可用)" : "(未配置)"}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <GradientButton
                  onClick={handleCreate}
                  disabled={!formData.name || !formData.display_name || createMutation.isPending}
                >
                  {createMutation.isPending ? "创建中..." : "创建"}
                </GradientButton>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 cursor-pointer"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* Copilot Agent List */}
          <div className="space-y-4 mt-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              </div>
            ) : copilotAgents.length > 0 ? (
              copilotAgents.map((agent) => (
                <div
                  key={agent.name}
                  className="p-4 rounded-xl bg-white/50 border border-purple-100/30 hover:border-purple-200 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{agent.icon}</span>
                      <div>
                        <h4 className="font-semibold text-gray-800">{agent.display_name}</h4>
                        <p className="text-xs text-gray-500">{agent.name}</p>
                      </div>
                      <Badge variant={agent.available ? "gradient" : "outline"}>
                        {agent.available ? "启用" : "禁用"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedAgent(expandedAgent === agent.name ? null : agent.name)}
                        className="p-2 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                      >
                        {expandedAgent === agent.name ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { setEditingAgent(agent.name); setExpandedAgent(agent.name); setEditData({}); }}
                        className="p-2 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(agent.name)}
                        className="p-2 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {agent.description && (
                    <p className="text-sm text-gray-600 mt-2 ml-11">{agent.description}</p>
                  )}

                  {expandedAgent === agent.name && (
                    <div className="mt-4 ml-11 space-y-3 p-4 rounded-xl bg-purple-50/30 border border-purple-100/20">
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">首选适配器</label>
                        {editingAgent === agent.name ? (
                          <select
                            value={editData.preferred_agent ?? agent.preferred_agent}
                            onChange={(e) => setEditData({ ...editData, preferred_agent: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
                          >
                            {adapters?.map((a) => (
                              <option key={a.name} value={a.name}>{a.name}</option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant="purple">{agent.preferred_agent}</Badge>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">已分配 Skills</label>
                        <AgentSkillAssignment agentName={agent.name} />
                      </div>

                      {editingAgent === agent.name && (
                        <>
                          <div>
                            <label className="text-xs font-medium text-gray-500 block mb-1">显示名称</label>
                            <input
                              value={editData.display_name ?? agent.display_name}
                              onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 block mb-1">描述</label>
                            <input
                              value={editData.description ?? agent.description}
                              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <GradientButton size="sm" onClick={() => handleUpdate(agent.name)} disabled={updateMutation.isPending}>
                              {updateMutation.isPending ? "保存中..." : "保存"}
                            </GradientButton>
                            <button
                              onClick={() => { setEditingAgent(null); setEditData({}); }}
                              className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bot className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                <p>暂无 Copilot Agent 配置</p>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      <InfoBox variant="tip" title="Agent 配置说明">
        <ul className="space-y-1">
          <li>- <strong>Copilot 助手</strong>: 基于 LLM 的对话 Agent，配置 System Prompt 和 Skills</li>
          <li>- <strong>System Agent</strong>: CLI 编码工具 (Claude Code, Codex, Copilot, OpenCode)，在 Playground 中交互</li>
          <li>- <strong>已分配 Skills</strong>: 通过 Skills 管理页创建，可动态分配给 Agent</li>
        </ul>
      </InfoBox>
    </div>
  );
}
