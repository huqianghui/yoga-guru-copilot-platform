import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { skillsApi } from "@/api/skills";
import type { SkillCreate, SkillUpdate } from "@/types/skill";

export function useSkillList(params?: {
  skill_type?: string;
  category?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["skills", params],
    queryFn: () => skillsApi.list(params),
  });
}

export function useSkillDetail(id: string | null) {
  return useQuery({
    queryKey: ["skills", id],
    queryFn: () => skillsApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SkillCreate) => skillsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SkillUpdate }) =>
      skillsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => skillsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useAgentSkills(agentName: string | null) {
  return useQuery({
    queryKey: ["agent-skills", agentName],
    queryFn: () => skillsApi.listForAgent(agentName!),
    enabled: !!agentName,
  });
}

export function useAssignSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentName, skillId }: { agentName: string; skillId: string }) =>
      skillsApi.assignToAgent(agentName, skillId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-skills"] }),
  });
}

export function useRemoveSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentName, skillId }: { agentName: string; skillId: string }) =>
      skillsApi.removeFromAgent(agentName, skillId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-skills"] }),
  });
}
