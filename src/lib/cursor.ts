import { AppError } from "./errors";

// A list cursor remembers where the last page ended: the time and the id of its last row.
// The time is kept exactly as the database gave it (microseconds), so no row is skipped or shown twice.
export type PageCursor = { at: string; id: string };

export function encodeCursor(cursor: PageCursor): string {
  return Buffer.from(JSON.stringify([cursor.at, cursor.id]), "utf8").toString("base64url");
}

export function decodeCursor(value: string | undefined): PageCursor | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      typeof parsed[0] === "string" &&
      typeof parsed[1] === "string" &&
      !Number.isNaN(Date.parse(parsed[0])) &&
      /^[0-9a-f-]{1,40}$/i.test(parsed[1])
    ) {
      return { at: parsed[0], id: parsed[1] };
    }
  } catch {
    // fall through to the error
  }
  throw new AppError("VALIDATION_FAILED", {
    details: {
      fields: [
        { path: "cursor", message: "This cursor is not valid. Start again from the first page." },
      ],
    },
  });
}

// Lists ask the database for one row more than the page size. If it comes back there is a next page.
export function paginate<T extends { created_at: string }>(
  rows: T[],
  limit: number,
  idOf: (row: T) => string,
): { page: T[]; nextCursor: string | null } {
  if (rows.length <= limit) return { page: rows, nextCursor: null };
  const page = rows.slice(0, limit);
  const last = page[page.length - 1]!;
  return { page, nextCursor: encodeCursor({ at: last.created_at, id: idOf(last) }) };
}
