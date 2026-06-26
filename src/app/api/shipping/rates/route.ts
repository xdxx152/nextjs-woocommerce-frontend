import { NextRequest, NextResponse } from 'next/server';
import { orders, WooCommerceError } from '@/lib/woocommerce';
import type {
  ShippingRate,
  ShippingRatesRequest,
  ShippingRatesResponse,
  CreateOrderData,
  WCOrder,
} from '@/types/woocommerce';

/**
 * POST /api/shipping/rates
 *
 * Calculate shipping rates by creating a temporary auto-draft order in WooCommerce,
 * extracting the shipping lines, then deleting the order.
 *
 * This approach leverages WooCommerce's built-in shipping zone/method calculations
 * without needing the Store API plugin.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ShippingRatesResponse>> {
  try {
    const body: ShippingRatesRequest = await request.json();

    // 1. Validate required fields
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, shipping_rates: [], shipping_total: '0.00', error: validationError },
        { status: 400 }
      );
    }

    const billingAddress = body.billing;
    const shippingAddress = body.shipping || body.billing;

    // 2. Build a minimal order payload for shipping calculation
    const orderData: CreateOrderData = {
      payment_method: '',
      payment_method_title: '',
      set_paid: false,
      billing: {
        first_name: billingAddress.first_name,
        last_name: billingAddress.last_name,
        address_1: billingAddress.address_1,
        address_2: billingAddress.address_2 || '',
        city: billingAddress.city,
        state: billingAddress.state,
        postcode: billingAddress.postcode,
        country: billingAddress.country,
        company: '',
      },
      shipping: {
        first_name: shippingAddress.first_name,
        last_name: shippingAddress.last_name,
        address_1: shippingAddress.address_1,
        address_2: shippingAddress.address_2 || '',
        city: shippingAddress.city,
        state: shippingAddress.state,
        postcode: shippingAddress.postcode,
        country: shippingAddress.country,
        company: '',
      },
      line_items: body.items.map((item) => ({
        product_id: item.product_id,
        variation_id: item.variation_id || 0,
        quantity: item.quantity,
      })),
    };

    // 3. Create a temporary auto-draft order to calculate shipping
    let order: WCOrder;
    try {
      console.log('Creating temporary order for shipping calculation:', JSON.stringify(orderData, null, 2));
      order = await orders.create(orderData, { status: 'auto-draft' });
      console.log('Temporary order created successfully:', order.id);
    } catch (apiError) {
      // If WooCommerce API fails, return a fallback flat rate
      if (apiError instanceof WooCommerceError) {
        console.error(`WooCommerce API error (${apiError.status}): ${apiError.message}`);
        console.log('Returning fallback rates due to API error');
        return NextResponse.json(
          {
            success: true,
            shipping_rates: getFallbackRates(),
            shipping_total: '0.00',
          },
          { status: 200 }
        );
      }
      console.error('Unexpected error creating temporary order:', apiError);
      throw apiError;
    }

    // 4. Extract shipping rates from the created order
    console.log('Order shipping_lines:', JSON.stringify(order.shipping_lines, null, 2));
    const shippingRates: ShippingRate[] = extractShippingRates(order);
    console.log('Extracted shipping rates:', JSON.stringify(shippingRates, null, 2));
    const shippingTotal = calculateShippingTotal(shippingRates);
    console.log('Calculated shipping total:', shippingTotal);

    // 5. Clean up: delete the temporary order (best-effort)
    try {
      await orders.update(order.id, { status: 'trash' } as Partial<CreateOrderData> & { status?: string });
    } catch (cleanupError) {
      // Non-critical: log but don't fail the response
      console.warn('Failed to cleanup temporary shipping order:', cleanupError);
    }

    // 6. If no shipping methods were found, return fallback rates
    if (shippingRates.length === 0) {
      console.log('No shipping methods found, returning fallback rates');
      return NextResponse.json({
        success: true,
        shipping_rates: getFallbackRates(),
        shipping_total: '0.00',
      });
    }

    return NextResponse.json({
      success: true,
      shipping_rates: shippingRates,
      shipping_total: shippingTotal,
    });
  } catch (error) {
    console.error('Shipping rate calculation error:', error);
    console.log('Returning fallback rates due to unexpected error');

    // Network or unexpected errors: return fallback rates
    return NextResponse.json(
      {
        success: true,
        shipping_rates: getFallbackRates(),
        shipping_total: '0.00',
        error: error instanceof Error ? error.message : 'Unable to calculate shipping',
      },
      { status: 200 }
    );
  }
}

/**
 * Validate the incoming request body.
 * Returns an error message string if invalid, or null if valid.
 */
function validateRequest(body: ShippingRatesRequest): string | null {
  if (!body.items || body.items.length === 0) {
    return 'Cart is empty. Add items before calculating shipping.';
  }

  if (!body.billing) {
    return 'Billing address is required.';
  }

  const { billing } = body;
  if (!billing.first_name || !billing.last_name) {
    return 'Billing first name and last name are required.';
  }
  if (!billing.address_1) {
    return 'Billing street address is required.';
  }
  if (!billing.city) {
    return 'Billing city is required.';
  }
  if (!billing.postcode) {
    return 'Billing postal code is required.';
  }
  if (!billing.country) {
    return 'Billing country is required.';
  }

  // Validate items
  for (const item of body.items) {
    if (!item.product_id || item.product_id <= 0) {
      return `Invalid product ID: ${item.product_id}`;
    }
    if (!item.quantity || item.quantity <= 0) {
      return `Invalid quantity for product ${item.product_id}`;
    }
  }

  return null;
}

/**
 * Extract shipping rates from a WooCommerce order's shipping_lines.
 */
function extractShippingRates(order: WCOrder): ShippingRate[] {
  if (!order.shipping_lines || order.shipping_lines.length === 0) {
    return [];
  }

  return order.shipping_lines.map((line) => ({
    method_id: line.method_id,
    method_title: line.method_title,
    total: line.total || '0.00',
    currency: order.currency,
  }));
}

/**
 * Calculate the total shipping cost from all rates (typically there's only one).
 */
function calculateShippingTotal(rates: ShippingRate[]): string {
  if (rates.length === 0) return '0.00';

  const total = rates.reduce((sum, rate) => {
    return sum + parseFloat(rate.total || '0');
  }, 0);

  return total.toFixed(2);
}

/**
 * Fallback shipping rates when the WooCommerce API is unavailable.
 * Provides free shipping as a graceful degradation.
 */
function getFallbackRates(): ShippingRate[] {
  return [
    {
      method_id: 'free_shipping',
      method_title: 'Free Shipping',
      total: '0.00',
      currency: 'USD',
    },
  ];
}
