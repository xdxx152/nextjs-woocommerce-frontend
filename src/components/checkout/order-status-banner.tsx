'use client'

import { cn } from '@/lib/utils'

interface OrderStatusBannerProps {
  status: string
  isPaid: boolean
  paymentMethod?: string
}

export function OrderStatusBanner({
  status,
  isPaid,
  paymentMethod,
}: OrderStatusBannerProps) {
  const config = (() => {
    if (isPaid) {
      return {
        icon: '✓',
        message: 'Thank you! Payment received.',
        className: 'bg-green-50 border-green-200 text-green-800',
      }
    }

    switch (status) {
      case 'pending':
        return {
          icon: '⏳',
          message:
            paymentMethod === 'stripe'
              ? 'Payment confirmation in progress...'
              : 'Awaiting payment confirmation.',
          className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        }
      case 'on-hold':
        return {
          icon: '⏸',
          message:
            "Awaiting your bank transfer. We'll process once payment is received.",
          className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        }
      case 'failed':
        return {
          icon: '✗',
          message: 'Payment failed. Please retry.',
          className: 'bg-red-50 border-red-200 text-red-800',
        }
      case 'cancelled':
        return {
          icon: '⊘',
          message: 'Order cancelled.',
          className: 'bg-gray-50 border-gray-200 text-gray-800',
        }
      default:
        return {
          icon: '⏳',
          message: 'Order status: ' + status,
          className: 'bg-blue-50 border-blue-200 text-blue-800',
        }
    }
  })()

  return (
    <div className={cn('p-4 rounded-lg border', config.className)}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{config.icon}</span>
        <span className="font-medium">{config.message}</span>
      </div>
    </div>
  )
}
