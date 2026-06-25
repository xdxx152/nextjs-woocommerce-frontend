'use client'

import { PayPalScriptProvider } from '@paypal/react-paypal-js'

interface PayPalProviderProps {
  children: React.ReactNode
  currency: string
}

/**
 * PayPalProvider
 *
 * Wraps children with PayPal Script Provider to load the PayPal JS SDK.
 * Uses dynamic currency from the CurrencyProvider to ensure correct currency
 * is passed to PayPal SDK.
 *
 * Key design:
 * - Uses NEXT_PUBLIC_PAYPAL_CLIENT_ID (client-side safe)
 * - Dynamic currency from CurrencyProvider
 * - intent: 'capture' for one-time payments
 * - components: 'buttons' for PayPal Smart Buttons
 */
export function PayPalProvider({ children, currency }: PayPalProviderProps) {
  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        currency,
        intent: 'capture',
        components: 'buttons',
      }}
    >
      {children}
    </PayPalScriptProvider>
  )
}
