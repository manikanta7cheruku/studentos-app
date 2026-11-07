import type { ProfileData, UserSkill } from "./types";

export const sampleProfile: ProfileData = {
  user_id: "aaaaaaaa-1000-4000-8000-000000000003",
  display_name: "Riya Sharma",
  handle: "riya_alpha",
  headline: "Second year CSE, passionate about web development and UI systems",
  bio: "Hey there! I am a student developer interested in building clean campus applications and learning full-stack web tech.",
  avatar_url: null,
  interests: ["web", "design", "typescript", "postgres"],
  career_goal: "Full-stack software engineer",
  visibility: "college",
  portfolio_public: false,
  created_at: "2026-10-31T09:00:00.000Z",
  updated_at: "2026-10-31T09:00:00.000Z",
};

export const sampleUserSkills: UserSkill[] = [
  {
    skill_id: "88888888-8888-4888-8888-888888888888",
    name: "TypeScript",
    level: 4,
    evidence_url: "https://github.com/example/studentos-profile",
  },
  {
    skill_id: "88888888-8888-4888-8888-888888888889",
    name: "React",
    level: 3,
    evidence_url: "https://example.com/portfolio-demo",
  },
  {
    skill_id: "88888888-8888-4888-8888-888888888890",
    name: "Next.js",
    level: 3,
    evidence_url: null,
  },
];
