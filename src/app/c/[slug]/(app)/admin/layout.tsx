import { AdminShell } from "@/features/admin-console";

export const instant = false;

// Behind the college gate already. The shell checks the role: admins see everything, moderators a part.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
