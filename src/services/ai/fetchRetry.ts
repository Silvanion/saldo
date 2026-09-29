// Dostawcy chmurowi (Gemini 503 "high demand", Anthropic 529 "overloaded") zwracają
// przejściowe błędy, które zwykle znikają po chwili. Ponawiamy tylko je — błędy klucza,
// limitów czy nieistniejącego modelu nie mają sensu w powtórce.
const TRANSIENT_STATUSES = new Set([500, 502, 503, 504, 529]);

export function isTransientStatus(status: number): boolean {
  return TRANSIENT_STATUSES.has(status);
}

export async function fetchWithRetry(
  doFetch: () => Promise<Response>,
  { retries = 2, baseDelayMs = 800 }: { retries?: number; baseDelayMs?: number } = {}
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await doFetch();
    if (response.ok || !isTransientStatus(response.status) || attempt >= retries) return response;
    await response.body?.cancel().catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
  }
}
