import type { College } from "./types";

/**
 * Default sample college with all modules enabled.
 * Uses src/contracts/fixtures/ten-01.success.json as a base.
 */
export const sampleCollege: College = {
  slug: "alpha",
  name: "Alpha College",
  short_name: "Alpha",
  city: "Hyderabad",
  state: "Telangana",
  accent_hex: "#1D4ED8",
  logo_url: null,
  allowed_methods: ["email_domain", "invite_code", "manual"],
  require_admin_approval: true,
  modules: {
    campus: true,
    collaborate: true,
    career: true,
  },
};

/**
 * Second sample college with the career module disabled, used for testing navigation filtering.
 */
export const sampleCollegeCareerDisabled: College = {
  slug: "beta",
  name: "Beta Institute",
  short_name: "Beta",
  city: "Bengaluru",
  state: "Karnataka",
  accent_hex: "#059669",
  logo_url: null,
  allowed_methods: ["invite_code"],
  require_admin_approval: false,
  modules: {
    campus: true,
    collaborate: true,
    career: false,
  },
};

export const sampleColleges: Record<string, College> = {
  alpha: sampleCollege,
  beta: sampleCollegeCareerDisabled,
};
