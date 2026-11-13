import Link from "next/link";
import { connection } from "next/server";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OwnerTitle, Pill, Table, when } from "@/features/owner/owner-ui";
import { ANON_PAGE, anonymousPosts, ownerAudit } from "@/modules/owner/owner.admin";
import { requireOpenOwner } from "@/modules/owner/owner-access";

export const instant = false;

const KIND = { buzz: "Buzz", comment: "Comment", argument: "Debate argument" } as const;

export default async function OwnerAnonymous({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await connection();
  const { q = "", page: rawPage = "0" } = await searchParams;
  const page = Math.max(0, Math.min(500, Number.parseInt(rawPage, 10) || 0));
  const owner = await requireOpenOwner();
  const { total, rows } = await anonymousPosts(q.slice(0, 80), page);
  // This shows who is behind anonymous posts, so each visit is written to the audit log.
  await ownerAudit(owner.id, "owner.anonymous_viewed", {
    count: rows.length,
    page,
    searched: q.length > 0,
  });
  const from = total === 0 ? 0 : page * ANON_PAGE + 1;
  const to = Math.min(total, (page + 1) * ANON_PAGE);
  const link = (n: number) =>
    `/owner/anonymous?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) })}`;
  return (
    <>
      <OwnerTitle
        title="Anonymous posts"
        text="Every anonymous buzz, comment and debate argument, with the person behind it. Other students only see Anonymous and an animal. Use this for reports, abuse and safety, not for curiosity. Each visit is written to the audit log."
      />
      <form method="get" className="mb-5 flex max-w-xl gap-2" role="search">
        <div className="relative flex-1">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted"
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Words, name, username or email"
            aria-label="Search anonymous posts"
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      <Table
        head={["What", "Words", "Really written by", "College", "Posted", "Status"]}
        empty={q ? "Nothing matches that." : "Nobody has posted anonymously yet."}
      >
        {rows.map((item) => (
          <tr key={`${item.kind}-${item.id}`}>
            <td className="whitespace-nowrap text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
              {KIND[item.kind]}
              {item.open_reports > 0 ? (
                <span className="ml-1.5 rounded-full bg-[#e0866a]/25 px-2 py-0.5 text-[11px] font-bold normal-case tracking-normal text-[#f6c7b6]">
                  {item.open_reports} {item.open_reports === 1 ? "report" : "reports"}
                </span>
              ) : null}
            </td>
            <td className="max-w-sm whitespace-pre-line break-words text-[13.5px]">{item.body}</td>
            <td className="text-[13px]">
              <p className="font-semibold">{item.name}</p>
              {item.handle ? <p className="text-ink-muted">@{item.handle}</p> : null}
              <p className="break-all text-ink-muted">{item.email ?? "no email"}</p>
            </td>
            <td className="text-[13px] text-ink-muted">{item.college_slug}</td>
            <td className="whitespace-nowrap text-[13px] text-ink-muted">
              {when(item.created_at)}
            </td>
            <td>
              <Pill value={item.status} />
            </td>
          </tr>
        ))}
      </Table>
      <nav className="mt-4 flex items-center justify-between text-[13px] text-ink-muted">
        <span className="tabular">
          Showing {from} to {to} of {total}
        </span>
        <span className="flex gap-3">
          {page > 0 ? (
            <Link href={link(page - 1)} className="font-semibold text-[#b9b4ee] hover:underline">
              Previous
            </Link>
          ) : null}
          {to < total ? (
            <Link href={link(page + 1)} className="font-semibold text-[#b9b4ee] hover:underline">
              Next
            </Link>
          ) : null}
        </span>
      </nav>
    </>
  );
}
