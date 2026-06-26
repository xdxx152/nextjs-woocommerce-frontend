import { NextResponse } from 'next/server';
import { wooCommerce } from '@/lib/woocommerce';
import type { WCAddress } from '@/types/woocommerce';

interface OrderRequestBody {
  billing: WCAddress;
  shipping: WCAddress;
  line_items: Array<{
    product_id: number;
    variation_id?: number;
    quantity: number;
  }>;
  shipping_lines?: Array<{
    method_id: string;
    method_title: string;
    total: string;
  }>;
  customer_note?: string;
  create_account?: boolean;
  password?: string;
  currency?: string; // Optional currency code (e.g., 'EUR', 'GBP')
  payment_method?: string;        // 'cod' | 'stripe' | 'paypal' | 'bacs'
  payment_method_title?: string;  // Display title for the payment method
  set_paid?: boolean;             // Whether the order is paid (default: false)
}

export async function POST(request: Request) {
  try {
    const body: OrderRequestBody = await request.json();

    // Validate required fields
    if (!body.billing || !body.line_items?.length) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If user wants to create an account, create customer first
    let customerId = 0;
    if (body.create_account && body.password && body.billing.email) {
      try {
        const customer = await wooCommerce.customers.create({
          email: body.billing.email,
          first_name: body.billing.first_name,
          last_name: body.billing.last_name,
          password: body.password,
          billing: body.billing,
          shipping: body.shipping,
        });
        customerId = customer.id;
      } catch (err) {
        // If customer already exists, try to find them
        const existingCustomer = await wooCommerce.customers.getByEmail(body.billing.email);
        if (existingCustomer) {
          customerId = existingCustomer.id;
        }
        // If customer creation fails for other reasons, continue without customer ID
        console.error('Customer creation error:', err);
      }
    }

    // Determine payment method and title
    const paymentMethod = body.payment_method || 'cod';
    const paymentMethodTitle = body.payment_method_title || getPaymentMethodTitle(paymentMethod);
    const setPaid = body.set_paid ?? false;

    // Create the order with optional currency
    const params: Record<string, string | number | boolean | undefined> = {};
    if (body.currency) {
      params.currency = body.currency;
    }

    const order = await wooCommerce.orders.create({
      payment_method: paymentMethod,
      payment_method_title: paymentMethodTitle,
      set_paid: setPaid,
      billing: body.billing,
      shipping: body.shipping,
      line_items: body.line_items,
      shipping_lines: body.shipping_lines,
      customer_id: customerId || undefined,
      customer_note: body.customer_note,
    }, params);

    return NextResponse.json({
      id: order.id,
      number: order.number,
      status: order.status,
      total: order.total,
    });
  } catch (error) {
    console.error('Order creation error:', error);

    const message = error instanceof Error ? error.message : 'Failed to create order';
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * Generate a human-readable payment method title from the payment method slug.
 */
function getPaymentMethodTitle(method: string): string {
  const titles: Record<string, string> = {
    cod: 'Cash on Delivery',
    stripe: 'Credit Card (Stripe)',
    paypal: 'PayPal',
    bacs: 'Direct Bank Transfer',
  };
  return titles[method] || method;
}
