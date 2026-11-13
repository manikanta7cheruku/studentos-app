import Link from "next/link";
import { connection } from "next/server";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OwnerTitle } from "@/features/owner/owner-ui";
import { UsersTable } from "@/features/owner/users-table";
import { USERS_PAGE, ownerAudit, usersFull } from "@/modules/owner/owner.admin";
import { requireOpenOwner } from "@/modules/owner/owner-access";

export const instant = false;

export default async function OwnerUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await connection();
  const { q = "", page: rawPage = "0" } = await searchParams;
  const page = Math.max(0, Math.min(500, Number.parseInt(rawPage, 10) || 0));
  const owner = await requireOpenOwner();
  const { total, rows } = await usersFull(q.slice(0, 80), page);
  // Everything about a person is shown here, so each visit is written to the audit log.
  await ownerAudit(owner.id, "owner.users_viewed", {
    count: rows.length,
    page,
    searched: q.length > 0,
  });
  return (
    <>
      <OwnerTitle
        title="Users"
        text="Everybody on the platform, with the whole record one tap away. Tick people to delete them, one or many. Suspending stops an account from signing in and deletes nothing."
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
            placeholder="Email, name, username, college or branch"
            aria-label="Search users"
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      <UsersTable
        rows={rows}
        ownerId={owner.id}
        thisYear={new Date().getFullYear()}
        emptyText={q ? "Nobody matches that." : "No users yet."}
      />
      <nav
        aria-label="Pages"
        className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13.5px]"
      >
        <p className="tabular text-ink-muted">
          {total === 0
            ? "Nobody"
            : `Showing ${page * USERS_PAGE + 1} to ${page * USERS_PAGE + rows.length} of ${total}`}
        </p>
        <div className="flex gap-2">
          {page > 0 ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/owner/users?q=${encodeURIComponent(q)}&page=${page - 1}`}>
                Previous
              </Link>
            </Button>
          ) : null}
          {(page + 1) * USERS_PAGE < total ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/owner/users?q=${encodeURIComponent(q)}&page=${page + 1}`}>Next</Link>
            </Button>
          ) : null}
        </div>
      </nav>
    </>
  );
}
