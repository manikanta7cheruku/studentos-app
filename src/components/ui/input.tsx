import * as React from "react";
import { cn } from "cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-[14px] border border-white/10 bg-white/[0.045] px-4 text-[15px] text-foreground transition-[border-color,box-shadow,background-color] duration-200 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-[15px] file:font-medium placeholder:text-ink-muted/60 hover:border-white/20 focus-visible:border-[#7d74e0] focus-visible:bg-white/[0.06] focus-visible:ring-[3px] focus-visible:ring-[#7d74e0]/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
