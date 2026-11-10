"use client";

import Link from "next/link";
import { LoadError } from "@/components/app/load-error";
import { api } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { ConsolePage, ListSkeleton } from "./admin-shell";

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-24 flex-col justify-between rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-[14px] text-ink-muted">{label}</span>
        <span className="tabular font-heading text-4xl font-semibold">{value}</span>
      </Link>
    </li>
  );
}

function AdminStatsView() {
  const { slug } = useCollege();
  const state = useLoad(() => api.admin.stats(slug), [slug]);
  const base = `/c/${slug}/admin`;
  if (state.status === "loading") return <ListSkeleton />;
  if (state.status === "error")
    return <LoadError error={state.error} onRetry={state.reload} what="the numbers" />;
  const { total_members, pending_verifications, active_invites } = state.data;
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-3">
        <Stat label="Members" value={total_members} href={`${base}/members`} />
        <Stat
          label="Waiting for approval"
          value={pending_verifications}
          href={`${base}/verification`}
        />
        <Stat label="Invite codes in use" value={active_invites} href={`${base}/invites`} />
      </ul>
      {pending_verifications > 0 ? (
        <p className="rounded-card border border-primary/30 bg-primary/5 px-4 py-3 text-[16px]">
          <strong className="font-semibold">
            {pending_verifications} {pending_verifications === 1 ? "person is" : "people are"}{" "}
            waiting
          </strong>{" "}
          for your answer.{" "}
          <Link
            href={`${base}/verification`}
            className="font-medium text-primary underline underline-offset-4"
          >
            Open join requests
          </Link>
        </p>
      ) : null}
    </>
  );
}

/** The first page of the console. Admins see the numbers, moderators see what they can do. */
export function OverviewScreen() {
  const { slug, college, membership } = useCollege();
  const isAdmin = membership.role === "college_admin";
  const base = `/c/${slug}/admin`;
  const links = [
    {
      href: `${base}/announcements`,
      label: "Announcements",
      text: "Post a notice. Pinned ones stay on top of Campus.",
    },
    {
      href: `${base}/opportunities`,
      label: "Opportunities",
      text: "Add internships, jobs and hackathons for your students.",
    },
    { href: `${base}/reports`, label: "Reports", text: "See what members reported and decide." },
  ];
  return (
    <ConsolePage
      title={`${college.name} console`}
      description={
        isAdmin
          ? "Who is in, what is posted, and how the college is set up."
          : "Post notices and opportunities, and handle reports."
      }
    >
      {isAdmin ? <AdminStatsView /> : null}
      <ul className="divide-y divide-border border-y border-border">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex flex-col gap-0.5 py-4 outline-none hover:bg-accent-soft/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-3"
            >
              <span className="text-[18px] font-semibold">{item.label}</span>
              <span className="text-[15px] text-ink-muted">{item.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </ConsolePage>
  );
}
