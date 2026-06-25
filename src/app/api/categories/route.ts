import { NextResponse } from 'next/server'
import { wooCommerce } from '@/lib/woocommerce'

export async function GET() {
  try {
    const categories = await wooCommerce.categories.list({
      per_page: 4,
      hide_empty: true
    })
    
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return NextResponse.json([], { status: 500 })
  }
}
