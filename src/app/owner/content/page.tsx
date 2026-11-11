import { connection } from "next/server";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmForm } from "@/features/owner/confirm-form";
import { OwnerTitle, Pill, Table, when } from "@/features/owner/owner-ui";
import { content } from "@/modules/owner/owner.admin";
import { removeContentAction } from "../actions";

export const instant = false;

const KIND = { plan: "Plan", thought: "Thought", event: "Event", listing: "Board post" } as const;
const REASONS = [
  ["spam", "Spam"],
  ["inappropriate", "Inappropriate"],
  ["harassment", "Harassment"],
  ["scam", "Scam or fake"],
  ["duplicate", "Duplicate"],
  ["other", "Other"],
] as const;

export default async function OwnerContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();
  const { q = "" } = await searchParams;
  const rows = await content(q.slice(0, 80));
  return (
    <>
      <OwnerTitle
        title="Content"
        text="Every plan, thought, event and board post across all colleges. Removing one hides it and tells its author why. It is kept in the audit log."
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
            placeholder="Words in the title"
            aria-label="Search content"
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      <Table
        head={["What", "Author", "Space", "Posted", "Status", ""]}
        empty={q ? "Nothing matches that." : "Nothing has been posted yet."}
      >
        {rows.map((item) => (
          <tr key={`${item.kind}-${item.id}`}>
            <td>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                {KIND[item.kind]}
              </p>
              <p className="font-semibold">{item.title || "(no title)"}</p>
            </td>
            <td className="text-[13px]">{item.author}</td>
            <td className="text-[13px] text-ink-muted">{item.college_slug}</td>
            <td className="whitespace-nowrap text-[13px] text-ink-muted">
              {when(item.created_at)}
            </td>
            <td>
              <Pill value={item.status} />
            </td>
            <td className="min-w-[16rem]">
              {item.status === "removed" ? null : (
                <details>
                  <summary className="cursor-pointer list-none text-[13px] font-semibold text-[#b9b4ee] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                    Remove…
                  </summary>
                  <div className="mt-3">
                    <ConfirmForm
                      action={removeContentAction}
                      hidden={{ id: item.id, kind: item.kind }}
                      submitLabel="Remove and tell the author"
                      danger
                    >
                      <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-ink-muted">
                        Reason (sent to the author)
                        <select
                          name="reason"
                          required
                          defaultValue=""
                          className="h-11 rounded-[12px] border border-white/10 bg-white/[0.045] px-3 text-[14px] font-normal text-ink"
                        >
                          <option value="" disabled>
                            Pick a reason
                          </option>
                          {REASONS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-ink-muted">
                        Note (optional)
                        <Input name="note" maxLength={300} autoComplete="off" />
                      </label>
                    </ConfirmForm>
                  </div>
                </details>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
