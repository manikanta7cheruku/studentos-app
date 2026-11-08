import type { Metadata } from "next";
import { ComingSoon } from "@/features/campus";

export const metadata: Metadata = { title: "Collaborate" };
export const instant = false;

export default function CollaboratePage() {
  return (
    <ComingSoon
      eyebrow="Collaborate"
      title="Find your team"
      description="Post what you are building, see who wants to join, and decide together."
      coming={[
        {
          name: "Team posts",
          text: "Describe the roles you need and the deadline. Classmates with the right skills see it first.",
        },
        {
          name: "Requests",
          text: "Classmates ask for a role with a short message. You accept or decline, and they are told.",
        },
        {
          name: "Your teams",
          text: "Every post you made and every request you sent, in one place.",
        },
      ]}
    />
  );
}
