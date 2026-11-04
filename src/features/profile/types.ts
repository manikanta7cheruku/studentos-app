import type { z } from "zod";
import type { profile, mySkill } from "@/contracts/profile";

export type ProfileData = z.infer<typeof profile>;
export type UserSkill = z.infer<typeof mySkill>;

export interface SkillCatalogItem {
  id: string;
  name: string;
  category: string | null;
}
