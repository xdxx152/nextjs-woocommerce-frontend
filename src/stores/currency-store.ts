import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SupportedCurrency } from '@/lib/currency';
import { DEFAULT_CURRENCY } from '@/lib/currency';

interface CurrencyState {
  /** Currently active currency code */
  currency: SupportedCurrency;
  /** Whether the currency has been auto-detected from IP */
  isDetected: boolean;
}

interface CurrencyActions {
  /** Set the active currency */
  setCurrency: (currency: SupportedCurrency) => void;
  /** Mark that geo-detection has run (even if it fell back to default) */
  markDetected: () => void;
  /** Reset to default currency */
  resetCurrency: () => void;
}

type CurrencyStore = CurrencyState & CurrencyActions;

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      currency: DEFAULT_CURRENCY,
      isDetected: false,

      setCurrency: (currency) => set({ currency }),
      markDetected: () => set({ isDetected: true }),
      resetCurrency: () => set({ currency: DEFAULT_CURRENCY, isDetected: false }),
    }),
    {
      name: 'currency-storage',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currency: state.currency,
        isDetected: state.isDetected,
      }),
    }
  )
);

// Selector hooks
export const useCurrency = () => useCurrencyStore((state) => state.currency);
export const useIsCurrencyDetected = () => useCurrencyStore((state) => state.isDetected);
export const useSetCurrency = () => useCurrencyStore((state) => state.setCurrency);
