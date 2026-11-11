import * as React from "react";
import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-xl border border-white/[0.13] bg-white/[0.04] px-3.5 py-2.5 text-[15px] leading-relaxed text-foreground transition-[border-color,box-shadow,background-color] duration-200 outline-none placeholder:text-ink-muted/70 hover:border-white/25 focus-visible:border-[#8a6bff] focus-visible:bg-white/[0.06] focus-visible:ring-4 focus-visible:ring-[#8a6bff]/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
