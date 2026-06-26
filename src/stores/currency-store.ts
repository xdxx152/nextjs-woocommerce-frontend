import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SupportedCurrency } from '@/lib/currency';
import { DEFAULT_CURRENCY } from '@/lib/currency';

interface CurrencyState {
  /** Currently active currency code */
  currency: SupportedCurrency;
  /** Whether auto-detection has completed successfully */
  isDetected: boolean;
  /** Whether user manually selected a currency (vs auto-detected) */
  isManuallySet: boolean;
  /** Timestamp of last detection attempt, for retry rate-limiting */
  lastAttemptAt: number | null;
}

interface CurrencyActions {
  /** Set the active currency (auto-detected, does NOT set isManuallySet) */
  setCurrency: (currency: SupportedCurrency) => void;
  /** Set currency and mark as user's manual choice (won't be overridden) */
  setCurrencyManually: (currency: SupportedCurrency) => void;
  /** Mark that geo-detection has completed successfully */
  markDetected: () => void;
  /** Record the timestamp of a detection attempt */
  setLastAttempt: (timestamp: number) => void;
  /** Reset to default currency */
  resetCurrency: () => void;
}

type CurrencyStore = CurrencyState & CurrencyActions;

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      currency: DEFAULT_CURRENCY,
      isDetected: false,
      isManuallySet: false,
      lastAttemptAt: null,

      setCurrency: (currency) => set({ currency }),
      setCurrencyManually: (currency) => set({
        currency,
        isManuallySet: true,
        isDetected: true, // manual selection also counts as "detected"
      }),
      markDetected: () => set({ isDetected: true }),
      setLastAttempt: (timestamp) => set({ lastAttemptAt: timestamp }),
      resetCurrency: () => set({
        currency: DEFAULT_CURRENCY,
        isDetected: false,
        isManuallySet: false,
        lastAttemptAt: null,
      }),
    }),
    {
      name: 'currency-storage',
      version: 2, // bumped to clear old cached state with isDetected=true
      storage: createJSONStorage(() => localStorage),
      // Only persist currency + isManuallySet.
      // isDetected is NOT persisted so refreshes re-try detection.
      partialize: (state) => ({
        currency: state.currency,
        isManuallySet: state.isManuallySet,
      }),
      // On rehydrate after version bump, reset isManuallySet to false
      // to ensure fresh detection on first visit after upgrade
      migrate: (persisted: unknown) => {
        const old = persisted as Partial<CurrencyState>;
        return {
          currency: old.currency ?? DEFAULT_CURRENCY,
          isDetected: false,
          isManuallySet: old.isManuallySet ?? false,
          lastAttemptAt: null,
        } as CurrencyStore;
      },
    }
  )
);

// Selector hooks
export const useCurrency = () => useCurrencyStore((state) => state.currency);
export const useIsCurrencyDetected = () => useCurrencyStore((state) => state.isDetected);
export const useIsCurrencyManuallySet = () => useCurrencyStore((state) => state.isManuallySet);
export const useLastAttemptAt = () => useCurrencyStore((state) => state.lastAttemptAt);
export const useSetCurrency = () => useCurrencyStore((state) => state.setCurrency);
export const useSetCurrencyManually = () => useCurrencyStore((state) => state.setCurrencyManually);
