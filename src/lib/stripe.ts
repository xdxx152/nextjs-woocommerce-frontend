import Stripe from 'stripe'

/**
 * 惰性初始化 Stripe 实例（惰性单例模式）
 *
 * 避免在构建时（npm run build）因 STRIPE_SECRET_KEY 未设置而崩溃。
 * 仅当 API 路由首次调用时才会实例化 Stripe SDK。
 *
 * @throws {Error} 当 STRIPE_SECRET_KEY 环境变量未设置时抛出
 */
let _stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not configured. ' +
        'Set it in .env.local for development or in Vercel Dashboard for production.'
      )
    }
    _stripeInstance = new Stripe(secretKey, {
      typescript: true,
    })
  }
  return _stripeInstance
}

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
