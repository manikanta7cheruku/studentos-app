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
          "h-12 w-full appearance-none rounded-[14px] border border-white/10 bg-white/[0.045] py-2 pr-11 pl-4 text-[15px] text-foreground transition-[border-color,box-shadow,background-color] duration-200 outline-none hover:border-white/20 focus-visible:border-[#7d74e0] focus-visible:ring-[3px] focus-visible:ring-[#7d74e0]/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
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
