import { apiClient } from "./client";
import type { Skill, SkillDetail, SkillCreate, SkillUpdate } from "@/types/skill";

export const skillsApi = {
  list: (params?: { skill_type?: string; category?: string; search?: string }) =>
    apiClient.get<Skill[]>("/skills", { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<SkillDetail>(`/skills/${id}`).then((r) => r.data),

  create: (body: SkillCreate) =>
    apiClient.post<SkillDetail>("/skills", body).then((r) => r.data),

  update: (id: string, body: SkillUpdate) =>
    apiClient.patch<SkillDetail>(`/skills/${id}`, body).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/skills/${id}`),

  // Agent-skill assignment
  listForAgent: (agentName: string) =>
    apiClient.get<Skill[]>(`/agents/${agentName}/skills`).then((r) => r.data),

  assignToAgent: (agentName: string, skillId: string) =>
    apiClient.post(`/agents/${agentName}/skills`, { skill_id: skillId }).then((r) => r.data),

  removeFromAgent: (agentName: string, skillId: string) =>
    apiClient.delete(`/agents/${agentName}/skills/${skillId}`),
};
