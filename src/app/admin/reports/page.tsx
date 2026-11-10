import { CollegeRedirect } from "@/features/session/college-redirect";

export const instant = false;

// Older address without a college in it: it opens the same screen inside your college.
export default function Page() {
  return <CollegeRedirect suffix="/admin/reports" />;
}
