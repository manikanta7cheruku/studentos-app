export interface CollegeModules {
  campus: boolean;
  collaborate: boolean;
  career: boolean;
}

export interface College {
  slug: string;
  name: string;
  short_name: string | null;
  city?: string | null;
  state?: string | null;
  accent_hex: string | null;
  logo_url: string | null;
  allowed_methods?: ("email_domain" | "invite_code" | "manual" | "roster")[];
  require_admin_approval?: boolean;
  modules: CollegeModules;
}
