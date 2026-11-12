import * as React from "react";
import { cn } from "cn";

/** A glass text box: a faint light on the top edge, a brighter edge when you point at it, and a soft glow when it is open. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[14px] px-3.5 text-[14.5px] text-foreground file:inline-flex file:border-0 file:bg-transparent file:text-[14px] file:font-medium placeholder:text-ink-muted/55",
        "border border-white/[0.13] bg-white/[0.065] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-[border-color,box-shadow,background-color] duration-200 outline-none hover:border-white/25 hover:bg-white/[0.085] focus-visible:border-[#8f86f0] focus-visible:bg-white/[0.1] focus-visible:ring-[3px] focus-visible:ring-[#8f86f0]/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
