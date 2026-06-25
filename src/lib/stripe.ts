import Stripe from 'stripe'

// Stripe 客户端单例（仅服务端使用）
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

// Stripe 支持的货币列表（零小数位货币需要特殊处理）
export const STRIPE_ZERO_DECIMAL_CURRENCIES = [
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]

/**
 * Helper: Convert amount string to Stripe's smallest currency unit (cents)
 * @param amount - Amount string, e.g. "29.99"
 * @param currency - ISO 4217 currency code, e.g. "EUR"
 * @returns Stripe smallest currency unit amount (integer)
 */
export function toStripeAmount(amount: string, currency: string): number {
  const num = parseFloat(amount)
  if (STRIPE_ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())) {
    return Math.round(num)
  }
  return Math.round(num * 100)
}

/**
 * Helper: Get current site URL
 * Used for building success_url / cancel_url
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}
