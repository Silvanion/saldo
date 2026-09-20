import { useEffect, useState } from "react";
import { FALLBACK_RATES, getCachedRates, getRatesWithFallback } from "../services/currencyService";

// Synchronously available from the first render (cached rates, or hardcoded
// fallback) so calculations never block on the network; refreshes once in the
// background per app session so long-running sessions still get current rates.
export function useExchangeRates(): Record<string, number> {
  const [rates, setRates] = useState<Record<string, number>>(
    () => getCachedRates()?.rates || FALLBACK_RATES
  );

  useEffect(() => {
    let cancelled = false;
    getRatesWithFallback().then((data) => {
      if (!cancelled) setRates(data.rates);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return rates;
}
