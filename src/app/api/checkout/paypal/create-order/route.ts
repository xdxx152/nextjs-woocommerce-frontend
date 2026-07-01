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

    // 4. Convert WC line_items to PayPal items format
    const items = order.line_items?.map((item) => ({
      name: item.name,
      description: item.name,
      sku: item.sku || undefined,
      unit_amount: {
        currency_code: (order.currency || 'USD').toUpperCase(),
        value: parseFloat(String(item.price)).toFixed(2),
      },
      tax: {
        currency_code: (order.currency || 'USD').toUpperCase(),
        value: parseFloat(item.total_tax || '0').toFixed(2),
      },
      quantity: String(item.quantity),
      category: 'PHYSICAL_GOODS' as const,
    }))

    // 5. Build shipping address for PayPal (if present in WC order)
    const shipping = order.shipping?.first_name
      ? {
          name: {
            full_name: `${order.shipping.first_name} ${order.shipping.last_name}`.trim(),
          },
          address: {
            address_line_1: order.shipping.address_1 || '',
            address_line_2: order.shipping.address_2 || undefined,
            admin_area_2: order.shipping.city || '',
            admin_area_1: order.shipping.state || '',
            postal_code: order.shipping.postcode || '',
            country_code: order.shipping.country || '',
          },
        }
      : undefined

    // 6. Extract shipping total and tax total
    const shippingAmount = order.shipping_total && parseFloat(order.shipping_total) > 0
      ? order.shipping_total
      : undefined
    const taxAmount = order.total_tax && parseFloat(order.total_tax) > 0
      ? order.total_tax
      : undefined

    // 7. Create PayPal order using server-side order data
    const result = await createPayPalOrder({
      wcOrderId: orderId,
      total: order.total,
      currency: order.currency || 'USD',
      number: String(order.number || orderId),
      items,
      shipping,
      shippingAmount,
      taxAmount,
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
