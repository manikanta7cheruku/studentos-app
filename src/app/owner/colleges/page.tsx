import { connection } from "next/server";
import { ConfirmForm } from "@/features/owner/confirm-form";
import { OwnerTitle, Pill, Table, when } from "@/features/owner/owner-ui";
import { colleges } from "@/modules/owner/owner.admin";
import { collegeStatusAction } from "../actions";

export const instant = false;

export default async function OwnerColleges() {
  await connection();
  const rows = await colleges();
  return (
    <>
      <OwnerTitle
        title="Colleges"
        text="Every space. A suspended college cannot be used until you make it active again. Global is listed too."
      />
      <Table
        head={["College", "Status", "Members", "Admins", "Domains", "Created", ""]}
        empty="No colleges yet."
      >
        {rows.map((college) => (
          <tr key={college.id}>
            <td>
              <p className="font-semibold">{college.name}</p>
              <p className="text-[12.5px] text-ink-muted">
                /c/{college.slug}
                {college.city ? ` · ${college.city}` : ""}
              </p>
            </td>
            <td>
              <Pill value={college.status} />
            </td>
            <td className="tabular">
              {college.members.toLocaleString("en-IN")}
              {college.pending ? (
                <span className="block text-[12px] text-warning">{college.pending} waiting</span>
              ) : null}
            </td>
            <td className="text-[13px]">
              {college.admins.length === 0 ? (
                <span className="text-ink-muted">none</span>
              ) : (
                college.admins.map((admin) => (
                  <p key={admin.user_id} className="break-all">
                    {admin.name || admin.email}
                    <span className="block text-[12px] text-ink-muted">{admin.email}</span>
                  </p>
                ))
              )}
            </td>
            <td className="text-[13px] text-ink-muted">{college.domains.join(", ") || "none"}</td>
            <td className="whitespace-nowrap text-[13px] text-ink-muted">
              {when(college.created_at)}
            </td>
            <td className="min-w-[15rem]">
              <details className="group">
                <summary className="cursor-pointer list-none text-[13px] font-semibold text-[#b9b4ee] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                  {college.status === "suspended" ? "Reactivate…" : "Suspend…"}
                </summary>
                <div className="mt-3">
                  <ConfirmForm
                    action={collegeStatusAction}
                    hidden={{
                      id: college.id,
                      status: college.status === "suspended" ? "active" : "suspended",
                    }}
                    submitLabel={college.status === "suspended" ? "Make active" : "Suspend college"}
                    danger={college.status !== "suspended"}
                  />
                </div>
              </details>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
