"use client";

import * as React from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilLineIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "cn";
import { Dialog, DialogDescription, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/endpoints";
import { collegeNameProblem } from "@/lib/college-name";
import { LAUNCH_COLLEGES, listedCollege, searchColleges } from "@/lib/launch-colleges";

const tidy = (text: string) => text.replace(/\s+/g, " ").trim();

/** Does a college name contain every word the person has typed so far? ("guru tech" finds "Guru Nanak Institute of Technology".) */
function relevant(name: string, typed: string): boolean {
  const words = typed
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 2);
  if (words.length === 0) return false;
  const lower = name.toLowerCase();
  return words.every((word) => lower.includes(word));
}

const rowClass =
  "flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-white/[0.07] focus-visible:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-ring active:bg-white/[0.1]";

/**
 * A closed field that opens a glass sheet with the colleges. The page shows only the chosen college (or "Choose your
 * college"), never the whole list. The sheet has two views: the list (search box and one row per college) and, for anyone whose
 * college is not listed yet, a view to type it, where suggestions follow the letters being typed.
 */
export function CollegePicker({
  id,
  labelledBy,
  value,
  invalid,
  describedBy,
  onPick,
}: {
  id: string;
  /** The id of the visible label above the field; the button is named by it and by what it shows. */
  labelledBy: string;
  /** The college name as saved: a listed name, a name someone typed, or empty. */
  value: string;
  invalid?: boolean;
  describedBy?: string;
  onPick: (name: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<"list" | "type">("list");
  const [query, setQuery] = React.useState("");
  const [typedCollege, setTypedCollege] = React.useState("");
  const [typedError, setTypedError] = React.useState<string | null>(null);
  const [similar, setSimilar] = React.useState<{ query: string; names: string[] } | null>(null);
  // Typing: a box in the sheet has the focus. The sheet then slides up to the top of the screen at the moment of the tap, in step
  // with the keyboard rising, and back down when the focus leaves. It follows the focus and nothing else (not the size the phone
  // reports for the keyboard, which differs from phone to phone and arrives late), so it never moves at a surprising moment.
  // Leaving is delayed a moment: a tap on a row blurs the box first, and the sheet must not slide away from under the finger
  // before the tap lands.
  const [typing, setTypingNow] = React.useState(false);
  const leaveTimer = React.useRef<number | null>(null);
  const setTyping = React.useCallback((next: boolean) => {
    if (leaveTimer.current !== null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (next) setTypingNow(true);
    else leaveTimer.current = window.setTimeout(() => setTypingNow(false), 220);
  }, []);
  React.useEffect(
    () => () => {
      if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
    },
    [],
  );
  // Focus handlers for the two boxes. Focus moving to another box in the sheet keeps the sheet where it is.
  const typingProps = {
    onFocus: () => setTyping(true),
    onPointerDown: () => setTyping(true),
    onBlur: (event: React.FocusEvent) => {
      const next = event.relatedTarget;
      const staysTyping =
        next instanceof HTMLElement &&
        next.closest(".college-sheet") !== null &&
        next.matches("input, textarea");
      if (!staysTyping) setTyping(false);
    },
  };
  // A tap on a row or a button inside the sheet must not take the focus away from the box first: that would close the keyboard
  // and move the sheet under the finger before the tap lands.
  const keepFocus = { onMouseDown: (event: React.MouseEvent) => event.preventDefault() };

  const listed = listedCollege(value);
  const typed = !listed && tidy(value) !== "" ? tidy(value) : null;
  const rows = searchColleges(query);
  const typedClean = tidy(typedCollege);

  // Names other students already typed, so a spelling stays the same for everyone from the same college.
  React.useEffect(() => {
    if (!open || view !== "type" || typedClean.length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api.colleges
        .suggest(typedClean, controller.signal)
        .then((names) => setSimilar({ query: typedClean, names }))
        .catch(() => undefined);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [typedClean, open, view]);
  // Suggestions follow what is typed: the listed colleges that match, then names other students typed that match. Never a
  // name that has nothing to do with the letters.
  const suggestions = React.useMemo(() => {
    if (typedClean.length < 2) return [];
    const fromList = LAUNCH_COLLEGES.filter((college) => relevant(college.name, typedClean)).map(
      (college) => college.name,
    );
    const fromOthers =
      similar && similar.query === typedClean
        ? similar.names.filter((name) => relevant(name, typedClean))
        : [];
    const all = [...new Set([...fromList, ...fromOthers])];
    return all.filter((name) => name.toLowerCase() !== typedClean.toLowerCase()).slice(0, 4);
  }, [typedClean, similar]);

  function show(next: boolean) {
    setOpen(next);
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
    setTypingNow(false);
    if (next) {
      setView("list");
      setTypedCollege(typed ?? "");
    } else {
      // Reset only after the sheet has slid away, so nothing changes while it is leaving.
      window.setTimeout(() => {
        setQuery("");
        setTypedError(null);
        setView("list");
      }, 300);
    }
  }

  function applyTyped() {
    const problem = collegeNameProblem(typedCollege);
    if (problem) {
      setTypedError(problem);
      return;
    }
    onPick(typedClean);
    show(false);
  }

  function choose(name: string) {
    onPick(name);
    show(false);
  }

  return (
    <>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${labelledBy} ${id}-value`}
        aria-describedby={describedBy}
        onClick={() => show(true)}
        className={cn(
          "flex h-12 w-full items-center gap-3 rounded-[14px] border bg-white/[0.04] px-3.5 text-left text-[15px] outline-none transition-[border-color,background-color] duration-200 hover:border-white/25 focus-visible:ring-2 focus-visible:ring-ring",
          invalid ? "border-danger" : "border-white/10",
        )}
      >
        {listed ? (
          <span className="inline-flex h-6 shrink-0 items-center rounded-md bg-white/10 px-2 text-[11px] font-bold tracking-wide">
            {listed.short}
          </span>
        ) : typed ? (
          <PencilLineIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
        ) : null}
        <span
          id={`${id}-value`}
          className={cn("min-w-0 flex-1 truncate", listed || typed ? "text-ink" : "text-ink-muted")}
        >
          {listed ? listed.name : (typed ?? "Choose your college")}
        </span>
        <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
      </button>

      <Dialog open={open} onOpenChange={show}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="college-scrim" />
          <DialogPrimitive.Content
            // The keyboard opens only when someone taps a box, never by itself the moment the sheet appears.
            onOpenAutoFocus={(event) => event.preventDefault()}
            data-typing={typing ? "true" : undefined}
            className="college-sheet glass-pro"
          >
            <div className="flex shrink-0 items-start gap-2">
              {view === "type" ? (
                <button
                  type="button"
                  {...keepFocus}
                  onClick={() => {
                    setView("list");
                    setTyping(false);
                    // The box that had the keyboard is leaving: hand the keyboard back.
                    if (document.activeElement instanceof HTMLElement)
                      document.activeElement.blur();
                  }}
                  aria-label="Back to the list"
                  className="-ml-1.5 mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink/80 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronLeftIcon aria-hidden="true" className="size-5" />
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-[17px] font-semibold tracking-tight">
                  {view === "list" ? "Choose your college" : "Type your college"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] text-ink/65">
                  {view === "list"
                    ? "More colleges are coming soon."
                    : "Write its full name, for example Alpha Institute of Technology."}
                </DialogDescription>
              </div>
              <DialogPrimitive.Close
                aria-label="Close"
                className="-mr-1.5 mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink/80 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XIcon aria-hidden="true" className="size-[18px]" />
              </DialogPrimitive.Close>
            </div>

            {view === "list" ? (
              <>
                <div className="relative shrink-0">
                  <SearchIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink/55"
                  />
                  <input
                    type="search"
                    {...typingProps}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search colleges"
                    aria-label="Search colleges"
                    className="glass-field h-11 w-full rounded-[12px] pr-3 pl-10 text-[15px] outline-none placeholder:text-ink/50"
                  />
                </div>
                <ul
                  role="listbox"
                  aria-label="Colleges"
                  className="college-scroll -mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2"
                >
                  {rows.map((college) => {
                    const selected = listed?.name === college.name;
                    return (
                      <li key={college.name} role="option" aria-selected={selected}>
                        <button
                          type="button"
                          {...keepFocus}
                          onClick={() => choose(college.name)}
                          className={cn(rowClass, selected && "bg-white/[0.09]")}
                        >
                          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-semibold tracking-wide text-ink/85 ring-1 ring-white/[0.12]">
                            {college.short.length > 4 ? college.short.slice(0, 4) : college.short}
                          </span>
                          <span className="min-w-0 flex-1 text-[14.5px] leading-snug">
                            {college.name}
                          </span>
                          {selected ? (
                            <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-ink/80" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                  {rows.length === 0 ? (
                    <li className="px-2.5 py-4 text-[13.5px] text-ink/65">
                      No college matches your search.
                    </li>
                  ) : null}
                </ul>
                <button
                  type="button"
                  {...keepFocus}
                  onClick={() => setView("type")}
                  className="glass-field flex h-12 w-full shrink-0 items-center gap-3 rounded-[12px] px-3.5 text-left text-[14.5px] outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <PencilLineIcon aria-hidden="true" className="size-4 shrink-0 text-ink/70" />
                  <span className="min-w-0 flex-1 truncate">
                    Didn&apos;t find your college? Type it here
                  </span>
                  <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-ink/60" />
                </button>
              </>
            ) : (
              <form
                className="flex min-h-0 flex-1 flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  applyTyped();
                }}
              >
                <div className="flex shrink-0 gap-2">
                  <input
                    type="text"
                    value={typedCollege}
                    onChange={(event) => {
                      setTypedCollege(event.target.value);
                      setTypedError(null);
                    }}
                    maxLength={120}
                    autoComplete="organization"
                    autoFocus
                    {...typingProps}
                    placeholder="Didn't find your college? Type it here"
                    aria-label="Type your college"
                    aria-invalid={typedError ? true : undefined}
                    className="glass-field h-11 min-w-0 flex-1 rounded-[12px] px-3.5 text-[15px] outline-none placeholder:text-ink/50"
                  />
                  <Button
                    type="submit"
                    {...keepFocus}
                    className="h-11 rounded-[12px] px-4"
                    disabled={typedClean.length < 3}
                  >
                    Use
                  </Button>
                </div>
                {typedError ? (
                  <p role="alert" className="shrink-0 text-[12.5px] font-medium text-danger">
                    {typedError}
                  </p>
                ) : null}
                <div
                  role="group"
                  aria-label="Suggestions"
                  className="college-scroll -mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2"
                >
                  {suggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      {...keepFocus}
                      onClick={() => choose(name)}
                      className={rowClass}
                    >
                      <SearchIcon aria-hidden="true" className="size-4 shrink-0 text-ink/55" />
                      <span className="min-w-0 flex-1 text-[14.5px] leading-snug">{name}</span>
                    </button>
                  ))}
                </div>
              </form>
            )}
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}
