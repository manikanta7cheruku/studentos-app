import * as React from "react";
import { cn } from "cn";

type EmptyStateProps = Omit<React.ComponentProps<"div">, "title"> & {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

function EmptyState({ className, icon, title, description, action, ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-start gap-3 rounded-card border border-dashed border-border-strong bg-surface p-6",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div aria-hidden="true" className="text-muted-foreground [&_svg]:size-8">
          {icon}
        </div>
      ) : null}
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      {description ? <p className="max-w-prose text-muted-foreground">{description}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
