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
  className?: string;
};

/**
 * A table from 768px up. On phones the same rows become a list of cards,
 * each with "Header: value" pairs, so nothing scrolls sideways.
 */
function ResponsiveList<T extends Record<string, unknown>>({
  caption,
  columns,
  rows,
  getRowKey,
  className,
}: ResponsiveListProps<T>) {
  const show = (row: T, column: ResponsiveListColumn<T>) =>
    column.cell ? column.cell(row) : (row[column.key] as React.ReactNode);

  return (
    <div data-slot="responsive-list" className={className}>
      <table className="hidden w-full border-collapse text-left text-base md:table">
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
                  className="px-3 py-3 h-[4.25rem] align-middle first:pl-0 last:pr-0"
                >
                  {show(row, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul aria-label={caption} className={cn("flex flex-col gap-3 md:hidden")}>
        {rows.map((row) => (
          <li key={getRowKey(row)} className="glass-card rounded-[22px] p-4">
            <dl className="flex flex-col gap-2">
              {columns.map((column) => (
                <div key={column.key} className="flex flex-col">
                  <dt className="text-base text-muted-foreground">{column.header}</dt>
                  <dd className="text-base text-foreground">{show(row, column)}</dd>
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
