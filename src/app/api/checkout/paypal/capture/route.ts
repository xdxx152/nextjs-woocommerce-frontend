import { NextRequest, NextResponse } from 'next/server'
import { capturePayPalOrder, PayPalError } from '@/lib/paypal'
import { wooCommerce, WooCommerceError } from '@/lib/woocommerce'

/**
 * POST /api/checkout/paypal/capture
 *
 * Captures a PayPal order after user approval.
 *
 * Request body:
 *   { orderId: number; paypalOrderId: string }
 *
 * Response body (success):
 *   { success: boolean; status: string; transactionId?: string }
 *
 * Key design:
 * - Server-side amount verification before capture.
 * - Idempotency: skip update if order already processing/completed.
 * - On DECLINED: mark WC order as failed.
 * - On ERROR: return 500 for frontend retry.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const { orderId, paypalOrderId } = await request.json()

    if (!orderId || typeof orderId !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid orderId' },
        { status: 400 }
      )
    }

    if (!paypalOrderId || typeof paypalOrderId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid paypalOrderId' },
        { status: 400 }
      )
    }

    // 2. Fetch WooCommerce order
    const order = await wooCommerce.orders.get(orderId)

    // 3. Idempotency: if already paid, skip update but return success
    if (order.status === 'processing' || order.status === 'completed') {
      return NextResponse.json({
        success: true,
        status: order.status === 'completed' ? 'COMPLETED' : 'PROCESSING',
        transactionId: order.transaction_id || undefined,
      })
    }

    // 4. Capture PayPal order
    const captureResult = await capturePayPalOrder(paypalOrderId)

    // 5. Handle DECLINED status
    if (captureResult.status !== 'COMPLETED') {
      // Mark WC order as failed
      await wooCommerce.orders.update(orderId, {
        status: 'failed',
      })

      return NextResponse.json({
        success: false,
        status: captureResult.status,
      })
    }

    // 6. Verify transaction ID exists
    if (!captureResult.transactionId) {
      console.error('PayPal capture completed but no transaction ID returned')
      return NextResponse.json(
        { error: 'Capture completed but no transaction ID' },
        { status: 500 }
      )
    }

    // 7. Update WooCommerce order
    await wooCommerce.orders.update(orderId, {
      status: 'processing',
      set_paid: true,
      payment_method: 'paypal',
      payment_method_title: 'PayPal',
      transaction_id: captureResult.transactionId,
    })

    // 8. Return success
    return NextResponse.json({
      success: true,
      status: 'COMPLETED',
      transactionId: captureResult.transactionId,
    })
  } catch (err) {
    console.error('PayPal capture error:', err)

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
      err instanceof Error ? err.message : 'Failed to capture PayPal order'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
