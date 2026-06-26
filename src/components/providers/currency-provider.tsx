'use client';

import { useEffect } from 'react';
import { useCurrencyStore } from '@/stores/currency-store';
import { getCurrencyFromCookie, detectCurrencyFromIP } from '@/lib/currency';

const RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between retries

/**
 * CurrencyProvider
 *
 * Detects user's currency based on IP geolocation on first visit.
 *
 * Detection strategy (priority order):
 * 1. Cookie set by Edge Proxy (`currency_detected` from x-vercel-ip-country) — fastest, zero cost
 * 2. If user manually selected a currency (`isManuallySet=true`), never override
 * 3. If already successfully detected (`isDetected=true`), skip
 * 4. Client-side fallback via ipinfo.io (50k req/day free) with 5min rate limiting
 */
export function CurrencyProvider() {
  const {
    currency,
    isDetected,
    isManuallySet,
    lastAttemptAt,
    setCurrency,
    markDetected,
    setLastAttempt,
  } = useCurrencyStore();

  useEffect(() => {
    // Priority 1: User manually selected — never override with auto-detection
    if (isManuallySet) return;

    // Priority 2: Read cookie set by Edge Proxy (fastest path, no API call)
    const cookieCurrency = getCurrencyFromCookie();
    if (cookieCurrency) {
      if (cookieCurrency !== currency) {
        setCurrency(cookieCurrency);
      }
      if (!isDetected) {
        markDetected();
      }
      return;
    }

    // Priority 3: Already detected successfully, skip
    if (isDetected) return;

    // Priority 4: Rate limiting — check if we're still in cooling period
    if (lastAttemptAt && Date.now() - lastAttemptAt < RETRY_INTERVAL_MS) {
      return;
    }

    // Priority 5: Client-side fallback via ipinfo.io (50k req/day free)
    const detect = async () => {
      setLastAttempt(Date.now());
      try {
        const detectedCurrency = await detectCurrencyFromIP();

        // Check again if user manually selected while we were fetching
        const currentState = useCurrencyStore.getState();
        if (currentState.isManuallySet) return;

        if (detectedCurrency) {
          // API returned a valid currency (could be USD, EUR, or GBP)
          if (detectedCurrency !== currency) {
            setCurrency(detectedCurrency);
          }
          markDetected();
        }
        // If detectedCurrency is null (API failed), isDetected stays false.
        // The component will re-render when lastAttemptAt updates,
        // but the cooling period will prevent immediate retry.
      } catch {
        // isDetected remains false, will retry after cooling period
      }
    };

    detect();
  }, [isManuallySet, isDetected, lastAttemptAt, currency, setCurrency, markDetected, setLastAttempt]);

  return null; // This provider doesn't render anything
}
