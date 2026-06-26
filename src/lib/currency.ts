import type { WCProduct, WCProductVariation } from '@/types/woocommerce';

// ============================================
// Supported currencies configuration
// ============================================

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  locale: string;
}

export const CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB' },
};

export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

// ============================================
// Country → Currency mapping
// ============================================

// EU countries that use EUR (ISO 3166-1 alpha-2 codes)
const EUR_COUNTRIES = new Set([
  'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES',
  // Non-EU but use EUR
  'AD', 'MC', 'SM', 'VA', 'XK',
]);

// GBP countries
const GBP_COUNTRIES = new Set(['GB', 'GG', 'IM', 'JE']);

/**
 * Map a country code to a supported currency
 */
export function countryToCurrency(countryCode: string): SupportedCurrency {
  const code = countryCode.toUpperCase();

  if (GBP_COUNTRIES.has(code)) return 'GBP';
  if (EUR_COUNTRIES.has(code)) return 'EUR';
  return 'USD';
}

// ============================================
// Shared constants for cookie-based detection
// ============================================

/** Cookie name used by middleware to pass detected currency to client */
export const COOKIE_NAME = 'currency_detected';

/** Valid currency codes (used for cookie value validation) */
export const VALID_CURRENCIES: SupportedCurrency[] = ['USD', 'EUR', 'GBP'];

// ============================================
// GeoIP detection — server-side (Middleware)
// ============================================

/**
 * Detect currency from Vercel Edge Network or Cloudflare headers.
 *
 * Priority:
 * 1. x-vercel-ip-country — injected by Vercel Edge (production, preview)
 * 2. cf-ipcountry — injected by Cloudflare CDN
 *
 * Returns the detected currency or null if neither header is available.
 */
export function detectCurrencyFromVercelHeaders(
  headers: Headers
): SupportedCurrency | null {
  const country =
    headers.get('x-vercel-ip-country') ||
    headers.get('cf-ipcountry');

  if (country && country !== 'XX' && country !== '??') {
    return countryToCurrency(country);
  }

  return null;
}

/**
 * @deprecated Use detectCurrencyFromVercelHeaders() instead,
 * which supports both x-vercel-ip-country and cf-ipcountry headers.
 */
export function detectCountryFromHeaders(
  headers: Headers
): SupportedCurrency | null {
  return detectCurrencyFromVercelHeaders(headers);
}

// ============================================
// GeoIP detection — client-side fallback
// ============================================

/**
 * Read the currency cookie set by Edge Proxy (Middleware).
 * This is the client-side counterpart to proxy.ts, used by CurrencyProvider.
 *
 * Returns null if:
 * - Called server-side (typeof document === 'undefined')
 * - Cookie doesn't exist
 * - Cookie value is not a valid supported currency
 */
export function getCurrencyFromCookie(): SupportedCurrency | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  if (match) {
    const currency = match[1] as SupportedCurrency;
    if (VALID_CURRENCIES.includes(currency)) {
      return currency;
    }
  }
  return null;
}

/**
 * Detect user country from a free client-side IP API.
 *
 * Uses ipinfo.io (free tier: 50,000 requests/day, no API key required)
 * as a client-side fallback when server-side detection (Middleware) didn't
 * set a currency cookie.
 */
export async function detectCurrencyFromIP(): Promise<SupportedCurrency | null> {
  try {
    const response = await fetch('https://ipinfo.io/json/', {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (!response.ok) return null;

    const data = await response.json();
    const currency = countryToCurrency(data.country || '');
    return currency;
  } catch {
    // Return null on failure so caller can distinguish
    // "successfully detected USD" from "API call failed"
    return null;
  }
}

// ============================================
// Price resolution helpers
// ============================================

export interface ResolvedPrice {
  price: string;
  regularPrice: string;
  salePrice: string;
  onSale: boolean;
  currency: SupportedCurrency;
  currencyConfig: CurrencyConfig;
}

/**
 * Resolve the correct price for a product based on the current currency.
 *
 * Falls back to the default (base) currency price if:
 * - The product has no `multi_currency_prices`
 * - The requested currency is not in the multi-currency map
 * - The price in the map is null or empty
 */
export function resolveProductPrice(
  product: WCProduct,
  currency: SupportedCurrency = DEFAULT_CURRENCY
): ResolvedPrice {
  const currencyConfig = CURRENCIES[currency];

  // If currency is USD (base), use the product's default prices
  if (currency === DEFAULT_CURRENCY) {
    return {
      price: product.price,
      regularPrice: product.regular_price,
      salePrice: product.sale_price,
      onSale: product.on_sale,
      currency,
      currencyConfig,
    };
  }

  // Try to get multi-currency price
  const mcPrices = product.multi_currency_prices;
  if (mcPrices && mcPrices[currency]) {
    const targetPrice = mcPrices[currency];
    const hasPrice = targetPrice.price && targetPrice.price !== '';
    
    if (hasPrice) {
      const hasRegPrice = targetPrice.regular_price && targetPrice.regular_price !== '';
      const hasSalePrice = targetPrice.sale_price && targetPrice.sale_price !== '';

      // Determine if on sale: sale_price exists and is different from regular_price
      const onSale = hasSalePrice &&
                     hasRegPrice &&
                     targetPrice.sale_price !== targetPrice.regular_price;
      
      return {
        price: targetPrice.price!,
        regularPrice: hasRegPrice ? targetPrice.regular_price! : targetPrice.price!,
        salePrice: hasSalePrice ? targetPrice.sale_price! : '',
        onSale: !!onSale,
        currency,
        currencyConfig,
      };
    }
  }

  // Fallback to base currency (USD)
  return {
    price: product.price,
    regularPrice: product.regular_price,
    salePrice: product.sale_price,
    onSale: product.on_sale,
    currency: DEFAULT_CURRENCY,
    currencyConfig: CURRENCIES[DEFAULT_CURRENCY],
  };
}

/**
 * Resolve the correct price for a product variation based on the current currency.
 */
export function resolveVariationPrice(
  variation: WCProductVariation,
  currency: SupportedCurrency = DEFAULT_CURRENCY
): ResolvedPrice {
  const currencyConfig = CURRENCIES[currency];

  // If currency is USD (base), use the variation's default prices
  if (currency === DEFAULT_CURRENCY) {
    return {
      price: variation.price,
      regularPrice: variation.regular_price,
      salePrice: variation.sale_price,
      onSale: variation.on_sale,
      currency,
      currencyConfig,
    };
  }

  // Try to get multi-currency price
  const mcPrices = variation.multi_currency_prices;
  if (mcPrices && mcPrices[currency]) {
    const targetPrice = mcPrices[currency];
    const hasPrice = targetPrice.price && targetPrice.price !== '';
    const hasRegPrice = targetPrice.regular_price && targetPrice.regular_price !== '';
    const hasSalePrice = targetPrice.sale_price && targetPrice.sale_price !== '';

    if (hasPrice) {
      // Determine if on sale: sale_price exists and is different from regular_price
      const onSale = hasSalePrice &&
                     hasRegPrice &&
                     targetPrice.sale_price !== targetPrice.regular_price;
      
      return {
        price: targetPrice.price!,
        regularPrice: hasRegPrice ? targetPrice.regular_price! : targetPrice.price!,
        salePrice: hasSalePrice ? targetPrice.sale_price! : '',
        onSale: !!onSale,
        currency,
        currencyConfig,
      };
    }
  }

  // Fallback to base currency (USD)
  return {
    price: variation.price,
    regularPrice: variation.regular_price,
    salePrice: variation.sale_price,
    onSale: variation.on_sale,
    currency: DEFAULT_CURRENCY,
    currencyConfig: CURRENCIES[DEFAULT_CURRENCY],
  };
}

// ============================================
// Currency display helpers
// ============================================

/**
 * Get the display symbol for a currency
 */
export function getCurrencySymbol(currency: SupportedCurrency): string {
  return CURRENCIES[currency]?.symbol || '$';
}

/**
 * Get the Intl locale for a currency
 */
export function getCurrencyLocale(currency: SupportedCurrency): string {
  return CURRENCIES[currency]?.locale || 'en-US';
}
