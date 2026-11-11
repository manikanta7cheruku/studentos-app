import { connection } from "next/server";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmForm } from "@/features/owner/confirm-form";
import { OwnerTitle, Pill, Table, when } from "@/features/owner/owner-ui";
import { users } from "@/modules/owner/owner.admin";
import { userSuspendedAction } from "../actions";

export const instant = false;

export default async function OwnerUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();
  const { q = "" } = await searchParams;
  const rows = await users(q.slice(0, 80));
  return (
    <>
      <OwnerTitle
        title="Users"
        text="Find an account by email or name. Suspending stops the account from signing in. It does not delete anything."
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
            placeholder="Email or name"
            aria-label="Search users"
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      <Table
        head={["Account", "Spaces", "Joined", "Last seen", "Status", ""]}
        empty={q ? "Nobody matches that." : "No users yet."}
      >
        {rows.map((user) => {
          const suspended = user.suspended;
          return (
            <tr key={user.id}>
              <td>
                <p className="font-semibold">{user.display_name || "No name yet"}</p>
                <p className="break-all text-[12.5px] text-ink-muted">{user.email}</p>
              </td>
              <td className="text-[13px]">
                {user.spaces.length === 0 ? (
                  <span className="text-ink-muted">none</span>
                ) : (
                  user.spaces.map((space) => (
                    <p key={space.slug}>
                      {space.name}
                      <span className="text-[12px] text-ink-muted">
                        {" "}
                        · {space.role === "college_admin" ? "admin" : space.role}
                        {space.status === "active" ? "" : `, ${space.status}`}
                      </span>
                    </p>
                  ))
                )}
              </td>
              <td className="whitespace-nowrap text-[13px] text-ink-muted">
                {when(user.created_at)}
              </td>
              <td className="whitespace-nowrap text-[13px] text-ink-muted">
                {when(user.last_sign_in_at)}
              </td>
              <td>
                <Pill value={suspended ? "suspended" : "active"} />
              </td>
              <td className="min-w-[14rem]">
                <details>
                  <summary className="cursor-pointer list-none text-[13px] font-semibold text-[#b9b4ee] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                    {suspended ? "Restore…" : "Suspend…"}
                  </summary>
                  <div className="mt-3">
                    <ConfirmForm
                      action={userSuspendedAction}
                      hidden={{ id: user.id, suspend: suspended ? "false" : "true" }}
                      submitLabel={suspended ? "Restore account" : "Suspend account"}
                      danger={!suspended}
                    />
                  </div>
                </details>
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
