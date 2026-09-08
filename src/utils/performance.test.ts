import { describe, it, expect, vi } from "vitest";
import { measurePerformance, measureAsyncPerformance } from "./performance";

describe("performance utilities", () => {
  it("executes synchronous function and returns result", () => {
    const fn = vi.fn(() => 42);
    const result = measurePerformance("test-sync", fn);
    expect(result).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("executes asynchronous function and resolves result", async () => {
    const fn = vi.fn(async () => "resolved");
    const result = await measureAsyncPerformance("test-async", fn);
    expect(result).toBe("resolved");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
