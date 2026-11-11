import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-[14px] font-semibold whitespace-nowrap outline-none select-none transition-[transform,filter,background-color,border-color,box-shadow,opacity] duration-200 ease-[var(--ease)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default:
          "bg-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_6px_14px_-8px_rgba(0,0,0,0.7)] hover:brightness-[1.12] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_20px_-10px_rgba(0,0,0,0.75)] motion-safe:hover:-translate-y-px",
        outline:
          "border-white/15 bg-white/[0.04] text-foreground hover:border-white/25 hover:bg-white/10 aria-expanded:bg-white/10",
        secondary:
          "bg-white/[0.07] text-foreground hover:bg-white/[0.13] aria-expanded:bg-white/[0.13]",
        ghost: "text-foreground hover:bg-white/[0.08] aria-expanded:bg-white/[0.08]",
        destructive:
          "border-danger/30 bg-danger/15 text-danger hover:border-danger/50 hover:bg-danger/25",
        link: "text-primary underline underline-offset-4 hover:no-underline",
      },
      size: {
        default: "h-11 gap-2 px-5",
        xs: "h-9 gap-1.5 px-3 text-[13px]",
        sm: "h-10 gap-2 px-4",
        lg: "h-12 gap-2 px-7 text-[15px]",
        icon: "size-11",
        "icon-xs": "size-9",
        "icon-sm": "size-10",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
