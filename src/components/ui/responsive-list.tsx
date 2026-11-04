import * as React from "react";
import { cn } from "cn";

type ResponsiveListColumn<T> = {
  key: string;
  header: string;
  /** How to show the value. Defaults to row[key]. */
  cell?: (row: T) => React.ReactNode;
};

type ResponsiveListProps<T> = {
  /** Describes the data. Read by screen readers, hidden on screen. */
  caption: string;
  columns: ResponsiveListColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Breakpoint where table view takes over from cards. Defaults to "md". Use "lg" when space is constrained (e.g. sidebars). */
  breakpoint?: "md" | "lg";
  className?: string;
};

/**
 * A table on larger screens. On smaller screens the same rows become a list of cards,
 * each with "Header: value" pairs, so nothing scrolls sideways.
 */
function ResponsiveList<T extends Record<string, unknown>>({
  caption,
  columns,
  rows,
  getRowKey,
  breakpoint = "md",
  className,
}: ResponsiveListProps<T>) {
  const show = (row: T, column: ResponsiveListColumn<T>) =>
    column.cell ? column.cell(row) : (row[column.key] as React.ReactNode);

  const tableBreakpointClass = breakpoint === "lg" ? "lg:table" : "md:table";
  const listBreakpointClass = breakpoint === "lg" ? "lg:hidden" : "md:hidden";

  return (
    <div data-slot="responsive-list" className={cn("w-full min-w-0", className)}>
      <div className="w-full min-w-0 overflow-x-auto">
        <table className={cn("hidden w-full border-collapse text-left text-base", tableBreakpointClass)}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b-2 border-border-strong">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-3 py-3 font-semibold first:pl-0 last:pr-0"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="border-b border-border">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-3 py-3 h-[4.25rem] align-middle first:pl-0 last:pr-0 break-words min-w-0"
                  >
                    {show(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label={caption} className={cn("flex flex-col gap-3 min-w-0", listBreakpointClass)}>
        {rows.map((row) => (
          <li key={getRowKey(row)} className="rounded-card border border-border bg-surface p-4 min-w-0">
            <dl className="flex flex-col gap-2 min-w-0">
              {columns.map((column) => (
                <div key={column.key} className="flex flex-col min-w-0">
                  <dt className="text-base text-muted-foreground">{column.header}</dt>
                  <dd className="text-base text-foreground break-words min-w-0">{show(row, column)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { ResponsiveList };
export type { ResponsiveListColumn };
