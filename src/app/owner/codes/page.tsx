import { connection } from "next/server";
import { Input } from "@/components/ui/input";
import { ConfirmForm } from "@/features/owner/confirm-form";
import { OwnerTitle, Panel, Pill, Table, when } from "@/features/owner/owner-ui";
import { codes } from "@/modules/owner/owner.admin";
import { makeCodeAction, revokeCodeAction } from "../actions";

export const instant = false;

export default async function OwnerCodes() {
  await connection();
  const rows = await codes();
  return (
    <>
      <OwnerTitle
        title="Setup codes"
        text="A college admin needs one of these to create their college at /setup. A code works once and expires. Only a fingerprint is kept, so a lost code is replaced, not recovered."
      />
      <Panel title="Make a code" className="mb-6">
        <ConfirmForm action={makeCodeAction} submitLabel="Make the code">
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="code-label" className="text-[12.5px] font-semibold text-ink-muted">
                Name, for your notes
              </label>
              <Input
                id="code-label"
                name="label"
                required
                minLength={3}
                maxLength={120}
                placeholder="Alpha Institute of Technology"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="code-days" className="text-[12.5px] font-semibold text-ink-muted">
                Valid for (days)
              </label>
              <Input
                id="code-days"
                name="days"
                type="number"
                min={1}
                max={30}
                defaultValue={14}
                required
              />
            </div>
          </div>
        </ConfirmForm>
      </Panel>
      <Table head={["Name", "State", "Made", "Expires", "Used by", ""]} empty="No codes made yet.">
        {rows.map((code) => (
          <tr key={code.id}>
            <td className="font-semibold">{code.label || "No name"}</td>
            <td>
              <Pill value={code.state} />
            </td>
            <td className="whitespace-nowrap text-[13px] text-ink-muted">
              {when(code.created_at)}
            </td>
            <td className="whitespace-nowrap text-[13px] text-ink-muted">
              {when(code.expires_at)}
            </td>
            <td className="text-[13px]">
              {code.used_at ? (
                <>
                  <span className="break-all">{code.used_by_email ?? "a removed account"}</span>
                  <span className="block text-[12px] text-ink-muted">
                    {code.college_slug ? `/c/${code.college_slug} · ` : ""}
                    {when(code.used_at)}
                  </span>
                </>
              ) : (
                <span className="text-ink-muted">not used</span>
              )}
            </td>
            <td className="min-w-[14rem]">
              {code.state === "active" ? (
                <details>
                  <summary className="cursor-pointer list-none text-[13px] font-semibold text-danger outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                    Revoke…
                  </summary>
                  <div className="mt-3">
                    <ConfirmForm
                      action={revokeCodeAction}
                      hidden={{ id: code.id }}
                      submitLabel="Revoke code"
                      danger
                    />
                  </div>
                </details>
              ) : null}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
