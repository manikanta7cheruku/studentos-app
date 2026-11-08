import type { Metadata } from "next";
import { ComingSoon } from "@/features/campus";

export const metadata: Metadata = { title: "Career" };
export const instant = false;

export default function CareerPage() {
  return (
    <ComingSoon
      eyebrow="Career"
      title="Opportunities and your applications"
      description="Verified openings from your college, and a private tracker that nobody else can see."
      coming={[
        {
          name: "Opportunities",
          text: "Internships, jobs, hackathons and scholarships posted by your college, with a verified date and a reminder before the deadline.",
        },
        {
          name: "Application tracker",
          text: "Keep every application, its status and its deadline in one list. It is private to you.",
        },
      ]}
      cta={{ label: "Browse opportunities", path: "career/opportunities" }}
    />
  );
}
