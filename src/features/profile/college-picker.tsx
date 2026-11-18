"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon, PencilLineIcon, SearchIcon } from "lucide-react";
import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/endpoints";
import { collegeNameProblem } from "@/lib/college-name";
import { listedCollege, searchColleges } from "@/lib/launch-colleges";

const tidy = (text: string) => text.replace(/\s+/g, " ").trim();

// While the phone keyboard is open it covers the bottom of the screen. A sheet that sits at the bottom would slide under it, so
// we watch the visible part of the page and, with the keyboard open, put the sheet at the top of that visible part.
// The snapshot is one string ("keyboard:height:top") so it compares by value.
function viewportSnapshot(): string {
  const view = window.visualViewport;
  if (!view) return "0:0:0";
  const keyboard = window.innerWidth < 640 && window.innerHeight - view.height > 120;
  return `${keyboard ? 1 : 0}:${Math.round(view.height)}:${Math.round(view.offsetTop)}`;
}
function subscribeViewport(callback: () => void) {
  const view = window.visualViewport;
  view?.addEventListener("resize", callback);
  view?.addEventListener("scroll", callback);
  return () => {
    view?.removeEventListener("resize", callback);
    view?.removeEventListener("scroll", callback);
  };
}

/**
 * A closed field that opens a glass sheet with the colleges. The page shows only the chosen college (or "Choose your
 * college"), never the whole list. The sheet has a search box, one row per college with its short name, and at the bottom a box
 * for anyone whose college is not listed yet.
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
  const [query, setQuery] = React.useState("");
  const [typedCollege, setTypedCollege] = React.useState("");
  const [typedError, setTypedError] = React.useState<string | null>(null);
  const [similar, setSimilar] = React.useState<{ query: string; names: string[] } | null>(null);
  const view = React.useSyncExternalStore(subscribeViewport, viewportSnapshot, () => "0:0:0");
  const [keyboard, height, top] = view.split(":").map(Number);

  const listed = listedCollege(value);
  const typed = !listed && tidy(value) !== "" ? tidy(value) : null;
  const rows = searchColleges(query);
  const typedClean = tidy(typedCollege);

  // Names other people already typed, so a spelling stays the same for everyone from the same college.
  React.useEffect(() => {
    if (!open || typedClean.length < 3) return;
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
  }, [typedClean, open]);
  const suggestions =
    similar && similar.query === typedClean
      ? similar.names.filter((name) => name.toLowerCase() !== typedClean.toLowerCase()).slice(0, 3)
      : [];

  function show(next: boolean) {
    setOpen(next);
    if (next) setTypedCollege(typed ?? "");
    else {
      setQuery("");
      setTypedError(null);
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
          "flex h-12 w-full items-center gap-3 rounded-[14px] border bg-white/[0.04] px-3.5 text-left text-[15px] outline-none transition-[border-color,background-color] hover:border-white/25 focus-visible:ring-2 focus-visible:ring-ring",
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
        <DialogContent
          overlayClassName="bg-black/35 backdrop-blur-[2px]"
          style={
            keyboard
              ? { top: top, bottom: "auto", height, maxHeight: height, borderRadius: 0 }
              : undefined
          }
          className="glass-sheet flex! flex-col gap-3 border-white/20 bg-transparent! max-sm:h-[min(36rem,80dvh)] sm:max-h-[80dvh] sm:max-w-md"
        >
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle>Choose your college</DialogTitle>
            <DialogDescription className="text-ink/70">
              More colleges are coming soon. If yours is not here, type it below.
            </DialogDescription>
          </DialogHeader>
          <div className="relative shrink-0">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search colleges"
              aria-label="Search colleges"
              className="h-11 w-full rounded-[12px] border border-white/20 bg-white/[0.08] pr-3 pl-10 text-[15px] outline-none placeholder:text-ink/55 focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <ul
            role="listbox"
            aria-label="Colleges"
            className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-1"
          >
            {rows.map((college) => {
              const selected = listed?.name === college.name;
              return (
                <li key={college.name} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(college.name);
                      show(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[14px] border border-transparent px-2.5 py-2.5 text-left outline-none transition-colors hover:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-ring",
                      selected && "border-white/20 bg-white/[0.12]",
                    )}
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.12] text-[10.5px] font-bold tracking-wide">
                      {college.short.length > 4 ? college.short.slice(0, 4) : college.short}
                    </span>
                    <span className="min-w-0 flex-1 text-[14.5px] leading-snug">
                      {college.name}
                    </span>
                    {selected ? <CheckIcon aria-hidden="true" className="size-4 shrink-0" /> : null}
                  </button>
                </li>
              );
            })}
            {rows.length === 0 ? (
              <li className="px-2.5 py-4 text-[13.5px] text-ink/70">
                No college matches. Type its name in the box below.
              </li>
            ) : null}
          </ul>
          <form
            className="flex shrink-0 flex-col gap-2 border-t border-white/15 pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              applyTyped();
            }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={typedCollege}
                onChange={(event) => {
                  setTypedCollege(event.target.value);
                  setTypedError(null);
                }}
                maxLength={120}
                autoComplete="organization"
                placeholder="Didn't find your college? Type it here"
                aria-label="Type your college"
                aria-invalid={typedError ? true : undefined}
                className="h-11 min-w-0 flex-1 rounded-[12px] border border-white/20 bg-white/[0.08] px-3.5 text-[15px] outline-none placeholder:text-ink/55 focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                type="submit"
                className="h-11 rounded-[12px] px-4"
                disabled={typedClean.length < 3}
              >
                Use
              </Button>
            </div>
            {typedError ? (
              <p role="alert" className="text-[12.5px] font-medium text-danger">
                {typedError}
              </p>
            ) : null}
            {suggestions.length ? (
              <div
                role="group"
                aria-label="Colleges already on StudentOS"
                className="flex flex-wrap gap-2"
              >
                {suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onPick(name);
                      show(false);
                    }}
                    className="max-w-full truncate rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-[12.5px] outline-none hover:bg-white/[0.14] focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
