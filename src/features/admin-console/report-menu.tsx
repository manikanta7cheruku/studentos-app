"use client";

import * as React from "react";
import { FlagIcon } from "lucide-react";
import { OverflowMenu, type OverflowItem } from "@/components/app/overflow-menu";
import { ReportButton } from "./report-button";

type Target = Parameters<typeof ReportButton>[0]["targetType"];

/**
 * The "..." menu of a page or a comment, with Report in it (and anything extra, like Block). Report opens the same dialog as
 * before, so a person always reports the same way.
 */
export function ReportMenu({
  targetType,
  targetId,
  what,
  extra = [],
  className,
}: {
  targetType: Target;
  targetId: string;
  what: string;
  extra?: OverflowItem[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <OverflowMenu
        className={className}
        items={[
          ...extra,
          {
            label: `Report ${what}`,
            icon: <FlagIcon aria-hidden="true" />,
            danger: true,
            onSelect: () => setOpen(true),
          },
        ]}
      />
      <ReportButton
        targetType={targetType}
        targetId={targetId}
        what={what}
        open={open}
        onOpenChange={setOpen}
        hideTrigger
      />
    </>
  );
}
