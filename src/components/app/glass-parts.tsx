import * as React from "react";
import { cn } from "cn";

/** A small square of frosted glass that holds an icon: the same tile on every card, form and fact. */
export function GlassTile({
  children,
  size = "md",
  className,
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-white/[0.14] bg-white/[0.07] text-ink/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
        size === "sm" && "size-9 rounded-[11px] [&_svg]:size-[1.05rem]",
        size === "md" && "size-11 rounded-[14px] [&_svg]:size-5",
        size === "lg" && "size-12 rounded-[15px] [&_svg]:size-6",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A glass card that groups a few related fields under one quiet label. */
export function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("glass-card flex flex-col gap-4 rounded-[22px] p-4", className)}>
      <h2 className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** One fact on a detail screen: a glass icon tile, a small label and the value. */
export function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <GlassTile size="sm">{icon}</GlassTile>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
        <div className="text-[14.5px] font-medium leading-snug">{children}</div>
      </div>
    </div>
  );
}

/** A filter chip on glass: neutral when off, a lit glass pill when on. */
export function GlassChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-[12.5px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
        pressed
          ? "border-white/25 bg-white/[0.14] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** The small uppercase label above a title or a group. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn("text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted", className)}
    >
      {children}
    </p>
  );
}

/** The label on a card that says what a thing is, or where I stand: lit when it is good news. */
export function GlassPill({
  tone = "quiet",
  children,
  className,
}: {
  tone?: "good" | "quiet" | "warn";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-3 text-[12px] font-semibold",
        tone === "good" && "border-[#8f86f0]/40 bg-[#8f86f0]/[0.16] text-[#dcd8ff]",
        tone === "quiet" && "border-white/[0.12] bg-white/[0.06] text-ink/80",
        tone === "warn" && "border-white/[0.12] bg-white/[0.04] text-ink-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
