'use client';

import { useCurrencyStore } from '@/stores/currency-store';
import { formatPrice as baseFormatPrice } from '@/lib/utils';

interface PriceDisplayProps {
  price: number | string;
  regularPrice?: number | string;
  salePrice?: number | string;
  isOnSale?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showCurrency?: boolean;
}

export function PriceDisplay({
  price,
  regularPrice,
  salePrice,
  isOnSale = false,
  className,
}: PriceDisplayProps) {
  const currency = useCurrencyStore((s) => s.currency);

  // Determine if there's a sale
  const onSale = isOnSale && salePrice && parseFloat(String(salePrice)) < parseFloat(String(regularPrice || price));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {onSale ? (
        <>
          <span className="text-red-600">
            {baseFormatPrice(salePrice!, currency)}
          </span>
          <span className="text-gray-400 line-through">
            {baseFormatPrice(regularPrice || price, currency)}
          </span>
        </>
      ) : (
        <span className="text-gray-900">
          {baseFormatPrice(price, currency)}
        </span>
      )}
    </div>
  );
}
