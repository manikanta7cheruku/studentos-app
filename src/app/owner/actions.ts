"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import {
  checkPin,
  makeCode,
  removeContent,
  ownerAudit,
  revokeCode,
  setCollegeStatus,
  setUserSuspended,
} from "@/modules/owner/owner.admin";
import { requireOpenOwner, requireOwner } from "@/modules/owner/owner-access";
import { UNLOCK_COOKIE, UNLOCK_MINUTES, makeUnlock } from "@/modules/owner/owner-session";

// Server actions of the owner dashboard. Anyone can POST to a server action, so each one checks again who is calling:
// the signed-in account, the allow-list and the unlock. Actions that change something also ask for the PIN again
// (a PIN typed in the last seconds, not the unlock), so a left-open screen cannot change a college or a code.

export type OwnerActionState = { error?: string; ok?: string; code?: string } | null;

const WRONG = "That PIN is not right.";
const LOCKED = "Too many wrong tries. It is locked for a while.";
const idSchema = z.uuid();

async function confirmPin(form: FormData): Promise<{ userId: string } | { error: string }> {
  let userId: string;
  try {
    userId = (await requireOpenOwner()).id;
  } catch {
    return { error: "The dashboard is locked. Reload the page and enter the PIN." };
  }
  const pin = String(form.get("pin") ?? "");
  if (!pin) return { error: "Enter the PIN to confirm." };
  const result = await checkPin(userId, pin);
  if (result === "locked") return { error: LOCKED };
  if (result === "wrong") return { error: WRONG };
  return { userId };
}

function failure(caught: unknown): OwnerActionState {
  if (caught instanceof AppError && caught.code === "NOT_FOUND")
    return { error: "That item was not found, or it was already changed." };
  if (caught instanceof AppError && caught.code === "FORBIDDEN")
    return { error: "That account cannot be changed here." };
  return { error: "Something went wrong. Nothing was changed." };
}

export async function unlockAction(
  _previous: OwnerActionState,
  form: FormData,
): Promise<OwnerActionState> {
  let userId: string;
  try {
    userId = (await requireOwner()).id;
  } catch {
    return { error: "Sign in again to continue." };
  }
  const result = await checkPin(userId, String(form.get("pin") ?? ""));
  if (result === "locked") return { error: LOCKED };
  if (result === "wrong") return { error: WRONG };
  const jar = await cookies();
  jar.set(UNLOCK_COOKIE, makeUnlock(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/owner",
    maxAge: UNLOCK_MINUTES * 60,
  });
  await ownerAudit(userId, "owner.unlock");
  redirect("/owner");
}

export async function lockAction(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: UNLOCK_COOKIE, path: "/owner" });
  redirect("/owner");
}

export async function makeCodeAction(
  _previous: OwnerActionState,
  form: FormData,
): Promise<OwnerActionState> {
  const confirmed = await confirmPin(form);
  if ("error" in confirmed) return confirmed;
  const label = String(form.get("label") ?? "").trim();
  const days = Number(form.get("days"));
  if (label.length < 3 || label.length > 120)
    return { error: "Give the code a name (3 to 120 characters)." };
  if (!Number.isInteger(days) || days < 1 || days > 30)
    return { error: "Days must be between 1 and 30." };
  try {
    const code = await makeCode(confirmed.userId, label, days);
    revalidatePath("/owner/codes");
    return { ok: "Code made. Copy it now. It is not shown again.", code };
  } catch (caught) {
    return failure(caught);
  }
}

export async function revokeCodeAction(
  _previous: OwnerActionState,
  form: FormData,
): Promise<OwnerActionState> {
  const confirmed = await confirmPin(form);
  if ("error" in confirmed) return confirmed;
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) return { error: "That code was not found." };
  try {
    await revokeCode(confirmed.userId, id.data);
    revalidatePath("/owner/codes");
    return { ok: "Code revoked." };
  } catch (caught) {
    return failure(caught);
  }
}

export async function collegeStatusAction(
  _previous: OwnerActionState,
  form: FormData,
): Promise<OwnerActionState> {
  const confirmed = await confirmPin(form);
  if ("error" in confirmed) return confirmed;
  const id = idSchema.safeParse(form.get("id"));
  const status = z.enum(["active", "suspended"]).safeParse(form.get("status"));
  if (!id.success || !status.success) return { error: "That college was not found." };
  try {
    await setCollegeStatus(confirmed.userId, id.data, status.data);
    revalidatePath("/owner/colleges");
    return { ok: status.data === "suspended" ? "College suspended." : "College is active again." };
  } catch (caught) {
    return failure(caught);
  }
}

export async function removeContentAction(
  _previous: OwnerActionState,
  form: FormData,
): Promise<OwnerActionState> {
  const confirmed = await confirmPin(form);
  if ("error" in confirmed) return confirmed;
  const id = idSchema.safeParse(form.get("id"));
  const kind = z.enum(["plan", "thought", "event", "listing"]).safeParse(form.get("kind"));
  const reason = z
    .enum(["spam", "inappropriate", "harassment", "scam", "duplicate", "other"])
    .safeParse(form.get("reason"));
  if (!id.success || !kind.success) return { error: "That item was not found." };
  if (!reason.success) return { error: "Pick a reason. The author is told it." };
  const note = String(form.get("note") ?? "")
    .trim()
    .slice(0, 300);
  try {
    await removeContent(confirmed.userId, kind.data, id.data, reason.data, note || null);
    revalidatePath("/owner/content");
    return { ok: "Removed. The author was told why." };
  } catch (caught) {
    return failure(caught);
  }
}

export async function userSuspendedAction(
  _previous: OwnerActionState,
  form: FormData,
): Promise<OwnerActionState> {
  const confirmed = await confirmPin(form);
  if ("error" in confirmed) return confirmed;
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) return { error: "That account was not found." };
  const suspend = form.get("suspend") === "true";
  try {
    await setUserSuspended(confirmed.userId, id.data, suspend);
    revalidatePath("/owner/users");
    return { ok: suspend ? "Account suspended." : "Account restored." };
  } catch (caught) {
    return failure(caught);
  }
}
