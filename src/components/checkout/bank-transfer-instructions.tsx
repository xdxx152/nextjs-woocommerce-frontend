'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils'
import { getBACSAccountByCurrency } from '@/lib/bacs-accounts'

interface BankTransferInstructionsProps {
  order: {
    id: number
    number: string
    total: string
    currency: string
  }
  className?: string
}

export function BankTransferInstructions({
  order,
  className,
}: BankTransferInstructionsProps) {
  const [copied, setCopied] = useState(false)
  const account = getBACSAccountByCurrency(order.currency)

  if (!account) {
    return (
      <div className={cn('rounded-lg border p-6 bg-gray-50', className)}>
        <p className="text-sm text-gray-600">
          Bank account information unavailable. Please contact support.
        </p>
      </div>
    )
  }

  const handleCopy = async () => {
    const text = [
      `Account Name: ${account.accountName}`,
      `Bank: ${account.bankName}`,
      account.accountNumber && `Account Number: ${account.accountNumber}`,
      account.sortCode && `Sort Code: ${account.sortCode}`,
      account.routingNumber && `Routing Number: ${account.routingNumber}`,
      account.iban && `IBAN: ${account.iban}`,
      account.swift && `SWIFT/BIC: ${account.swift}`,
      `Amount: ${formatPrice(order.total, order.currency)}`,
      `Reference: #${order.number}`,
    ]
      .filter(Boolean)
      .join('\n')

    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('rounded-lg border p-6 bg-blue-50 border-blue-200', className)}>
      <h3 className="font-semibold text-lg text-blue-900">
        Bank Transfer Instructions
      </h3>

      {/* Order Info */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Order Number</p>
          <p className="font-medium">#{order.number}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Amount Due</p>
          <p className="font-medium text-lg">
            {formatPrice(order.total, order.currency)}
          </p>
        </div>
      </div>

      {/* Bank Account Details */}
      <div className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Account Name</span>
          <span className="font-medium">{account.accountName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Bank Name</span>
          <span className="font-medium">{account.bankName}</span>
        </div>
        {account.accountNumber && (
          <div className="flex justify-between">
            <span className="text-gray-600">Account Number</span>
            <span className="font-medium font-mono">{account.accountNumber}</span>
          </div>
        )}
        {account.sortCode && (
          <div className="flex justify-between">
            <span className="text-gray-600">Sort Code</span>
            <span className="font-medium font-mono">{account.sortCode}</span>
          </div>
        )}
        {account.routingNumber && (
          <div className="flex justify-between">
            <span className="text-gray-600">Routing Number</span>
            <span className="font-medium font-mono">{account.routingNumber}</span>
          </div>
        )}
        {account.iban && (
          <div className="flex justify-between">
            <span className="text-gray-600">IBAN</span>
            <span className="font-medium font-mono">{account.iban}</span>
          </div>
        )}
        {account.swift && (
          <div className="flex justify-between">
            <span className="text-gray-600">SWIFT/BIC</span>
            <span className="font-medium font-mono">{account.swift}</span>
          </div>
        )}
      </div>

      {/* Instructions */}
      {account.instructions && (
        <div className="mt-6 p-4 bg-white rounded border border-blue-100">
          <p className="text-sm text-gray-700">{account.instructions}</p>
        </div>
      )}

      {/* Deadline Notice */}
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          Please complete the transfer within <strong>3 business days</strong> and
          include order number <strong>#{order.number}</strong> in the payment
          reference.
        </p>
      </div>

      {/* Copy Button */}
      <div className="mt-6">
        <button
          onClick={handleCopy}
          className={cn(
            'w-full sm:w-auto px-4 py-2 text-sm font-medium rounded border transition-colors',
            copied
              ? 'bg-green-100 border-green-300 text-green-800'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          )}
        >
          {copied ? '✓ Copied to Clipboard' : 'Copy Account Details'}
        </button>
      </div>
    </div>
  )
}
