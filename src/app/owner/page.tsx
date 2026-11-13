import { connection } from "next/server";
import Link from "next/link";
import { OwnerTitle, Panel, Stat } from "@/features/owner/owner-ui";
import { insights, networkInsights, overview, signups } from "@/modules/owner/owner.admin";

export const instant = false;

function Chart({ days }: { days: { day: string; n: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.n));
  return (
    <div>
      <div
        role="img"
        aria-label="Sign-ups per day, last 30 days"
        className="flex h-32 items-end gap-[3px]"
      >
        {days.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${d.n}`}
            className="bg-brand min-h-[3px] flex-1 rounded-t-[3px] opacity-90 transition-opacity hover:opacity-100"
            style={{ height: `${Math.max(3, (d.n / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] text-ink-muted">
        <span>{days[0]?.day}</span>
        <span>today</span>
      </div>
    </div>
  );
}

export default async function OwnerOverview() {
  await connection();
  const [data, days, people, net] = await Promise.all([
    overview(),
    signups(30),
    insights(),
    networkInsights(),
  ]);
  const pct = (n: number) => (people.users ? Math.round((n / people.users) * 100) : 0);
  const alerts: { text: string; href: string }[] = [];
  if (data.reports_open > 0)
    alerts.push({
      text: `${data.reports_open} open report${data.reports_open === 1 ? "" : "s"}`,
      href: "/owner/reports",
    });
  if (data.colleges_suspended > 0)
    alerts.push({
      text: `${data.colleges_suspended} suspended college${data.colleges_suspended === 1 ? "" : "s"}`,
      href: "/owner/colleges",
    });
  if (data.memberships_pending > 0)
    alerts.push({
      text: `${data.memberships_pending} students waiting for approval`,
      href: "/owner/colleges",
    });

  return (
    <>
      <OwnerTitle title="Overview" text="How StudentOS is doing, across every college." />
      {alerts.length ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {alerts.map((alert) => (
            <Link
              key={alert.text}
              href={alert.href}
              className="rounded-full border border-warning/30 bg-warning/10 px-3.5 py-1.5 text-[13px] font-semibold text-warning outline-none hover:bg-warning/20 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {alert.text}
            </Link>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Colleges"
          value={data.colleges_total}
          note={`${data.colleges_active} active`}
        />
        <Stat
          label="Users"
          value={data.users_total}
          note={`${data.users_active_7d} active this week`}
        />
        <Stat
          label="Sign-ups, 7 days"
          value={data.signups_7d}
          note={`${data.signups_30d} in 30 days`}
        />
        <Stat label="Open setup codes" value={data.codes_open} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Sign-ups, last 30 days">
          <Chart days={days} />
        </Panel>
        <Panel title="What people made">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[14px]">
            {[
              ["Plans", data.plans],
              ["Ideas", data.ideas],
              ["Events", data.events],
              ["Listings", data.listings],
              ["Active members", data.memberships_active],
              ["Waiting", data.memberships_pending],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-[12.5px] text-ink-muted">{label}</dt>
                <dd className="tabular font-heading text-[1.4rem] font-extrabold">
                  {Number(value).toLocaleString("en-IN")}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-bold">Network, debates and requests</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Debates"
          value={net.debates_total}
          note={`${net.debates_live} live · ${net.debates_private} private`}
        />
        <Stat label="Arguments" value={net.arguments} note="in all debates" />
        <Stat
          label="Message requests"
          value={net.requests_pending}
          note={`${net.requests_accepted} accepted · ${net.requests_declined} not interested · ${net.requests_expired} ran out`}
        />
        <Stat label="Follows" value={net.follows} note={`${net.mutual_follows} mutual`} />
        <Stat label="Buzz" value={net.buzz} />
        <Stat label="Plans" value={net.plans} />
        <Stat label="Gave a place" value={net.with_place} note="where they live" />
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-bold">People and profiles</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Finished the tour"
          value={`${pct(people.onboarded)}%`}
          note={`${people.onboarded} of ${people.users}`}
        />
        <Stat
          label="Gave a mobile number"
          value={people.with_phone}
          note={`${people.phone_shared_with_hosts} share it with hosts`}
        />
        <Stat
          label="Messages waiting"
          value={people.messages_waiting}
          note="they vanish by themselves"
        />
        <Stat label="New feedback" value={people.feedback_new} note="in the Feedback page" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel title="Gender (counts only)">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
            {(
              [
                ["Woman", people.sex.woman],
                ["Man", people.sex.man],
                ["Non-binary", people.sex.non_binary],
                ["Prefer not to say", people.sex.prefer_not_to_say],
                ["Not answered", people.sex.unanswered],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-[12.5px] text-ink-muted">{label}</dt>
                <dd className="tabular font-heading text-[1.2rem] font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Age (from birth year)">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
            {(
              [
                ["Under 18", people.age.under_18],
                ["18 to 22", people.age.from_18_to_22],
                ["23 and over", people.age.from_23],
                ["Not shared", people.age.not_shared],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-[12.5px] text-ink-muted">{label}</dt>
                <dd className="tabular font-heading text-[1.2rem] font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Popular interests">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
            For fun
          </p>
          <p className="mb-3 mt-1 text-[14px]">
            {people.top_interests.length
              ? people.top_interests.map((i) => `${i.name} (${i.n})`).join(", ")
              : "None yet"}
          </p>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
            Tech and career
          </p>
          <p className="mt-1 text-[14px]">
            {people.top_tech.length
              ? people.top_tech.map((i) => `${i.name} (${i.n})`).join(", ")
              : "None yet"}
          </p>
        </Panel>
      </div>
    </>
  );
}
