'use client'

import { useState, useEffect, useRef } from 'react'
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js'

/**
 * Checkout form data structure for creating a WooCommerce order.
 * This is passed from the checkout page after form validation.
 */
export interface CheckoutFormData {
  billing: {
    first_name: string
    last_name: string
    address_1: string
    address_2: string
    city: string
    state: string
    postcode: string
    country: string
    email: string
    phone: string
    company: string
  }
  shipping: {
    first_name: string
    last_name: string
    address_1: string
    address_2: string
    city: string
    state: string
    postcode: string
    country: string
    company: string
  }
  line_items: Array<{
    product_id: number
    variation_id: number
    quantity: number
  }>
  customer_note: string
  payment_method: string
  payment_method_title: string
  set_paid: boolean
  currency: string
  create_account?: boolean
  password?: string
}

interface PayPalButtonProps {
  /** Checkout form data — null until the form is validated */
  checkoutData: CheckoutFormData | null
  /** Display amount — used only for disabled-state check; real amount is always server-side */
  amount: string
  /** Currency code (e.g. USD, GBP, EUR) */
  currency: string
  /** Called after successful capture */
  onSuccess: (orderId: number) => void
  /** Called on any error during createOrder or capture */
  onError: (error: unknown) => void
  /** Optional: called after WC order is created, before PayPal order creation */
  onOrderCreated?: (orderId: number) => void
}

/**
 * PayPalButton
 *
 * Renders PayPal Smart Buttons that handle the full PayPal payment flow:
 * 1. createOrder  → POST /api/orders (create WC order)
 *                → POST /api/checkout/paypal/create-order { orderId } (create PayPal order)
 * 2. onApprove    → POST /api/checkout/paypal/capture { orderId, paypalOrderId }
 * 3. onCancel     → show cancellation notice
 *
 * Key design:
 * - WC order creation happens inside createOrder callback (lazy creation).
 * - Amount is NEVER sent from the frontend to PayPal; the server reads order.total from WC.
 * - `amount` prop is only used for the disabled-state check (e.g. amount === "0.00").
 * - Follows the same error handling pattern as the existing Stripe integration.
 * - Uses PayPal official styling with Tailwind wrapper for layout control.
 */
export function PayPalButton({
  checkoutData,
  amount,
  currency,
  onSuccess,
  onError,
  onOrderCreated,
}: PayPalButtonProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sdkLoadFailed, setSdkLoadFailed] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track the WC order ID from createOrder for use in onApprove
  const lastCreatedOrderId = useRef<number | null>(null)

  // SDK 加载超时检测：如果 15 秒内 SDK 未加载完成，显示错误提示
  useEffect(() => {
    if (isPending && !sdkLoadFailed) {
      timeoutRef.current = setTimeout(() => {
        setSdkLoadFailed(true)
      }, 15000) // 15 seconds timeout
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isPending, sdkLoadFailed])

  // 如果 SDK 被拒绝（加载失败），也标记为失败
  useEffect(() => {
    if (isRejected) {
      setSdkLoadFailed(true)
    }
  }, [isRejected])

  // Determine if button should be disabled
  const isDisabled = isPending || isProcessing || !amount || amount === '0.00' || !checkoutData

  /**
   * Create a PayPal order by:
   * 1. First creating a WooCommerce order via POST /api/orders
   * 2. Then creating a PayPal order via POST /api/checkout/paypal/create-order
   *
   * Returns the PayPal order ID to the PayPal SDK.
   */
  const createOrder = async (): Promise<string> => {
    try {
      setError(null)
      setIsProcessing(true)

      // 1. Validate checkout data
      if (!checkoutData) {
        throw new Error('Checkout data is missing. Please fill in the checkout form first.')
      }

      // 2. Create WooCommerce order
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutData),
      })

      const orderData = await orderResponse.json()

      if (!orderResponse.ok) {
        throw new Error(orderData.message || 'Failed to create WooCommerce order')
      }

      const orderId: number = orderData.id

      // 3. Track the WC order ID for use in onApprove
      lastCreatedOrderId.current = orderId

      // 4. Notify parent that WC order was created
      if (onOrderCreated) {
        onOrderCreated(orderId)
      }

      // 5. Create PayPal order using the WC order ID
      const paypalResponse = await fetch('/api/checkout/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })

      const paypalData = await paypalResponse.json()

      if (!paypalResponse.ok) {
        const errorMessage = paypalData.error || 'Failed to create PayPal order'
        throw new Error(errorMessage)
      }

      if (!paypalData.paypalOrderId) {
        throw new Error('No PayPal order ID returned from server')
      }

      return paypalData.paypalOrderId
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create PayPal order'
      setError(message)
      setIsProcessing(false)
      onError(err)
      throw err // Re-throw to let PayPal SDK know the order creation failed
    }
  }

  /**
   * Handle successful PayPal approval.
   * Calls the capture API to finalize the payment and update the WooCommerce order.
   */
  const onApprove = async (data: { orderID: string }): Promise<void> => {
    try {
      const wcOrderId = lastCreatedOrderId.current
      if (!wcOrderId) {
        throw new Error('WooCommerce order ID not found. Please try again.')
      }

      // Use our own API for capture to ensure server-side WooCommerce order update.
      const response = await fetch('/api/checkout/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: wcOrderId,
          paypalOrderId: data.orderID,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result.error || 'Failed to capture PayPal payment'
        throw new Error(errorMessage)
      }

      if (!result.success) {
        const errorMessage =
          result.status === 'DECLINED'
            ? 'Payment was declined. Please try another payment method.'
            : `Payment capture failed with status: ${result.status}`
        throw new Error(errorMessage)
      }

      // Payment successful — notify parent component
      setIsProcessing(false)
      onSuccess(wcOrderId)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to capture PayPal payment'
      setError(message)
      setIsProcessing(false)
      onError(err)
    }
  }

  /**
   * Handle errors from the PayPal SDK itself (network issues, SDK errors, etc.)
   */
  const handlePayPalError = (err: Record<string, unknown>): void => {
    const message =
      err?.message ||
      err?.description ||
      'An error occurred with PayPal. Please try again.'
    setError(typeof message === 'string' ? message : 'PayPal error occurred')
    setIsProcessing(false)
    onError(err)
  }

  /**
   * Handle user cancellation of the PayPal flow.
   */
  const handleCancel = (): void => {
    setIsProcessing(false)
    // User cancelled — show informational message (not an error)
    setError('Payment was cancelled. You can try again when ready.')
  }

  // Show SDK load failure error
  if (sdkLoadFailed) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-lg leading-none">❌</span>
            <div>
              <p className="text-sm font-medium text-red-700">
                PayPal could not be loaded
              </p>
              <p className="mt-1 text-xs text-red-600">
                This may be due to a network issue or an incorrect PayPal Client ID configuration.
                Please try refreshing the page or choose a different payment method.
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setSdkLoadFailed(false)
            setError(null)
          }}
          className="text-sm text-gray-500 hover:underline"
        >
          ← Try again
        </button>
      </div>
    )
  }

  // Show loading state while PayPal SDK is loading
  if (isPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3 text-gray-500">
          <svg
            className="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">Loading PayPal...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Error / Cancel message */}
      {error && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            error.includes('cancelled')
              ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-lg leading-none">
              {error.includes('cancelled') ? '⚠️' : '❌'}
            </span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* PayPal Buttons container */}
      <div className={isDisabled ? 'pointer-events-none opacity-50' : ''}>
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 48,
          }}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={handlePayPalError}
          onCancel={handleCancel}
          disabled={isDisabled}
        />
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Processing payment...</span>
        </div>
      )}

      {/* Currency notice */}
      <p className="text-center text-xs text-gray-400">
        You will pay in {currency || 'USD'}
      </p>
    </div>
  )
}
