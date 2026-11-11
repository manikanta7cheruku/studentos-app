"use client";

import * as React from "react";
import { GlobeIcon, SchoolIcon } from "lucide-react";
import { cn } from "cn";
import { useSession } from "@/features/session/session-provider";
import { GLOBAL_SLUG } from "@/lib/home-path";

/**
 * "Who can see it": my college only, or Global. Shown only when the person is in both spaces. `value` is the slug
 * the thing is posted to. One tap, two chips.
 */
export function SpacePicker({
  value,
  onChange,
  label = "Who can see it",
}: {
  value: string;
  onChange: (slug: string) => void;
  label?: string;
}) {
  const session = useSession();
  const spaces = session.colleges.filter((item) => item.membership.status === "active");
  if (spaces.length < 2) return null;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[13px] font-semibold text-ink-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {spaces.map((item) => {
          const global = item.college.slug === GLOBAL_SLUG;
          const Icon = global ? GlobeIcon : SchoolIcon;
          const on = value === item.college.slug;
          return (
            <button
              key={item.college.slug}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(item.college.slug)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13.5px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                on
                  ? "bg-brand border-transparent text-white"
                  : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {global ? "Global" : `${item.college.name} only`}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
