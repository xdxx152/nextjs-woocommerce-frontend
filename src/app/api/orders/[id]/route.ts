import { NextRequest, NextResponse } from 'next/server';
import { wooCommerce } from '@/lib/woocommerce';

/**
 * GET /api/orders/[id]
 *
 * Fetch a single WooCommerce order by ID.
 * Used by OrderStatusPoller to check payment status.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }
    
    const order = await wooCommerce.orders.get(orderId);
    
    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    
    const message = error instanceof Error ? error.message : 'Failed to fetch order';
    const status = (error as any)?.status || 500;
    
    return NextResponse.json({ error: message }, { status });
  }
}
