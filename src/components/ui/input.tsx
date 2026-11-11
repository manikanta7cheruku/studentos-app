import * as React from "react";
import { cn } from "cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-white/[0.13] bg-white/[0.04] px-3.5 py-2 text-[15px] text-foreground transition-[border-color,box-shadow,background-color] duration-200 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-[15px] file:font-medium placeholder:text-ink-muted/70 hover:border-white/25 focus-visible:border-[#8a6bff] focus-visible:bg-white/[0.06] focus-visible:ring-4 focus-visible:ring-[#8a6bff]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
