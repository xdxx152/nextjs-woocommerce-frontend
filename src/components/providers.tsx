'use client';

import { ReactNode } from 'react';
import { CurrencyProvider } from './providers/currency-provider';
import { useMounted } from '@/lib/hooks';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const mounted = useMounted();

  if (!mounted) {
    // Return children without client-side store data to prevent hydration mismatch
    return <>{children}</>;
  }

  return (
    <>
      <CurrencyProvider />
      {children}
    </>
  );
}
