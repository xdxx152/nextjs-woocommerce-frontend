'use client'

import { OrderStatusPoller } from './order-status-poller'

interface StripePollerWrapperProps {
  orderId: number
}

/**
 * Thin client-side wrapper around OrderStatusPoller.
 * Handles the onStatusChange reload logic that cannot live in a Server Component
 * (functions are not serializable across the Server → Client boundary).
 */
export function StripePollerWrapper({ orderId }: StripePollerWrapperProps) {
  return (
    <OrderStatusPoller
      orderId={orderId}
      onStatusChange={() => {
        window.location.reload()
      }}
    />
  )
}
