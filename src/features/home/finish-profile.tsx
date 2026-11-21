"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon, SparklesIcon, XIcon } from "lucide-react";
import { GlassSheet } from "@/components/app/glass-sheet";
import { Spinner } from "@/components/app/spinner";
import { Banner } from "@/components/ui/banner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/endpoints";
import { friendlyMessage } from "@/lib/api-client";
import { placeProblem } from "@/lib/college-name";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import {
  BirthYearField,
  SexField,
  StudyFields,
  tidy,
  type Sex,
} from "@/features/profile/about-fields";

const KEY = "studentos.finish-profile.dismissed";
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type Saved = Awaited<ReturnType<typeof api.profile.get>>;

/** The seven things asked after the welcome, and whether each one is done. */
function stepsOf(profile: Saved, strengths: number) {
  return [
    { key: "sex", done: Boolean(profile.sex) },
    { key: "branch", done: Boolean(profile.branch) },
    { key: "year", done: Boolean(profile.grad_year) },
    { key: "place", done: Boolean(profile.place) },
    { key: "birth", done: Boolean(profile.birth_year) },
    { key: "excited", done: Boolean(profile.excited_by) },
    { key: "strengths", done: strengths > 0 },
  ];
}

/**
 * Home: a calm card that asks for the rest of the profile (gender, branch, year, city, birth year, a line about yourself,
 * strengths), which the welcome no longer asks. It opens a glass sheet, can be skipped, and goes away by itself when everything
 * is filled in. Dismissing it is remembered on this device only.
 */
export function FinishProfile() {
  // Read on the device only. On the server (and when storage is blocked) the card stays hidden.
  const stored = React.useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(KEY) === "1" ? "1" : "0";
      } catch {
        return "0";
      }
    },
    () => "1",
  );
  const profile = useLoad(() => api.profile.get(), []);
  const skills = useLoad(() => api.profile.skills(), []);
  const [open, setOpen] = React.useState(false);
  if (stored === "1" || profile.status !== "ready") return null;
  const strengths = skills.status === "ready" ? skills.data.skills.length : 0;
  const steps = stepsOf(profile.data, strengths);
  const done = steps.filter((step) => step.done).length;
  if (done === steps.length) return null;
  return (
    <>
      <section
        aria-label="Finish your profile"
        className="glass-card relative flex items-center gap-3.5 rounded-[22px] py-3.5 pl-4 pr-2.5"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-white/[0.14] bg-white/[0.07] text-ink/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
        >
          <SparklesIcon className="size-5" />
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-bold leading-snug">Finish your profile</span>
            <span className="tabular block text-[12.5px] text-ink-muted">
              {done} of {steps.length} done
            </span>
            <span
              aria-hidden="true"
              className="mt-2 block h-1 overflow-hidden rounded-full bg-white/[0.1]"
            >
              <span
                className="block h-full rounded-full bg-[#9a92f2] transition-[width] duration-500"
                style={{ width: `${(done / steps.length) * 100}%` }}
              />
            </span>
          </span>
          <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
        </button>
        <button
          type="button"
          aria-label="Not now"
          onClick={() => {
            try {
              window.localStorage.setItem(KEY, "1");
            } catch {
              // Not remembered. It will show again next time, which is harmless.
            }
            listeners.forEach((listener) => listener());
          }}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted outline-none transition-colors hover:bg-white/[0.08] hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </button>
      </section>
      <FinishSheet
        open={open}
        onOpenChange={setOpen}
        saved={profile.data}
        strengths={strengths}
        onSaved={profile.reload}
      />
    </>
  );
}

function FinishSheet({
  open,
  onOpenChange,
  saved,
  strengths,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saved: Saved;
  strengths: number;
  onSaved: () => void;
}) {
  const { slug } = useCollege();
  const [sex, setSex] = React.useState<Sex | null>(saved.sex);
  const [branch, setBranch] = React.useState(saved.branch ?? "");
  const [year, setYear] = React.useState<number | null>(saved.grad_year);
  const [place, setPlace] = React.useState(saved.place ?? "");
  const [birth, setBirth] = React.useState<number | null>(saved.birth_year);
  const [excited, setExcited] = React.useState(saved.excited_by ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});
  // A box has the keyboard: the sheet rises to the top of the screen with it, and settles back when the focus leaves.
  const [typing, setTypingNow] = React.useState(false);
  const leave = React.useRef<number | null>(null);
  const setTyping = (next: boolean) => {
    if (leave.current !== null) window.clearTimeout(leave.current);
    leave.current = null;
    if (next) setTypingNow(true);
    else leave.current = window.setTimeout(() => setTypingNow(false), 220);
  };
  React.useEffect(
    () => () => {
      if (leave.current !== null) window.clearTimeout(leave.current);
    },
    [],
  );

  async function save() {
    if (busy) return;
    const problems: Record<string, string> = {};
    if (tidy(place) && placeProblem(place)) problems.place = placeProblem(place)!;
    setFields(problems);
    if (Object.keys(problems).length) return;
    const patch: Parameters<typeof api.profile.patch>[0] = {};
    if (sex && sex !== saved.sex) patch.sex = sex;
    if (tidy(branch) && tidy(branch) !== saved.branch) patch.branch = tidy(branch);
    if (year && year !== saved.grad_year) patch.grad_year = year;
    if (tidy(place) && tidy(place) !== saved.place) patch.place = tidy(place);
    if (birth && birth !== saved.birth_year) patch.birth_year = birth;
    if (excited.trim() && excited.trim() !== saved.excited_by) patch.excited_by = excited.trim();
    if (Object.keys(patch).length === 0) return onOpenChange(false);
    setBusy(true);
    setError(null);
    try {
      await api.profile.patch(patch);
      onSaved();
      onOpenChange(false);
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not save that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Finish your profile"
      description="All optional. It helps people find you and know who you are."
      typing={typing}
    >
      <div
        className="pro-scroll -mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pt-1 pb-5"
        onFocusCapture={(event) => {
          if ((event.target as HTMLElement).matches("input, textarea")) setTyping(true);
        }}
        onBlurCapture={(event) => {
          const next = event.relatedTarget;
          const stays =
            next instanceof HTMLElement &&
            next.closest(".pro-sheet") !== null &&
            next.matches("input, textarea");
          if (!stays) setTyping(false);
        }}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-ink/90">Gender</p>
            <SexField value={sex} onChange={setSex} />
            <p className="text-[12.5px] text-ink-muted">
              Private unless you choose to show it on your profile.
            </p>
          </div>
          <StudyFields
            showCollege={false}
            college={saved.college_name ?? ""}
            branch={branch}
            year={year}
            onCollege={() => undefined}
            onBranch={setBranch}
            onYear={setYear}
            place={place}
            onPlace={setPlace}
            afterYear={<BirthYearField value={birth} onChange={setBirth} />}
            errors={fields}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="finish-excited" className="text-[13px] font-semibold text-ink/90">
              What makes you excited?
            </label>
            <Textarea
              id="finish-excited"
              value={excited}
              onChange={(event) => setExcited(event.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Late night football, building small apps, trying every café nearby"
            />
          </div>
          <Link
            href={`/c/${slug}/me/strengths`}
            className="glass-field flex min-h-12 items-center justify-between gap-3 rounded-[14px] px-3.5 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>
              <span className="block font-semibold">Your strengths</span>
              <span className="block text-[12.5px] text-ink-muted">
                {strengths > 0
                  ? `${strengths} added`
                  : "What you are good at, so people can find you"}
              </span>
            </span>
            <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
          </Link>
          {error ? (
            <Banner variant="error">
              <p>{error}</p>
            </Banner>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2.5 pt-2">
        <button type="button" onClick={() => onOpenChange(false)} className="profile-btn flex-1">
          Skip for now
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="profile-btn profile-btn-primary flex-1"
        >
          {busy ? <Spinner /> : null} Save
        </button>
      </div>
    </GlassSheet>
  );
}
