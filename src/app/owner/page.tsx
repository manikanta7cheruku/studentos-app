import { connection } from "next/server";
import Link from "next/link";
import { OwnerTitle, Panel, Stat } from "@/features/owner/owner-ui";
import { overview, signups } from "@/modules/owner/owner.admin";

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
  const [data, days] = await Promise.all([overview(), signups(30)]);
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
    </>
  );
}
