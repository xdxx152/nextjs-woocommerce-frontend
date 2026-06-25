import { NextRequest, NextResponse } from 'next/server'
import { createPayPalOrder, PayPalError } from '@/lib/paypal'
import { wooCommerce, WooCommerceError } from '@/lib/woocommerce'

/**
 * POST /api/checkout/paypal/create-order
 *
 * Creates a PayPal order for a WooCommerce order.
 *
 * Request body:
 *   { orderId: number }
 *
 * Response body (success):
 *   { paypalOrderId: string }
 *
 * Key design:
 * - Amount is always fetched from the WooCommerce order (server-side).
 * - No frontend price parameters are trusted.
 * - Idempotency check: reject already-paid orders (processing/completed).
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const { orderId } = await request.json()

    if (!orderId || typeof orderId !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid orderId' },
        { status: 400 }
      )
    }

    // 2. Fetch WooCommerce order
    const order = await wooCommerce.orders.get(orderId)

    // 3. Idempotency check: reject already-paid orders
    if (order.status === 'processing' || order.status === 'completed') {
      return NextResponse.json(
        { error: 'Order already paid' },
        { status: 409 }
      )
    }

    // 4. Create PayPal order using server-side order data
    const result = await createPayPalOrder({
      wcOrderId: orderId,
      total: order.total,
      currency: order.currency || 'USD',
      number: String(order.number || orderId),
    })

    // 5. Return PayPal order ID
    return NextResponse.json({ paypalOrderId: result.id })
  } catch (err) {
    console.error('PayPal create-order error:', err)

    if (err instanceof WooCommerceError) {
      if (err.status === 404) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: `WooCommerce error: ${err.message}` },
        { status: err.status }
      )
    }

    if (err instanceof PayPalError) {
      return NextResponse.json(
        { error: `PayPal error: ${err.message}` },
        { status: err.statusCode || 500 }
      )
    }

    const message =
      err instanceof Error ? err.message : 'Failed to create PayPal order'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
