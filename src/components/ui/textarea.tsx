import * as React from "react";
import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-[12px] border border-white/10 bg-white/[0.045] px-3.5 py-2.5 text-[14.5px] leading-relaxed text-foreground transition-[border-color,box-shadow,background-color] duration-200 outline-none placeholder:text-ink-muted/60 hover:border-white/20 focus-visible:border-[#7d74e0] focus-visible:bg-white/[0.06] focus-visible:ring-[3px] focus-visible:ring-[#7d74e0]/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
