import * as React from "react";
import { cn } from "cn";

/** The glass text area: the same look as the text box. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-[14px] px-3.5 py-3 text-[14.5px] leading-relaxed text-foreground placeholder:text-ink-muted/55",
        "border border-white/[0.13] bg-white/[0.065] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-[border-color,box-shadow,background-color] duration-200 outline-none hover:border-white/25 hover:bg-white/[0.085] focus-visible:border-[#8f86f0] focus-visible:bg-white/[0.1] focus-visible:ring-[3px] focus-visible:ring-[#8f86f0]/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
