"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "cn";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

type FaqAccordionProps = {
  items: FaqItem[];
  className?: string;
};

export function FaqAccordion({ items, className }: FaqAccordionProps) {
  const [openIds, setOpenIds] = React.useState<Record<string, boolean>>({});

  function toggleItem(id: string) {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  return (
    <div className={cn("divide-y divide-border border-y border-border", className)}>
      {items.map((item) => {
        const isOpen = Boolean(openIds[item.id]);
        const triggerId = `faq-trigger-${item.id}`;
        const panelId = `faq-panel-${item.id}`;

        return (
          <div key={item.id} className="py-2">
            <h3>
              <button
                type="button"
                id={triggerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleItem(item.id)}
                className="flex min-h-11 w-full items-center justify-between gap-4 py-2 text-left font-heading text-lg font-semibold text-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span>{item.question}</span>
                <ChevronDownIcon
                  aria-hidden="true"
                  className={cn(
                    "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180 text-primary",
                  )}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className="pb-4 pt-1 text-base text-muted-foreground"
            >
              <p>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
