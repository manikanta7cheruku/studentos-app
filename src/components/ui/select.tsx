import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "cn";

/**
 * A styled native select. Native keeps the phone picker, the keyboard and
 * screen readers working with no extra code. Put it inside FormField.
 */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "h-11 w-full appearance-none rounded-[14px] py-2 pr-11 pl-3.5 text-[14.5px] text-foreground border border-white/[0.13] bg-white/[0.065] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-[border-color,box-shadow,background-color] duration-200 outline-none hover:border-white/25 hover:bg-white/[0.085] focus-visible:border-[#8f86f0] focus-visible:bg-white/[0.1] focus-visible:ring-[3px] focus-visible:ring-[#8f86f0]/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { Select };
