import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleCheckIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "cn";

const bannerVariants = cva(
  "flex items-start gap-3 rounded-card border-2 bg-surface p-4 text-base text-foreground",
  {
    variants: {
      variant: {
        info: "border-primary",
        success: "border-success",
        warning: "border-warning",
        error: "border-destructive",
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
