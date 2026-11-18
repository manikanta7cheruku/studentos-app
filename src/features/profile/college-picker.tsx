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

// While the phone keyboard is open it covers the bottom of the screen. The sheet keeps sitting at the bottom of what is still
// visible: we lift it by the height of the keyboard and shrink it to fit, and a short transition makes that a glide, not a jump.
// One string ("mobile:keyboard height:visible height") so it compares by value.
function viewportSnapshot(): string {
  const view = window.visualViewport;
  const mobile = window.innerWidth < 640;
  if (!view || !mobile) return `${mobile ? 1 : 0}:0:0`;
  const lift = Math.max(0, Math.round(window.innerHeight - view.height - view.offsetTop));
  return `1:${lift > 80 ? lift : 0}:${Math.round(view.height)}`;
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
 * for anyone whose college is not listed yet. What is typed there is matched against the list and against the names other
 * students have typed, so the suggestions always follow the letters being typed.
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
  const [mobile = 0, lift = 0, visible = 0] = view.split(":").map(Number);

  const listed = listedCollege(value);
  const typed = !listed && tidy(value) !== "" ? tidy(value) : null;
  const rows = searchColleges(query);
  const typedClean = tidy(typedCollege);

  // Names other students already typed, so a spelling stays the same for everyone from the same college.
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
    return all.filter((name) => name.toLowerCase() !== typedClean.toLowerCase()).slice(0, 3);
  }, [typedClean, similar]);

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
        <DialogContent
          overlayClassName="bg-black/30"
          // The keyboard opens only when someone taps a box, never by itself the moment the sheet appears.
          onOpenAutoFocus={(event) => event.preventDefault()}
          style={
            mobile
              ? {
                  bottom: lift,
                  maxHeight: lift ? Math.max(260, visible - 12) : undefined,
                }
              : undefined
          }
          className="glass-pro flex! flex-col gap-3 border-0 p-4 data-open:fade-in-100! data-closed:fade-out-100! max-sm:h-[min(36rem,80dvh)] max-sm:rounded-b-none max-sm:transition-[bottom,max-height] max-sm:duration-200 max-sm:ease-out sm:max-h-[80dvh] sm:max-w-md"
        >
          <DialogHeader className="shrink-0 gap-1 pr-8">
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Choose your college
            </DialogTitle>
            <DialogDescription className="text-[13px] text-ink/65">
              More colleges are coming soon. If yours is not here, type it below.
            </DialogDescription>
          </DialogHeader>
          <div className="relative shrink-0">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink/55"
            />
            <input
              type="search"
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
            className="-mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2"
          >
            {rows.map((college) => {
              const selected = listed?.name === college.name;
              return (
                <li key={college.name} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => choose(college.name)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-white/[0.07] focus-visible:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-ring active:bg-white/[0.1]",
                      selected && "bg-white/[0.09]",
                    )}
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
                No college matches. Type its name in the box below.
              </li>
            ) : null}
          </ul>
          <form
            className="flex shrink-0 flex-col gap-2 border-t border-white/[0.1] pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              applyTyped();
            }}
          >
            {suggestions.length ? (
              <div
                role="group"
                aria-label="Suggestions"
                className="flex flex-col overflow-hidden rounded-[12px] ring-1 ring-white/[0.1]"
              >
                {suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => choose(name)}
                    className="truncate bg-white/[0.04] px-3 py-2.5 text-left text-[13.5px] outline-none transition-colors hover:bg-white/[0.09] focus-visible:bg-white/[0.09]"
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : null}
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
                className="glass-field h-11 min-w-0 flex-1 rounded-[12px] px-3.5 text-[15px] outline-none placeholder:text-ink/50"
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
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
