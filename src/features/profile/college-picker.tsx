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
import { LAUNCH_COLLEGES, listedCollege, searchColleges } from "@/lib/launch-colleges";

/**
 * A closed field that opens a sheet with the colleges. The list is not on the page itself: the page shows only the chosen
 * college (or "Choose your college"), and the sheet has a search box, one row per college with its short name, and an
 * "Other" row for everyone whose college is not listed yet.
 */
export function CollegePicker({
  id,
  value,
  other,
  invalid,
  describedBy,
  onPick,
  onOther,
}: {
  id: string;
  /** The college name as saved. */
  value: string;
  /** True while the person is typing their own college instead. */
  other: boolean;
  invalid?: boolean;
  describedBy?: string;
  onPick: (name: string) => void;
  onOther: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const chosen = other ? null : listedCollege(value);
  const rows = searchColleges(query);

  function close(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  return (
    <>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-12 w-full items-center gap-3 rounded-[14px] border bg-white/[0.04] px-3.5 text-left text-[15px] outline-none transition-[border-color,background-color] hover:border-white/25 focus-visible:ring-2 focus-visible:ring-ring",
          invalid ? "border-danger" : "border-white/10",
        )}
      >
        {chosen ? (
          <span className="inline-flex h-6 shrink-0 items-center rounded-md bg-white/10 px-2 text-[11px] font-bold tracking-wide">
            {chosen.short}
          </span>
        ) : other ? (
          <PencilLineIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
        ) : null}
        <span
          className={cn("min-w-0 flex-1 truncate", chosen || other ? "text-ink" : "text-ink-muted")}
        >
          {chosen ? chosen.name : other ? "Other college" : "Choose your college"}
        </span>
        <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
      </button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-sm:max-h-[85dvh] max-sm:overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose your college</DialogTitle>
            <DialogDescription>
              More colleges are on the way. If yours is not here, choose Other and type it in.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
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
              className="h-11 w-full rounded-[12px] border border-white/10 bg-white/[0.05] pr-3 pl-10 text-[15px] outline-none placeholder:text-ink-muted focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <ul
            role="listbox"
            aria-label="Colleges"
            className="-mx-1 flex max-h-[min(22rem,48dvh)] flex-col overflow-y-auto px-1"
          >
            {rows.map((college) => {
              const selected = chosen?.name === college.name;
              return (
                <li key={college.name} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(college.name);
                      close(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-left outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ring",
                      selected && "bg-white/[0.07]",
                    )}
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10.5px] font-bold tracking-wide">
                      {college.short.length > 4 ? college.short.slice(0, 4) : college.short}
                    </span>
                    <span className="min-w-0 flex-1 text-[14.5px] leading-snug">
                      {college.name}
                    </span>
                    {selected ? (
                      <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-ink" />
                    ) : null}
                  </button>
                </li>
              );
            })}
            {rows.length === 0 ? (
              <li className="px-2.5 py-4 text-[13.5px] text-ink-muted">
                No college matches. Choose Other and type its name.
              </li>
            ) : null}
            <li role="option" aria-selected={other} className="mt-1 border-t border-white/10 pt-1">
              <button
                type="button"
                onClick={() => {
                  onOther();
                  close(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-left outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ring",
                  other && "bg-white/[0.07]",
                )}
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 text-ink-muted">
                  <PencilLineIcon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium">Other</span>
                  <span className="block text-[12.5px] text-ink-muted">
                    My college is not listed
                  </span>
                </span>
                {other ? (
                  <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-ink" />
                ) : null}
              </button>
            </li>
          </ul>
          <p className="text-[12.5px] text-ink-muted">
            {LAUNCH_COLLEGES.length} colleges so far, and more coming soon.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
