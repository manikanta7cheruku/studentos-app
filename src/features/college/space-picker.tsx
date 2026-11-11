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
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-semibold text-ink/90">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {spaces.map((item) => {
          const global = item.college.slug === GLOBAL_SLUG;
          const Icon = global ? GlobeIcon : SchoolIcon;
          const on = value === item.college.slug;
          return (
            <button
              key={item.college.slug}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(item.college.slug)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13.5px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                on
                  ? "bg-brand border-transparent text-white"
                  : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {global ? (
                "Public, everyone"
              ) : (
                <span className="max-w-[11rem] truncate">{`${item.college.name} only`}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
