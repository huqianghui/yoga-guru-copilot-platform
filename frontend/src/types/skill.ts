export interface Skill {
  id: string;
  name: string;
  display_name: string;
  description: string;
  skill_type: "bundled" | "managed" | "workspace";
  category: string | null;
  available: boolean;
}

export interface SkillDetail extends Skill {
  content: string;
  input_schema: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SkillCreate {
  name: string;
  display_name: string;
  description?: string;
  skill_type?: string;
  category?: string;
  content?: string;
  input_schema?: Record<string, unknown>;
  available?: boolean;
}

export interface SkillUpdate {
  display_name?: string;
  description?: string;
  skill_type?: string;
  category?: string;
  content?: string;
  input_schema?: Record<string, unknown>;
  available?: boolean;
}
