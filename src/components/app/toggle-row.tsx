"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";

/** A yes or no choice as a row: a title, one line of help, and the switch on the right. The whole row can be tapped. */
export function ToggleRow({
  checked,
  onChange,
  title,
  text,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  text: string;
}) {
  const id = React.useId();
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="block text-[12.5px] leading-snug text-ink-muted">{text}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
