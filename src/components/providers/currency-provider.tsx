'use client';

import { useEffect } from 'react';
import { useCurrencyStore } from '@/stores/currency-store';
import { detectCurrencyFromIP } from '@/lib/currency';

/**
 * CurrencyProvider
 *
 * Detects user's currency based on IP geolocation on first visit.
 * Uses a dedicated Zustand store (`currency-store`) to persist
 * the detected currency across the session.
 *
 * Detection strategy:
 * 1. First check: If `isDetected` is already true, skip detection (already ran this session)
 * 2. Second check: Try client-side IP API (ipapi.co) as fallback
 * 3. Server-side: The `cf-ipcountry` header from Cloudflare can be used in middleware
 */
export function CurrencyProvider() {
  const { isDetected, setCurrency, markDetected } = useCurrencyStore();

  useEffect(() => {
    // Skip if we already detected currency in this session
    if (isDetected) return;

    const detect = async () => {
      try {
        const detectedCurrency = await detectCurrencyFromIP();
        if (detectedCurrency) {
          setCurrency(detectedCurrency);
        }
      } catch (error) {
        console.warn('Currency detection failed:', error);
      } finally {
        // Mark as detected even on failure to avoid repeated attempts
        markDetected();
      }
    };

    detect();
  }, [isDetected, setCurrency, markDetected]);

  return null; // This provider doesn't render anything
}
