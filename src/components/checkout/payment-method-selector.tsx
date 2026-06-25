'use client'

import { cn } from '@/lib/utils'

export type PaymentMethod = 'stripe' | 'paypal' | 'bacs' | 'cod'

interface PaymentMethodSelectorProps {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
  disabled?: boolean
}

const PAYMENT_METHODS: Array<{
  id: PaymentMethod
  icon: string
  name: string
  description: string
}> = [
  {
    id: 'stripe',
    icon: '💳',
    name: 'Credit / Debit Card',
    description: 'Secure card payment via Stripe',
  },
  {
    id: 'paypal',
    icon: '🅿️',
    name: 'PayPal',
    description: 'Pay with your PayPal account',
  },
  {
    id: 'bacs',
    icon: '🏦',
    name: 'Bank Transfer',
    description: 'Pay by bank transfer (US/UK/DE)',
  },
  {
    id: 'cod',
    icon: '💵',
    name: 'Cash on Delivery',
    description: 'Pay when you receive your order',
  },
]

export function PaymentMethodSelector({
  value,
  onChange,
  disabled,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">Payment Method</h3>
      <div className="space-y-2">
        {PAYMENT_METHODS.map((method) => (
          <label
            key={method.id}
            className={cn(
              'flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
              value === method.id
                ? 'border-black bg-gray-50'
                : 'border-gray-200 hover:border-gray-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method.id}
              checked={value === method.id}
              onChange={() => onChange(method.id)}
              disabled={disabled}
              className="sr-only"
            />
            <span className="text-2xl">{method.icon}</span>
            <div className="flex-1">
              <div className="font-medium">{method.name}</div>
              <div className="text-sm text-gray-500">{method.description}</div>
            </div>
            <div
              className={cn(
                'w-4 h-4 rounded-full border-2',
                value === method.id ? 'border-black' : 'border-gray-300'
              )}
            >
              {value === method.id && (
                <div className="w-full h-full rounded-full bg-black scale-50" />
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
