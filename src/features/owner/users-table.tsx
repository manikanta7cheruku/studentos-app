"use client";

import * as React from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Pill, when } from "@/features/owner/owner-ui";
import { ConfirmForm } from "@/features/owner/confirm-form";
import { deleteUsersAction, userSuspendedAction } from "@/app/owner/actions";
import type { OwnerUserFull } from "@/modules/owner/owner.admin";

const GENDER: Record<string, string> = {
  woman: "Woman",
  man: "Man",
  non_binary: "Non-binary",
  prefer_not_to_say: "Prefer not to say",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[13.5px]">
        {children || <span className="text-ink-muted">not given</span>}
      </dd>
    </div>
  );
}

function Details({ user, thisYear }: { user: OwnerUserFull; thisYear: number }) {
  const age = user.private.birth_year ? thisYear - user.private.birth_year : null;
  return (
    <div className="flex flex-col gap-5 bg-white/[0.02] px-4 py-4">
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Username">{user.profile.handle ? `@${user.profile.handle}` : ""}</Field>
        <Field label="Headline">{user.profile.headline}</Field>
        <Field label="College">{user.profile.college_name}</Field>
        <Field label="Branch">{user.profile.branch}</Field>
        <Field label="Graduating">
          {user.profile.grad_year ? String(user.profile.grad_year) : ""}
        </Field>
        <Field label="Gender">
          {user.private.sex
            ? `${GENDER[user.private.sex] ?? user.private.sex}${user.private.sex_public ? " (shown on profile)" : " (private)"}`
            : ""}
        </Field>
        <Field label="Birth year">
          {user.private.birth_year
            ? `${user.private.birth_year} (${age} years${user.private.age_public ? ", age shown on profile" : ", private"})`
            : ""}
        </Field>
        <Field label="Mobile number">
          {user.private.phone
            ? `${user.private.phone} (${user.private.phone_visibility === "hosts" ? "shared with plan hosts" : "hidden"})`
            : ""}
        </Field>
        <Field label="Profile visibility">{user.profile.visibility}</Field>
        <Field label="Interests">{user.profile.interests.join(", ")}</Field>
        <Field label="Tech interests">{user.profile.tech_interests.join(", ")}</Field>
        <Field label="Excited by">{user.profile.excited_by}</Field>
      </dl>
      {user.profile.bio ? (
        <dl>
          <Field label="About">{user.profile.bio}</Field>
        </dl>
      ) : null}
      <dl className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {(
          [
            ["Buzz", user.counts.buzz],
            ["Replies", user.counts.replies],
            ["Plans", user.counts.plans],
            ["Events", user.counts.events],
            ["Upvotes", user.counts.upvotes],
            ["Debates", user.counts.debates],
            ["Invited", user.counts.invited],
            ["Followers", user.counts.followers],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dd className="tabular font-heading text-[1.2rem] font-extrabold leading-none">
              {value}
            </dd>
            <dt className="mt-1 text-[11.5px] text-ink-muted">{label}</dt>
          </div>
        ))}
      </dl>
      {user.platform_admin ? (
        <p className="text-[13px] text-ink-muted">
          This is an owner account. It cannot be changed here.
        </p>
      ) : (
        <details>
          <summary className="w-fit cursor-pointer list-none text-[13px] font-semibold text-[#b9b4ee] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
            {user.suspended ? "Restore this account…" : "Suspend this account…"}
          </summary>
          <div className="mt-3">
            <ConfirmForm
              action={userSuspendedAction}
              hidden={{ id: user.id, suspend: user.suspended ? "false" : "true" }}
              submitLabel={user.suspended ? "Restore account" : "Suspend account"}
              danger={!user.suspended}
            />
          </div>
        </details>
      )}
    </div>
  );
}

/**
 * Everybody, with the whole record one tap away, and tick boxes to pick people: pick a few (or all of them) and delete them
 * in one go. Deleting asks for the PIN again and for a tick that says the person understands it cannot be undone.
 */
export function UsersTable({
  rows,
  ownerId,
  emptyText,
  thisYear,
}: {
  rows: OwnerUserFull[];
  ownerId: string;
  emptyText: string;
  /** The year now, read on the server for each request, so the age is right without reading the clock here. */
  thisYear: number;
}) {
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [open, setOpen] = React.useState<string | null>(null);
  const [asking, setAsking] = React.useState(false);
  // What was asked for, so the result can still be shown after the deleted rows (and the form) are gone.
  const [asked, setAsked] = React.useState<{ count: number; rows: number } | null>(null);

  const pickable = rows.filter((row) => row.id !== ownerId && !row.platform_admin);
  const pickableIds = new Set(pickable.map((row) => row.id));
  // Accounts that were deleted are gone from the list, so they drop out of the choice by themselves.
  const ids = [...picked].filter((id) => pickableIds.has(id));
  const allPicked = pickable.length > 0 && ids.length === pickable.length;

  function toggle(id: string) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const removed = asked && rows.length < asked.rows ? asked.rows - rows.length : 0;

  if (rows.length === 0 && !removed)
    return (
      <p className="rounded-[18px] border border-white/10 bg-white/[0.03] p-6 text-center text-[14px] text-ink-muted">
        {emptyText}
      </p>
    );

  return (
    <div className="flex flex-col gap-3">
      {removed ? (
        <p
          role="status"
          className="rounded-[16px] border border-success/40 bg-success/10 px-4 py-3 text-[13.5px] font-semibold"
        >
          Deleted {removed} of {asked?.count} {asked?.count === 1 ? "account" : "accounts"}.
          {asked && removed < asked.count
            ? " The others could not be deleted (an owner, or the only admin of a college)."
            : ""}
        </p>
      ) : null}
      <div
        className={cn(
          "sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-[16px] border px-4 py-3 text-[13.5px] backdrop-blur",
          ids.length ? "border-danger/40 bg-danger/10" : "border-white/[0.08] bg-surface/90",
        )}
      >
        <label className="inline-flex cursor-pointer items-center gap-2.5 font-semibold">
          <input
            type="checkbox"
            checked={allPicked}
            onChange={() =>
              setPicked(allPicked ? new Set() : new Set(pickable.map((row) => row.id)))
            }
            className="size-4 accent-[#8f86f0]"
          />
          {ids.length ? `${ids.length} selected` : `Select all ${pickable.length}`}
        </label>
        {ids.length ? (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(new Set())}>
              Clear
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="ml-auto"
              onClick={() => setAsking((value) => !value)}
              aria-expanded={asking}
            >
              Delete selected…
            </Button>
          </>
        ) : (
          <span className="text-ink-muted">Tick people to delete several at once.</span>
        )}
      </div>

      {ids.length && asking ? (
        <div
          className="rounded-[18px] border border-danger/40 bg-danger/[0.06] p-4"
          onSubmitCapture={() => setAsked({ count: ids.length, rows: rows.length })}
        >
          <p className="mb-3 text-[14px] font-semibold">
            Delete {ids.length} {ids.length === 1 ? "account" : "accounts"} for good?
          </p>
          <ConfirmForm
            action={deleteUsersAction}
            hidden={{ ids: ids.join(",") }}
            submitLabel={`Delete ${ids.length} ${ids.length === 1 ? "account" : "accounts"}`}
            danger
          >
            <label className="flex items-start gap-2.5 text-[13.5px] leading-snug">
              <input type="checkbox" required className="mt-0.5 size-4 accent-[#e0566a]" />
              <span>
                I understand. Their login, profile, posts, messages and everything else they made
                are deleted and cannot be brought back.
              </span>
            </label>
          </ConfirmForm>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[18px] border border-white/[0.08] bg-surface">
        <table className="w-full min-w-[46rem] border-collapse text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-white/[0.08] text-[12px] uppercase tracking-[0.06em] text-ink-muted">
              <th scope="col" className="w-10 px-4 py-3" aria-label="Select" />
              {["Person", "College", "Spaces", "Joined", "Last seen", "Status", ""].map(
                (label, index) => (
                  <th key={index} scope="col" className="px-4 py-3 font-semibold">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="[&_td]:px-4 [&_td]:py-3 [&_td]:align-top">
            {rows.map((user) => {
              const isOpen = open === user.id;
              const locked = user.id === ownerId || user.platform_admin;
              return (
                <React.Fragment key={user.id}>
                  <tr
                    className={cn(
                      "border-b border-white/[0.06]",
                      ids.includes(user.id) && "bg-danger/[0.06]",
                    )}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={ids.includes(user.id)}
                        disabled={locked}
                        onChange={() => toggle(user.id)}
                        aria-label={`Select ${user.profile.display_name || user.email}`}
                        className="mt-1 size-4 accent-[#8f86f0] disabled:opacity-30"
                      />
                    </td>
                    <td>
                      <p className="font-semibold">{user.profile.display_name || "No name yet"}</p>
                      <p className="break-all text-[12.5px] text-ink-muted">{user.email}</p>
                    </td>
                    <td className="text-[13px]">
                      {user.profile.college_name ? (
                        <>
                          <p>{user.profile.college_name}</p>
                          <p className="text-[12px] text-ink-muted">
                            {[user.profile.branch, user.profile.grad_year]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </>
                      ) : (
                        <span className="text-ink-muted">not given</span>
                      )}
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
                      <Pill value={user.suspended ? "suspended" : "active"} />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : user.id)}
                        aria-expanded={isOpen}
                        className="text-[13px] font-semibold text-[#b9b4ee] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {isOpen ? "Hide" : "Everything"}
                      </button>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr className="border-b border-white/[0.06]">
                      <td colSpan={8} className="!p-0">
                        <Details user={user} thisYear={thisYear} />
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
