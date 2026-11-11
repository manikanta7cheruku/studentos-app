import * as React from "react";
import { cn } from "cn";

/** Small building blocks of the owner screens. Plain server components. */

export function OwnerTitle({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-heading text-[1.7rem] font-extrabold leading-tight tracking-tight">
          {title}
        </h1>
        {text ? <p className="mt-1 max-w-prose text-[14px] text-ink-muted">{text}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note?: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/[0.08] bg-surface p-4">
      <p className="text-[12.5px] font-semibold text-ink-muted">{label}</p>
      <p className="tabular mt-1 font-heading text-[1.9rem] font-extrabold leading-none">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      {note ? <p className="mt-1.5 text-[12px] text-ink-muted">{note}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[20px] border border-white/[0.08] bg-surface p-5", className)}>
      {title ? <h2 className="mb-3 text-[15px] font-bold">{title}</h2> : null}
      {children}
    </section>
  );
}

const PILL: Record<string, string> = {
  active: "bg-success/15 text-success",
  used: "bg-white/[0.08] text-ink-muted",
  expired: "bg-white/[0.08] text-ink-muted",
  suspended: "bg-danger/15 text-danger",
  draft: "bg-warning/15 text-warning",
  archived: "bg-white/[0.08] text-ink-muted",
};

export function Pill({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold capitalize",
        PILL[value] ?? "bg-white/[0.08] text-ink-muted",
      )}
    >
      {value}
    </span>
  );
}

/** A table that scrolls sideways inside its own box on a phone. */
export function Table({
  head,
  children,
  empty,
}: {
  head: string[];
  children: React.ReactNode;
  empty?: string;
}) {
  const rows = React.Children.count(children);
  if (rows === 0) {
    return (
      <p className="rounded-[18px] border border-white/10 bg-white/[0.03] p-6 text-center text-[14px] text-ink-muted">
        {empty ?? "Nothing here yet."}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-[18px] border border-white/[0.08] bg-surface">
      <table className="w-full min-w-[40rem] border-collapse text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-white/[0.08] text-[12px] uppercase tracking-[0.06em] text-ink-muted">
            {head.map((label) => (
              <th key={label} scope="col" className="px-4 py-3 font-semibold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_tr]:border-b [&_tr]:border-white/[0.06] [&_tr:last-child]:border-b-0">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function when(iso: string | null): string {
  if (!iso) return "never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}
