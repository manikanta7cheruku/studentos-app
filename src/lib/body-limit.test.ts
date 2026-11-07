import { describe, expect, it } from "vitest";
import { readBodyCapped } from "./api";

const stream = (chunks: Uint8Array[], onCancel?: () => void) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
    cancel: onCancel,
  });

const requestWith = (
  body: ReadableStream<Uint8Array> | null,
  headers: Record<string, string> = {},
) =>
  new Request("http://localhost:3000/x", {
    method: "POST",
    body,
    headers,
    // Node needs this for a streamed body.
    ...(body ? { duplex: "half" } : {}),
  } as RequestInit);

describe("readBodyCapped", () => {
  it("returns the bytes of a small body, also when it arrives in pieces", async () => {
    const request = requestWith(stream([new Uint8Array([1, 2]), new Uint8Array([3])]));
    expect([...(await readBodyCapped(request, 10))]).toEqual([1, 2, 3]);
  });

  it("returns an empty array when there is no body", async () => {
    expect((await readBodyCapped(requestWith(null), 10)).byteLength).toBe(0);
  });

  it("refuses at once when Content-Length is over the cap", async () => {
    const request = requestWith(stream([new Uint8Array(1)]), { "content-length": "11" });
    await expect(readBodyCapped(request, 10)).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  });

  it("refuses a streamed body with no Content-Length as soon as it goes over the cap, and stops reading", async () => {
    let cancelled = false;
    const chunks = Array.from({ length: 50 }, () => new Uint8Array(100));
    const request = requestWith(stream(chunks, () => (cancelled = true)));
    await expect(readBodyCapped(request, 1000)).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
    expect(cancelled).toBe(true);
  });

  it("refuses a body whose Content-Length lies (says small, sends big)", async () => {
    const request = requestWith(stream([new Uint8Array(5000)]), { "content-length": "5" });
    await expect(readBodyCapped(request, 1000)).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
  });
});
