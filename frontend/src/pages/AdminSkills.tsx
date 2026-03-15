import { useState } from "react";
import {
  Zap,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package,
  Settings2,
  FolderOpen,
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
  useSkillList,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
} from "@/hooks/useSkills";
import type { SkillCreate, SkillUpdate } from "@/types/skill";

const SKILL_TYPE_ICONS: Record<string, typeof Package> = {
  bundled: Package,
  managed: Settings2,
  workspace: FolderOpen,
};

const SKILL_TYPE_LABELS: Record<string, string> = {
  bundled: "内置",
  managed: "托管",
  workspace: "工作区",
};

const emptyForm: SkillCreate = {
  name: "",
  display_name: "",
  description: "",
  skill_type: "managed",
  category: "",
  content: "",
};

export default function AdminSkills() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [editingSkill, setEditingSkill] = useState<string | null>(null);
  const [formData, setFormData] = useState<SkillCreate>({ ...emptyForm });
  const [editData, setEditData] = useState<SkillUpdate>({});

  const { data: skills, isLoading, refetch } = useSkillList({
    skill_type: filterType || undefined,
    search: search || undefined,
  });
  const createMutation = useCreateSkill();
  const updateMutation = useUpdateSkill();
  const deleteMutation = useDeleteSkill();

  const handleCreate = async () => {
    await createMutation.mutateAsync(formData);
    setShowCreate(false);
    setFormData({ ...emptyForm });
  };

  const handleUpdate = async (id: string) => {
    await updateMutation.mutateAsync({ id, body: editData });
    setEditingSkill(null);
    setEditData({});
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`确定要删除 Skill "${name}" 吗？`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const shownCount = skills?.length ?? 0;

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Skills 管理"
        description="管理 Skill 可用性，分配给 Agent 使用"
      />

      <GlassCard padding="lg">
        <div className="flex items-center justify-between">
          <SectionTitle>Skills</SectionTitle>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
              title="刷新"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <GradientButton size="sm" onClick={() => setShowCreate(!showCreate)}>
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                创建 Skill
              </span>
            </GradientButton>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-1">
          Bundled, managed, and workspace skills.
        </p>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-gray-500">Filter</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-purple-200 text-sm focus:outline-none focus:border-purple-400"
            >
              <option value="">全部类型</option>
              <option value="bundled">内置 (Bundled)</option>
              <option value="managed">托管 (Managed)</option>
              <option value="workspace">工作区 (Workspace)</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search skills"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-lg border border-purple-200 text-sm focus:outline-none focus:border-purple-400 w-64"
            />
          </div>

          <span className="text-sm text-gray-500">{shownCount} shown</span>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="mt-6 p-6 rounded-xl bg-gradient-to-r from-purple-50/50 to-green-50/50 border border-purple-200/30 space-y-4">
            <h4 className="font-semibold text-gray-800">创建新 Skill</h4>
            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="名称标识 (英文, 如 code-review)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
              />
              <input
                placeholder="显示名称"
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
            <div className="grid grid-cols-2 gap-4">
              <select
                value={formData.skill_type}
                onChange={(e) => setFormData({ ...formData, skill_type: e.target.value })}
                className="px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
              >
                <option value="managed">托管 (Managed)</option>
                <option value="bundled">内置 (Bundled)</option>
                <option value="workspace">工作区 (Workspace)</option>
              </select>
              <input
                placeholder="分类 (如 yoga, development)"
                value={formData.category ?? ""}
                onChange={(e) => setFormData({ ...formData, category: e.target.value || undefined })}
                className="px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
              />
            </div>
            <textarea
              placeholder="Skill 内容 / Prompt 模板"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm font-mono"
            />
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

        {/* Skill List */}
        <div className="space-y-3 mt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : skills && skills.length > 0 ? (
            skills.map((skill) => {
              const TypeIcon = SKILL_TYPE_ICONS[skill.skill_type] ?? Zap;
              return (
                <div
                  key={skill.id}
                  className="p-4 rounded-xl bg-white/50 border border-purple-100/30 hover:border-purple-200 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-green-100 flex items-center justify-center">
                        <TypeIcon className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {skill.display_name}
                        </h4>
                        <p className="text-xs text-gray-500">{skill.name}</p>
                      </div>
                      <Badge variant={skill.available ? "gradient" : "outline"}>
                        {skill.available ? "可用" : "禁用"}
                      </Badge>
                      <Badge variant="purple">
                        {SKILL_TYPE_LABELS[skill.skill_type] ?? skill.skill_type}
                      </Badge>
                      {skill.category && (
                        <Badge variant="outline">{skill.category}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setExpandedSkill(
                            expandedSkill === skill.id ? null : skill.id
                          )
                        }
                        className="p-2 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                      >
                        {expandedSkill === skill.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingSkill(skill.id);
                          setExpandedSkill(skill.id);
                          setEditData({});
                        }}
                        className="p-2 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(skill.id, skill.name)}
                        className="p-2 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {skill.description && (
                    <p className="text-sm text-gray-600 mt-2 ml-11">
                      {skill.description}
                    </p>
                  )}

                  {/* Expanded Detail / Edit */}
                  {expandedSkill === skill.id && (
                    <div className="mt-4 ml-11 space-y-3 p-4 rounded-xl bg-purple-50/30 border border-purple-100/20">
                      {editingSkill === skill.id ? (
                        <>
                          <div>
                            <label className="text-xs font-medium text-gray-500 block mb-1">
                              显示名称
                            </label>
                            <input
                              value={editData.display_name ?? skill.display_name}
                              onChange={(e) =>
                                setEditData({ ...editData, display_name: e.target.value })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 block mb-1">
                              描述
                            </label>
                            <input
                              value={editData.description ?? skill.description}
                              onChange={(e) =>
                                setEditData({ ...editData, description: e.target.value })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-500 block mb-1">
                                类型
                              </label>
                              <select
                                value={editData.skill_type ?? skill.skill_type}
                                onChange={(e) =>
                                  setEditData({ ...editData, skill_type: e.target.value })
                                }
                                className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
                              >
                                <option value="managed">托管</option>
                                <option value="bundled">内置</option>
                                <option value="workspace">工作区</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 block mb-1">
                                分类
                              </label>
                              <input
                                value={editData.category ?? skill.category ?? ""}
                                onChange={(e) =>
                                  setEditData({ ...editData, category: e.target.value || undefined })
                                }
                                className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 block mb-1">
                              Skill 内容
                            </label>
                            <textarea
                              value={editData.content ?? ""}
                              onChange={(e) =>
                                setEditData({ ...editData, content: e.target.value })
                              }
                              rows={4}
                              className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm font-mono"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <GradientButton
                              size="sm"
                              onClick={() => handleUpdate(skill.id)}
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending ? "保存中..." : "保存"}
                            </GradientButton>
                            <button
                              onClick={() => {
                                setEditingSkill(null);
                                setEditData({});
                              }}
                              className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="text-xs font-medium text-gray-500">类型</label>
                            <p className="text-sm">{SKILL_TYPE_LABELS[skill.skill_type]}</p>
                          </div>
                          {skill.category && (
                            <div>
                              <label className="text-xs font-medium text-gray-500">分类</label>
                              <p className="text-sm">{skill.category}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Zap className="w-12 h-12 mx-auto mb-3 text-purple-400" />
              <p>No skills found.</p>
            </div>
          )}
        </div>
      </GlassCard>

      <InfoBox variant="tip" title="Skills 说明">
        <ul className="space-y-1">
          <li>- <strong>内置 (Bundled)</strong>: 平台预置的核心 Skill</li>
          <li>- <strong>托管 (Managed)</strong>: 管理员创建的 Skill</li>
          <li>- <strong>工作区 (Workspace)</strong>: 项目级别的自定义 Skill</li>
          <li>- Skill 可以分配给 System Agent 使用</li>
        </ul>
      </InfoBox>
    </div>
  );
}
