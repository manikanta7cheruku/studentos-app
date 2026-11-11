import { connection } from "next/server";
import { OwnerTitle, Panel, Stat, Table, when } from "@/features/owner/owner-ui";
import { health } from "@/modules/owner/owner.admin";

export const instant = false;

const FREE_PLAN_BYTES = 500 * 1024 * 1024;

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default async function OwnerHealth() {
  await connection();
  const data = await health();
  const used = Math.min(100, (data.database_bytes / FREE_PLAN_BYTES) * 100);
  return (
    <>
      <OwnerTitle title="Health" text="The database, the limits and how busy the platform is." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Database size"
          value={mb(data.database_bytes)}
          note="Free plan holds about 500 MB"
        />
        <Stat label="Database answer time" value={`${data.database_ms} ms`} />
        <Stat label="Logged actions, 24 h" value={data.audit_24h} />
        <Stat
          label="Oldest waiting student"
          value={data.oldest_pending_membership ? when(data.oldest_pending_membership) : "none"}
        />
      </div>
      <Panel title="Database space" className="mt-5">
        <div
          className="h-3 overflow-hidden rounded-full bg-white/[0.08]"
          role="img"
          aria-label={`${used.toFixed(1)} percent of the free plan`}
        >
          <div
            className="bg-brand h-full rounded-full"
            style={{ width: `${Math.max(1, used)}%` }}
          />
        </div>
        <p className="mt-2 text-[12.5px] text-ink-muted">
          {used.toFixed(1)} percent of the free plan&apos;s 500 MB. On the Pro plan the limit is
          much higher.
        </p>
      </Panel>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Rows in the main tables">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
            {Object.entries(data.tables).map(([name, value]) => (
              <div
                key={name}
                className="flex justify-between gap-3 border-b border-white/[0.06] py-1.5"
              >
                <dt className="capitalize text-ink-muted">{name.replace("_", " ")}</dt>
                <dd className="tabular font-semibold">{value.toLocaleString("en-IN")}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <div>
          <h2 className="mb-3 text-[15px] font-bold">Limits hit in the last 24 hours</h2>
          <Table head={["Limit", "Times"]} empty="Nothing was limited.">
            {data.rate_limit_blocks_24h.map((row) => (
              <tr key={row.bucket}>
                <td className="font-mono text-[12.5px]">{row.bucket}</td>
                <td className="tabular">{row.n}</td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
      <p className="mt-5 text-[13px] text-ink-muted">
        Errors and server logs are in your Vercel project (Logs) and in the Supabase dashboard
        (Logs). They are not copied into this page yet.
      </p>
    </>
  );
}
