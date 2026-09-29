import { describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "./fetchRetry";

const res = (status: number) => new Response("{}", { status });

describe("fetchWithRetry", () => {
  it("ponawia przejściowy 503 i zwraca późniejszy sukces", async () => {
    const doFetch = vi.fn().mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(200));
    const result = await fetchWithRetry(doFetch, { baseDelayMs: 1 });
    expect(result.status).toBe(200);
    expect(doFetch).toHaveBeenCalledTimes(2);
  });

  it("po wyczerpaniu prób zwraca ostatnią odpowiedź błędu", async () => {
    const doFetch = vi.fn().mockResolvedValue(res(503));
    const result = await fetchWithRetry(doFetch, { retries: 2, baseDelayMs: 1 });
    expect(result.status).toBe(503);
    expect(doFetch).toHaveBeenCalledTimes(3);
  });

  it.each([400, 401, 404, 429])("nie ponawia błędu %i", async (status) => {
    const doFetch = vi.fn().mockResolvedValue(res(status));
    const result = await fetchWithRetry(doFetch, { baseDelayMs: 1 });
    expect(result.status).toBe(status);
    expect(doFetch).toHaveBeenCalledTimes(1);
  });
});
