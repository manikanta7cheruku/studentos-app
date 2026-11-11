import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleCheckIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "cn";

const bannerVariants = cva(
  "glass-card flex items-start gap-3 rounded-[18px] border p-4 text-[14.5px] text-foreground",
  {
    variants: {
      variant: {
        info: "border-primary/60",
        success: "border-success/60",
        warning: "border-warning/60",
        error: "border-destructive/60",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

const icons = {
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  error: OctagonXIcon,
};

const iconColors = {
  info: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
};

type BannerProps = Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof bannerVariants> & {
    title?: string;
  };

function Banner({ className, variant, title, children, ...props }: BannerProps) {
  const kind = variant ?? "info";
  const Icon = icons[kind];

  return (
    <div
      role={kind === "error" || kind === "warning" ? "alert" : "status"}
      data-slot="banner"
      data-variant={kind}
      className={cn(bannerVariants({ variant: kind }), className)}
      {...props}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", iconColors[kind])} />
      <div className="flex flex-col gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

export { Banner, bannerVariants };
