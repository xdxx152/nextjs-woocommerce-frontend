import { NextRequest, NextResponse } from 'next/server'
import { getStripe, toStripeAmount, getSiteUrl } from '@/lib/stripe'
import { wooCommerce } from '@/lib/woocommerce'

/**
 * POST /api/checkout/stripe
 *
 * Creates a Stripe Checkout Session for a WooCommerce order.
 *
 * Request body:
 *   { orderId: number }
 *
 * Response body (success):
 *   { sessionId: string; url: string }
 *
 * Key design:
 * - Amount is always fetched from the WooCommerce order (server-side).
 * - No frontend price parameters are trusted.
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
        { status: 400 }
      )
    }

    // 4. Currency validation
    const currency = (order.currency || 'usd').toLowerCase()

    // 5. Build line_items from order data
    const lineItems = order.line_items.map((item) => ({
      price_data: {
        currency,
        product_data: {
          name: item.name,
          ...(item.image?.src && { images: [item.image.src] }),
        },
        unit_amount: toStripeAmount(
          String(parseFloat(item.total) / (item.quantity || 1)),
          currency
        ),
      },
      quantity: item.quantity || 1,
    }))

    // 6. Fallback: if line_items is empty, use order.total as a single item
    const finalLineItems =
      lineItems.length > 0
        ? lineItems
        : [
            {
              price_data: {
                currency,
                product_data: { name: `Order #${order.number || orderId}` },
                unit_amount: toStripeAmount(order.total, currency),
              },
              quantity: 1,
            },
          ]

    // 7. Create Stripe Checkout Session
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: finalLineItems,
      success_url: `${getSiteUrl()}/order-confirmation/${orderId}?payment=stripe&status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getSiteUrl()}/checkout?payment=cancelled&order_id=${orderId}`,
      customer_email: order.billing?.email || undefined,
      metadata: {
        order_id: String(orderId),
        order_key: order.order_key || '',
        order_number: String(order.number || orderId),
      },
    })

    // 8. Return session URL
    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (err) {
    console.error('Stripe Checkout Session creation error:', err)

    const message =
      err instanceof Error ? err.message : 'Failed to create Stripe session'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
