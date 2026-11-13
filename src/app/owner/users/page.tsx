import { connection } from "next/server";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OwnerTitle } from "@/features/owner/owner-ui";
import { UsersTable } from "@/features/owner/users-table";
import { ownerAudit, usersFull } from "@/modules/owner/owner.admin";
import { requireOpenOwner } from "@/modules/owner/owner-access";

export const instant = false;

export default async function OwnerUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();
  const { q = "" } = await searchParams;
  const owner = await requireOpenOwner();
  const rows = await usersFull(q.slice(0, 80));
  // Everything about a person is shown here, so each visit is written to the audit log.
  await ownerAudit(owner.id, "owner.users_viewed", { count: rows.length, searched: q.length > 0 });
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
    </>
  );
}
