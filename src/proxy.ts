import { NextRequest, NextResponse } from 'next/server';
import { countryToCurrency, COOKIE_NAME, VALID_CURRENCIES } from '@/lib/currency';

/**
 * Edge Proxy for Vercel IP-based currency detection.
 *
 * Reads the `x-vercel-ip-country` header (automatically injected by Vercel)
 * and writes a `currency_detected` cookie so client components can read it
 * without any additional API calls.
 *
 * Falls back to `cf-ipcountry` header for Cloudflare-based deployments.
 *
 * The proxy runs on every page request but skips:
 * - Static assets (_next/static, _next/image)
 * - API routes (where IP detection is not needed)
 * - favicon.ico
 *
 * User manual override: if the user has previously selected a currency via
 * the CurrencySelector component, the `currency_manual` cookie is set.
 * This proxy respects that and skips automatic detection.
 */
export function proxy(request: NextRequest) {
  // --- Respect manual override: user selected currency via UI ---
  if (request.cookies.get('currency_manual')?.value === 'true') {
    return NextResponse.next();
  }

  // --- Skip if valid cookie already exists ---
  const existingCookie = request.cookies.get(COOKIE_NAME)?.value;
  if (existingCookie && (VALID_CURRENCIES as readonly string[]).includes(existingCookie)) {
    return NextResponse.next();
  }

  // --- Detect country from request headers ---
  const countryCode =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry');

  if (countryCode && countryCode !== 'XX' && countryCode !== '??') {
    const currency = countryToCurrency(countryCode);

    const response = NextResponse.next();

    // Set cookie (non-httpOnly so JS can read it, 24h expiry)
    response.cookies.set(COOKIE_NAME, currency, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    // Also set response header so Server Components can read via headers()
    response.headers.set('x-detected-currency', currency);

    return response;
  }

  return NextResponse.next();
}

/**
 * Proxy matcher config — only run on page requests,
 * skip static assets, API routes, and Next.js internals.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - api/ (API routes)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|api/).*)',
  ],
};
