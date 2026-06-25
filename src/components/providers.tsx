'use client';

import { ReactNode } from 'react';
import { CurrencyProvider } from './providers/currency-provider';
import { PayPalProvider } from './providers/paypal-provider';
import { useCurrencyStore } from '@/stores/currency-store';
import { useMounted } from '@/lib/hooks';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const mounted = useMounted();
  const currency = useCurrencyStore((s) => s.currency);

  if (!mounted) {
    // Return children without client-side store data to prevent hydration mismatch
    return <>{children}</>;
  }

  return (
    <>
      <CurrencyProvider />
      <PayPalProvider key={currency} currency={currency}>
        {children}
      </PayPalProvider>
    </>
  );
}
