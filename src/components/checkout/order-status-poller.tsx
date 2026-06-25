'use client'

import { useState, useEffect, useCallback } from 'react'

interface OrderStatusPollerProps {
  orderId: number
  intervalMs?: number
  maxAttempts?: number
  onStatusChange?: (status: string) => void
}

export function OrderStatusPoller({
  orderId,
  intervalMs = 3000,
  maxAttempts = 10,
  onStatusChange,
}: OrderStatusPollerProps) {
  const [attempts, setAttempts] = useState(0)
  const [isPolling, setIsPolling] = useState(true)

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      const data = await response.json()

      if (
        data.order?.status === 'processing' ||
        data.order?.status === 'completed'
      ) {
        setIsPolling(false)
        onStatusChange?.(data.order.status)
        return
      }

      setAttempts((prev) => {
        const next = prev + 1
        if (next >= maxAttempts) {
          setIsPolling(false)
        }
        return next
      })
    } catch (error) {
      console.error('Status poll error:', error)
    }
  }, [orderId, maxAttempts, onStatusChange])

  useEffect(() => {
    if (!isPolling || attempts >= maxAttempts) return

    const timer = setInterval(() => {
      checkStatus()
    }, intervalMs)

    return () => clearInterval(timer)
  }, [isPolling, attempts, intervalMs, checkStatus, maxAttempts])

  if (!isPolling && attempts >= maxAttempts) {
    return (
      <div className="text-sm text-gray-500 mt-2">
        If you have already paid, please check your email for confirmation or
        contact support.
      </div>
    )
  }

  return (
    <div className="text-sm text-gray-500 mt-2">
      Checking payment status... (attempt {attempts + 1}/{maxAttempts})
    </div>
  )
}
