// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useLoad } from "@/lib/use-load";

afterEach(cleanup);

describe("useLoad", () => {
  it("goes from loading to ready", async () => {
    const { result } = renderHook(() => useLoad(async () => "hello", []));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data).toBe("hello");
  });

  it("reports an error and can try again", async () => {
    let calls = 0;
    const { result } = renderHook(() =>
      useLoad(async () => {
        calls += 1;
        if (calls === 1) throw new Error("boom");
        return "ok";
      }, []),
    );
    await waitFor(() => expect(result.current.status).toBe("error"));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data).toBe("ok");
  });

  it("loads again when the inputs change, and shows loading in between", async () => {
    const { result, rerender } = renderHook(({ id }) => useLoad(async () => `item ${id}`, [id]), {
      initialProps: { id: 1 },
    });
    await waitFor(() => expect(result.current.data).toBe("item 1"));
    rerender({ id: 2 });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.data).toBe("item 2"));
  });
});
