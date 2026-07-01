/**
 * PayPal REST API v2 服务端封装
 *
 * 使用原生 fetch 调用 PayPal API，无需额外 SDK。
 * 仅在服务端（API 路由）使用，PAYPAL_CLIENT_SECRET 绝不暴露给客户端。
 *
 * 参考: https://developer.paypal.com/docs/api/orders/v2/
 */

// =================================
// 环境变量与基础配置
// =================================

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!

/**
 * 将 PAYPAL_API_BASE 环境变量映射为完整的 API 基础 URL
 * 支持 'sandbox' / 'live' 简写，或直接传入完整 URL
 */
function getPayPalBaseUrl(): string {
  const raw = process.env.PAYPAL_API_BASE || 'sandbox'
  switch (raw.toLowerCase()) {
    case 'sandbox':
      return 'https://api-m.sandbox.paypal.com'
    case 'live':
      return 'https://api-m.paypal.com'
    default:
      // 允许直接传入完整 URL
      return raw.replace(/\/+$/, '') // 去除尾部斜杠
  }
}

const PAYPAL_API_BASE = getPayPalBaseUrl()

// =================================
// 类型定义
// =================================

/** PayPal Access Token 响应 */
interface PayPalTokenResponse {
  access_token: string
  token_type: string
  app_id: string
  expires_in: number
  scope: string
}

export interface PayPalOrderItem {
  /** 商品名称 */
  name: string
  /** 商品描述（可选） */
  description?: string
  /** SKU */
  sku?: string
  /** 单价 */
  unit_amount: {
    currency_code: string
    value: string
  }
  /** 税费（可选） */
  tax?: {
    currency_code: string
    value: string
  }
  /** 数量 */
  quantity: string
  /** 商品类别：PHYSICAL_GOODS | DIGITAL_GOODS */
  category?: 'PHYSICAL_GOODS' | 'DIGITAL_GOODS'
}

export interface PayPalShippingAddress {
  /** 收货人姓名 */
  name: {
    full_name: string
  }
  /** 物流地址 */
  address: {
    address_line_1: string
    address_line_2?: string
    admin_area_2: string   // 城市
    admin_area_1: string   // 州/省
    postal_code: string
    country_code: string
  }
}

/** 创建 PayPal 订单的参数 */
export interface CreatePayPalOrderParams {
  /** WooCommerce 订单 ID（写入 custom_id 用于对账） */
  wcOrderId: number
  /** 订单总金额（字符串小数，如 "49.99"） */
  total: string
  /** ISO 4217 币种代码（如 "USD"、"EUR"、"GBP"） */
  currency: string
  /** WC 订单号（用于描述） */
  number: string
  /** 商品明细数组（强烈推荐，用于 PayPal 交易记录和 Seller Protection） */
  items?: PayPalOrderItem[]
  /** 物流地址（实体商品必传，用于 PayPal Seller Protection） */
  shipping?: PayPalShippingAddress
  /** 运费金额（可选，建议传入以展示完整 breakdown） */
  shippingAmount?: string
  /** 税费总金额（可选，建议传入以展示完整 breakdown） */
  taxAmount?: string
}

/** 创建 PayPal 订单的返回结果 */
export interface CreatePayPalOrderResult {
  /** PayPal 订单 ID（前端 onApprove 回调中使用） */
  id: string
  /** PayPal 订单状态 */
  status: string
}

/** 捕获 PayPal 订单的返回结果 */
export interface CapturePayPalOrderResult {
  /** 捕获状态: COMPLETED / DECLINED / PAYER_ACTION_REQUIRED */
  status: string
  /** PayPal 交易 ID（capture 成功时返回） */
  transactionId?: string
  /** 捕获金额 */
  capturedAmount?: string
  /** 捕获币种 */
  capturedCurrency?: string
}

/** PayPal API 错误响应 */
interface PayPalErrorResponse {
  name?: string
  message?: string
  debug_id?: string
  details?: Array<{
    field?: string
    issue?: string
    description?: string
  }>
}

// =================================
// 自定义错误类
// =================================

/**
 * PayPal API 错误
 * 包含 PayPal 返回的错误名称、消息和调试 ID，便于排查问题
 */
export class PayPalError extends Error {
  public readonly name: string
  public readonly debugId?: string
  public readonly statusCode: number
  public readonly details?: PayPalErrorResponse['details']

  constructor(
    message: string,
    statusCode: number,
    paypalError?: PayPalErrorResponse
  ) {
    super(message)
    this.name = 'PayPalError'
    this.statusCode = statusCode
    this.debugId = paypalError?.debug_id
    this.details = paypalError?.details
  }
}

// =================================
// Access Token 获取（带内存缓存）
// =================================

let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * 获取 PayPal OAuth2 Access Token（client_credentials grant）
 *
 * 使用内存缓存，避免每次 API 调用都重新认证。
 * Token 有效期通常为 1 小时，提前 5 分钟刷新。
 *
 * @returns PayPal access token 字符串
 * @throws {PayPalError} 获取 token 失败时抛出
 */
export async function getPayPalAccessToken(): Promise<string> {
  // 检查缓存是否有效（提前 5 分钟刷新）
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
    return cachedToken.token
  }

  const credentials = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new PayPalError(
      `Failed to obtain PayPal access token: ${response.status} ${response.statusText}`,
      response.status,
      errorBody
    )
  }

  const data: PayPalTokenResponse = await response.json()

  // 缓存 token
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return data.access_token
}

/**
 * 清除缓存的 access token
 * 在 token 被撤销或需要强制刷新时使用
 */
export function clearPayPalTokenCache(): void {
  cachedToken = null
}

// =================================
// 创建 PayPal 订单
// =================================

/**
 * 在 PayPal 创建订单（intent: CAPTURE）
 *
 * 对应前端 PayPal 按钮的 createOrder 回调。
 * 金额与币种来自 WooCommerce 服务端订单，不接受前端传入。
 *
 * @param params - 订单参数（金额、币种、WC 订单信息）
 * @returns PayPal 订单 ID 和状态
 * @throws {PayPalError} PayPal API 调用失败时抛出
 */
export async function createPayPalOrder(
  params: CreatePayPalOrderParams
): Promise<CreatePayPalOrderResult> {
  const { wcOrderId, total, currency, number, items, shipping, shippingAmount, taxAmount } = params

  const accessToken = await getPayPalAccessToken()

  // 构建 amount 对象，有 items 时附带 breakdown
  const amount: Record<string, unknown> = {
    currency_code: currency.toUpperCase(),
    value: total,
  }

  if (items && items.length > 0) {
    // 计算商品小计总和（items 中 unit_amount * quantity 的总和）
    const itemTotal = items.reduce(
      (sum, item) => sum + parseFloat(item.unit_amount.value) * parseInt(item.quantity, 10),
      0
    ).toFixed(2)

    const breakdown: Record<string, { currency_code: string; value: string }> = {
      item_total: {
        currency_code: currency.toUpperCase(),
        value: itemTotal,
      },
    }

    if (shippingAmount) {
      breakdown.shipping = {
        currency_code: currency.toUpperCase(),
        value: shippingAmount,
      }
    }

    if (taxAmount) {
      breakdown.tax_total = {
        currency_code: currency.toUpperCase(),
        value: taxAmount,
      }
    }

    amount.breakdown = breakdown
  }

  // 构建 purchase_unit
  const purchaseUnit: Record<string, unknown> = {
    amount,
    custom_id: String(wcOrderId),
    description: `Order #${number}`,
    soft_descriptor: 'NOVAFABRIC',
  }

  // 有 items 时传入
  if (items && items.length > 0) {
    purchaseUnit.items = items
  }

  // 有物流地址时传入
  if (shipping) {
    purchaseUnit.shipping = shipping
  }

  // 确定 shipping_preference
  // 如果传了物流地址，使用 SET_PROVIDED_ADDRESS 告知 PayPal 地址已由商家在 purchase_units 中提供
  // 否则使用 NO_SHIPPING（虚拟商品或无需物流）
  const shippingPreference = shipping ? 'SET_PROVIDED_ADDRESS' : 'NO_SHIPPING'

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // PayPal Idempotency-Key 防止重复创建
      'PayPal-Request-Id': `wc-order-${wcOrderId}-${Date.now()}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [purchaseUnit],
      application_context: {
        // 地址已在 purchase_units[].shipping 中由商家提供
        shipping_preference: shippingPreference,
        user_action: 'PAY_NOW',
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new PayPalError(
      `Failed to create PayPal order: ${response.status} ${response.statusText}`,
      response.status,
      errorBody
    )
  }

  const data = await response.json()

  return {
    id: data.id,
    status: data.status,
  }
}

// =================================
// 捕获 PayPal 订单
// =================================

/**
 * 捕获 PayPal 订单资金
 *
 * 对应前端 PayPal 按钮的 onApprove 回调。
 * 用户在 PayPal 弹窗审批通过后调用此函数完成扣款。
 *
 * @param paypalOrderId - PayPal 订单 ID（createOrder 返回的）
 * @returns 捕获状态和交易 ID
 * @throws {PayPalError} PayPal API 调用失败时抛出
 */
export async function capturePayPalOrder(
  paypalOrderId: string
): Promise<CapturePayPalOrderResult> {
  const accessToken = await getPayPalAccessToken()

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({}),
    }
  )

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new PayPalError(
      `Failed to capture PayPal order: ${response.status} ${response.statusText}`,
      response.status,
      errorBody
    )
  }

  const data = await response.json()

  // 提取 capture 信息
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0]

  return {
    status: data.status,
    transactionId: capture?.id,
    capturedAmount: capture?.amount?.value,
    capturedCurrency: capture?.amount?.currency_code,
  }
}

// =================================
// 查询 PayPal 订单状态
// =================================

/**
 * 查询 PayPal 订单详情
 *
 * 用于在需要时验证订单状态，例如 capture 前的二次确认。
 *
 * @param paypalOrderId - PayPal 订单 ID
 * @returns PayPal 订单完整数据
 * @throws {PayPalError} PayPal API 调用失败时抛出
 */
export async function getPayPalOrderDetails(
  paypalOrderId: string
): Promise<Record<string, unknown>> {
  const accessToken = await getPayPalAccessToken()

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  )

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new PayPalError(
      `Failed to get PayPal order details: ${response.status} ${response.statusText}`,
      response.status,
      errorBody
    )
  }

  return response.json()
}
