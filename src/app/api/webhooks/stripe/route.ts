import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { wooCommerce } from '@/lib/woocommerce'

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

/**
 * POST /api/webhooks/stripe
 *
 * Handles incoming Stripe webhook events and updates WooCommerce orders accordingly.
 *
 * Key design:
 * - Must use request.text() to get the raw body for signature verification.
 * - Must verify the webhook signature to ensure authenticity.
 * - Idempotent: checks order status before updating.
 * - Returns 200 for all events (to prevent Stripe retry storms) unless WC update fails.
 */
export async function POST(request: NextRequest) {
  // 1. Get raw body (must be text, not JSON-parsed)
  const body = await request.text()

  // 2. Get signature
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // 3. Verify signature
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // 4. Event handling
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.payment_status === 'paid') {
          const orderId = parseInt(session.metadata?.order_id || '0')
          if (!orderId) break

          // Idempotency check
          const order = await wooCommerce.orders.get(orderId)
          if (order.status === 'processing' || order.status === 'completed') {
            break
          }

          await wooCommerce.orders.update(orderId, {
            status: 'processing',
            set_paid: true,
            transaction_id: session.payment_intent as string,
            payment_method: 'stripe',
            payment_method_title: 'Credit Card (Stripe)',
          })
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = parseInt(session.metadata?.order_id || '0')

        if (orderId) {
          const order = await wooCommerce.orders.get(orderId)
          if (order.status === 'pending') {
            await wooCommerce.orders.update(orderId, {
              status: 'cancelled',
            })
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const orderId = parseInt(paymentIntent.metadata?.order_id || '0')

        if (orderId) {
          const order = await wooCommerce.orders.get(orderId)
          if (order.status === 'pending') {
            await wooCommerce.orders.update(orderId, {
              status: 'failed',
            })
          }
        }
        break
      }

      default:
        // Unhandled event types are silently ignored
        break
    }
  } catch (err) {
    console.error('Error processing Stripe webhook:', err)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
