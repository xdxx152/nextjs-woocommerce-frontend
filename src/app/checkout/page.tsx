'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCartStore, useCartItems, useCartTotal } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useCurrencyStore } from '@/stores/currency-store';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaymentMethodSelector, type PaymentMethod } from '@/components/checkout/payment-method-selector';
import { PayPalButton, type CheckoutFormData } from '@/components/checkout/paypal-button';
import type { ShippingRate, ShippingRatesResponse } from '@/types/woocommerce';

const checkoutSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  address1: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State/Province is required'),
  postcode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  shippingSameAsBilling: z.boolean(),
  shippingFirstName: z.string().optional(),
  shippingLastName: z.string().optional(),
  shippingAddress1: z.string().optional(),
  shippingAddress2: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingPostcode: z.string().optional(),
  shippingCountry: z.string().optional(),
  orderNotes: z.string().optional(),
  createAccount: z.boolean().optional(),
  password: z.string().optional(),
  paymentMethod: z.enum(['stripe', 'paypal', 'bacs', 'cod']),
});

type FormData = z.infer<typeof checkoutSchema>;

function getPaymentMethodTitle(method: PaymentMethod): string {
  const titles: Record<PaymentMethod, string> = {
    stripe: 'Credit Card (Stripe)',
    paypal: 'PayPal',
    bacs: 'Bank Transfer',
    cod: 'Cash on Delivery',
  };
  return titles[method];
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartItems();
  const total = useCartTotal();
  const { clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const currency = useCurrencyStore((s) => s.currency);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutFormData | null>(null);
  
  // Shipping state
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [shippingTotal, setShippingTotal] = useState<string>('0.00');
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const shippingFetchIdRef = useRef(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingSameAsBilling: true,
      createAccount: false,
      country: 'US',
      shippingCountry: 'US',
      paymentMethod: 'stripe',
    },
  });

  const shippingSameAsBilling = watch('shippingSameAsBilling');
  const createAccount = watch('createAccount');
  const paymentMethod = watch('paymentMethod');
  
  // Watch address fields for shipping calculation
  const watchedAddress1 = watch('address1');
  const watchedCity = watch('city');
  const watchedState = watch('state');
  const watchedPostcode = watch('postcode');
  const watchedCountry = watch('country');
  const watchedShippingAddress1 = watch('shippingAddress1');
  const watchedShippingCity = watch('shippingCity');
  const watchedShippingState = watch('shippingState');
  const watchedShippingPostcode = watch('shippingPostcode');
  const watchedShippingCountry = watch('shippingCountry');

  // Whether the PayPal button view is active (checkoutData set + payment is PayPal)
  const showPaypalView = checkoutData !== null && paymentMethod === 'paypal';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'cancelled') {
      setError('Payment was cancelled. Your order has been saved, you can retry.');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      setValue('email', user.email);
      setValue('firstName', user.firstName || '');
      setValue('lastName', user.lastName || '');
    }
  }, [isAuthenticated, user, setValue]);

  // Fetch shipping rates when address changes
  const fetchShippingRates = useCallback(async () => {
    // Only fetch if we have required billing address fields
    if (!watchedAddress1 || !watchedCity || !watchedPostcode || !watchedCountry || items.length === 0) {
      return;
    }

    const fetchId = ++shippingFetchIdRef.current;
    setIsLoadingShipping(true);
    setShippingError(null);

    try {
      const billingAddress = {
        first_name: 'temp',
        last_name: 'temp',
        address_1: watchedAddress1,
        city: watchedCity,
        state: watchedState || '',
        postcode: watchedPostcode,
        country: watchedCountry,
      };

      const shippingAddress = shippingSameAsBilling
        ? billingAddress
        : {
            first_name: 'temp',
            last_name: 'temp',
            address_1: watchedShippingAddress1 || watchedAddress1,
            city: watchedShippingCity || watchedCity,
            state: watchedShippingState || watchedState || '',
            postcode: watchedShippingPostcode || watchedPostcode,
            country: watchedShippingCountry || watchedCountry,
          };

      const response = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            product_id: item.productId,
            variation_id: item.variationId || 0,
            quantity: item.quantity,
          })),
          billing: billingAddress,
          shipping: shippingAddress,
        }),
      });

      // Check if this response is still relevant
      if (fetchId !== shippingFetchIdRef.current) {
        return;
      }

      const data: ShippingRatesResponse = await response.json();
      console.log('Shipping rates response:', JSON.stringify(data, null, 2));

      if (data.success) {
        console.log('Setting shipping rates:', data.shipping_rates);
        console.log('Setting shipping total:', data.shipping_total);
        setShippingRates(data.shipping_rates);
        setShippingTotal(data.shipping_total);
        if (data.error) {
          console.log('Shipping warning:', data.error);
          setShippingError(data.error);
        }
      } else {
        console.error('Shipping calculation failed:', data.error);
        setShippingError(data.error || 'Unable to calculate shipping');
      }
    } catch (err) {
      if (fetchId !== shippingFetchIdRef.current) {
        return;
      }
      console.error('Failed to fetch shipping rates:', err);
      setShippingError('Unable to calculate shipping');
    } finally {
      if (fetchId === shippingFetchIdRef.current) {
        setIsLoadingShipping(false);
      }
    }
  }, [
    watchedAddress1,
    watchedCity,
    watchedState,
    watchedPostcode,
    watchedCountry,
    watchedShippingAddress1,
    watchedShippingCity,
    watchedShippingState,
    watchedShippingPostcode,
    watchedShippingCountry,
    shippingSameAsBilling,
    items,
  ]);

  useEffect(() => {
    // Debounce shipping calculation
    const timer = setTimeout(() => {
      fetchShippingRates();
    }, 500);

    return () => clearTimeout(timer);
  }, [fetchShippingRates]);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-8"></div>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-light">Your cart is empty</h1>
          <p className="mt-2 text-gray-500">Add some items to your cart before checkout.</p>
          <Link href="/shop">
            <Button className="mt-8">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate grand total with shipping
  const shippingTotalNumber = parseFloat(shippingTotal) || 0;
  const grandTotal = total + shippingTotalNumber;
  
  // Debug logging for shipping calculation
  console.log('Cart total:', total);
  console.log('Shipping total string:', shippingTotal);
  console.log('Shipping total number:', shippingTotalNumber);
  console.log('Grand total:', grandTotal);
  console.log('Shipping rates available:', shippingRates.length);

  const getSubmitButtonText = () => {
    if (isSubmitting) return 'Processing...';
    switch (paymentMethod) {
      case 'stripe':
        return `Pay ${formatPrice(grandTotal, currency)}`;
      case 'paypal':
        return 'Continue to Payment';
      default:
        return 'Place Order';
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const billingAddress = {
        first_name: data.firstName,
        last_name: data.lastName,
        address_1: data.address1,
        address_2: data.address2 || '',
        city: data.city,
        state: data.state,
        postcode: data.postcode,
        country: data.country,
        email: data.email,
        phone: data.phone,
        company: '',
      };

      const shippingAddress = data.shippingSameAsBilling
        ? { ...billingAddress }
        : {
            first_name: data.shippingFirstName || data.firstName,
            last_name: data.shippingLastName || data.lastName,
            address_1: data.shippingAddress1 || data.address1,
            address_2: data.shippingAddress2 || '',
            city: data.shippingCity || data.city,
            state: data.shippingState || data.state,
            postcode: data.shippingPostcode || data.postcode,
            country: data.shippingCountry || data.country,
            company: '',
          };

      const lineItems = items.map((item) => ({
        product_id: item.productId,
        variation_id: item.variationId || 0,
        quantity: item.quantity,
      }));

      // Branch by payment method
      if (data.paymentMethod === 'stripe') {
        // 1. Create WC order
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            billing: billingAddress,
            shipping: shippingAddress,
            line_items: lineItems,
            shipping_lines: shippingRates.length > 0 ? [{
              method_id: shippingRates[0].method_id,
              method_title: shippingRates[0].method_title,
              total: shippingRates[0].total,
            }] : undefined,
            customer_note: data.orderNotes || '',
            create_account: data.createAccount,
            password: data.password,
            currency: currency,
            payment_method: data.paymentMethod,
            payment_method_title: getPaymentMethodTitle(data.paymentMethod),
            set_paid: false,
          }),
        });

        const orderData = await orderResponse.json();

        if (!orderResponse.ok) {
          throw new Error(orderData.message || 'Failed to create order');
        }

        const orderId: number = orderData.id;

        clearCart(); // Clear cart before redirect to Stripe
        // Create Stripe Checkout Session and redirect
        const stripeResponse = await fetch('/api/checkout/stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        if (!stripeResponse.ok) {
          const err = await stripeResponse.json();
          throw new Error(err.error || 'Failed to create Stripe session');
        }

        const { url } = await stripeResponse.json();
        // Redirect to Stripe hosted payment page
        window.location.href = url;
      } else if (data.paymentMethod === 'paypal') {
        // Build checkout data for PayPal — order will be created lazily
        // when user clicks the PayPal button
        const checkoutPayload: CheckoutFormData = {
          billing: billingAddress,
          shipping: shippingAddress,
          line_items: lineItems,
          shipping_lines: shippingRates.length > 0 ? [{
            method_id: shippingRates[0].method_id,
            method_title: shippingRates[0].method_title,
            total: shippingRates[0].total,
          }] : undefined,
          customer_note: data.orderNotes || '',
          create_account: data.createAccount,
          password: data.password,
          currency: currency,
          payment_method: data.paymentMethod,
          payment_method_title: getPaymentMethodTitle(data.paymentMethod),
          set_paid: false,
        };

        // Set checkout data to show PayPal button
        setCheckoutData(checkoutPayload);
        setIsSubmitting(false);
      } else {
        // bacs / cod — Create WC order and redirect
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            billing: billingAddress,
            shipping: shippingAddress,
            line_items: lineItems,
            shipping_lines: shippingRates.length > 0 ? [{
              method_id: shippingRates[0].method_id,
              method_title: shippingRates[0].method_title,
              total: shippingRates[0].total,
            }] : undefined,
            customer_note: data.orderNotes || '',
            create_account: data.createAccount,
            password: data.password,
            currency: currency,
            payment_method: data.paymentMethod,
            payment_method_title: getPaymentMethodTitle(data.paymentMethod),
            set_paid: false,
          }),
        });

        const orderData = await orderResponse.json();

        if (!orderResponse.ok) {
          throw new Error(orderData.message || 'Failed to create order');
        }

        const orderId: number = orderData.id;

        clearCart(); // Clear cart before redirect
        // Redirect directly to order confirmation
        router.push(`/order-confirmation/${orderId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      // Don't reset isSubmitting if we're about to redirect to Stripe
      if (paymentMethod !== 'stripe') {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
      <h1 className="text-3xl font-light">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 lg:grid lg:grid-cols-12 lg:gap-12">
        {/* Form Section */}
        <div className="lg:col-span-7">
          {/* Contact Information */}
          <section>
            <h2 className="text-lg font-medium">Contact Information</h2>
            {!isAuthenticated && (
              <p className="mt-1 text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/account/login?redirect=/checkout" className="text-black underline">
                  Log in
                </Link>
              </p>
            )}
            <div className="mt-4">
              <Input
                type="email"
                placeholder="Email address"
                {...register('email')}
                error={errors.email?.message}
              />
            </div>
          </section>

          {/* Billing Address */}
          <section className="mt-8">
            <h2 className="text-lg font-medium">Billing Address</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="First name"
                {...register('firstName')}
                error={errors.firstName?.message}
              />
              <Input
                placeholder="Last name"
                {...register('lastName')}
                error={errors.lastName?.message}
              />
              <div className="sm:col-span-2">
                <Input
                  placeholder="Phone number"
                  {...register('phone')}
                  error={errors.phone?.message}
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  placeholder="Address"
                  {...register('address1')}
                  error={errors.address1?.message}
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  placeholder="Apartment, suite, etc. (optional)"
                  {...register('address2')}
                />
              </div>
              <Input
                placeholder="City"
                {...register('city')}
                error={errors.city?.message}
              />
              <Input
                placeholder="State / Province"
                {...register('state')}
                error={errors.state?.message}
              />
              <Input
                placeholder="Postal code"
                {...register('postcode')}
                error={errors.postcode?.message}
              />
              <select
                {...register('country')}
                className="w-full border border-gray-300 px-4 py-3 text-sm focus:border-black focus:outline-none"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
              </select>
            </div>
          </section>

          {/* Shipping Address */}
          <section className="mt-8">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="shippingSameAsBilling"
                {...register('shippingSameAsBilling')}
                className="h-4 w-4 border-gray-300 text-black focus:ring-black"
              />
              <label htmlFor="shippingSameAsBilling" className="text-sm">
                Shipping address same as billing
              </label>
            </div>

            {!shippingSameAsBilling && (
              <div className="mt-4">
                <h2 className="text-lg font-medium">Shipping Address</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input
                    placeholder="First name"
                    {...register('shippingFirstName')}
                  />
                  <Input
                    placeholder="Last name"
                    {...register('shippingLastName')}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      placeholder="Address"
                      {...register('shippingAddress1')}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      placeholder="Apartment, suite, etc. (optional)"
                      {...register('shippingAddress2')}
                    />
                  </div>
                  <Input
                    placeholder="City"
                    {...register('shippingCity')}
                  />
                  <Input
                    placeholder="State / Province"
                    {...register('shippingState')}
                  />
                  <Input
                    placeholder="Postal code"
                    {...register('shippingPostcode')}
                  />
                  <select
                    {...register('shippingCountry')}
                    className="w-full border border-gray-300 px-4 py-3 text-sm focus:border-black focus:outline-none"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* Create Account */}
          {!isAuthenticated && (
            <section className="mt-8">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createAccount"
                  {...register('createAccount')}
                  className="h-4 w-4 border-gray-300 text-black focus:ring-black"
                />
                <label htmlFor="createAccount" className="text-sm">
                  Create an account for faster checkout
                </label>
              </div>

              {createAccount && (
                <div className="mt-4">
                  <Input
                    type="password"
                    placeholder="Create password"
                    {...register('password')}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Password must be at least 8 characters
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Order Notes */}
          <section className="mt-8">
            <label htmlFor="orderNotes" className="text-sm font-medium">
              Order notes (optional)
            </label>
            <textarea
              id="orderNotes"
              {...register('orderNotes')}
              rows={3}
              className="mt-2 w-full border border-gray-300 px-4 py-3 text-sm focus:border-black focus:outline-none"
              placeholder="Special instructions for your order..."
            />
          </section>

          {/* Error Message */}
          {error && (
            <div className="mt-6 rounded bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* PayPal Button Area — shown when checkoutData is set (after form validation for PayPal) */}
          {showPaypalView && (
            <div className="mt-6 space-y-4">
              {/* Order summary for PayPal */}
              <div className="rounded-lg border p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">PayPal Payment</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Complete your payment of{' '}
                  <span className="font-medium">{formatPrice(grandTotal, currency)}</span>{' '}
                  using PayPal.
                </p>
              </div>

              {/* PayPal Button */}
              <PayPalButton
                checkoutData={checkoutData}
                amount={total.toString()}
                currency={currency}
                onSuccess={(orderId) => {
                  clearCart();
                  router.push(`/order-confirmation/${orderId}`);
                }}
                onError={(err) => {
                  console.error('PayPal payment error:', err);
                  setError(
                    err instanceof Error
                      ? err.message
                      : 'PayPal payment failed. Please try again.'
                  );
                }}
              />

              {/* Back to checkout link */}
              <button
                type="button"
                onClick={() => {
                  setCheckoutData(null);
                  setError(null);
                }}
                className="text-sm text-gray-500 hover:underline"
              >
                ← Back to checkout
              </button>
            </div>
          )}

          {/* Submit Button - Mobile (hidden when PayPal view is active) */}
          {!showPaypalView && (
            <div className="mt-8 lg:hidden">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {getSubmitButtonText()}
              </Button>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="mt-8 lg:col-span-5 lg:mt-0">
          <div className="sticky top-24 bg-gray-50 p-6">
            <h2 className="text-lg font-medium">Order Summary</h2>

            {/* Items */}
            <div className="mt-6 divide-y">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 py-4">
                  <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden bg-gray-100">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium">{item.name}</span>
                    {item.attributes && Object.keys(item.attributes).length > 0 && (
                      <span className="text-xs text-gray-500">
                        {Object.entries(item.attributes)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(' / ')}
                      </span>
                    )}
                  </div>
                  <span className="text-sm">{formatPrice(item.price * item.quantity, currency)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 space-y-3 border-t pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatPrice(total, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                {isLoadingShipping ? (
                  <span className="text-gray-400">Calculating...</span>
                ) : shippingError ? (
                  <span className="text-gray-400">Calculated at next step</span>
                ) : (
                  <span>{formatPrice(shippingTotalNumber, currency)}</span>
                )}
              </div>
            </div>

            <div className="mt-6 border-t pt-6">
              <div className="flex justify-between text-lg font-medium">
                <span>Total</span>
                <span>{formatPrice(grandTotal, currency)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mt-6">
              <PaymentMethodSelector
                value={paymentMethod}
                onChange={(method) => {
                  setValue('paymentMethod', method);
                  // Clear checkout data when payment method changes
                  setCheckoutData(null);
                }}
                disabled={isSubmitting}
              />
            </div>

            {/* Submit Button - Desktop (hidden when PayPal view is active) */}
            {!showPaypalView && (
              <div className="mt-6 hidden lg:block">
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {getSubmitButtonText()}
                </Button>
              </div>
            )}

            {/* Security Note */}
            <div className="mt-6 flex items-center justify-center gap-2 text-gray-400">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
              <span className="text-xs">Secure checkout</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
