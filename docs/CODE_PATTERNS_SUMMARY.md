# 代码模式总结报告

> 本报告基于对项目关键代码文件的全面分析，涵盖类型签名、API 模式、组件结构、状态管理及 Stripe 集成兼容性要点。

---

## 目录

1. [订单创建 API — `src/app/api/orders/route.ts`](#1-订单创建-api)
2. [WooCommerce API 客户端 — `src/lib/woocommerce.ts`](#2-woocommerce-api-客户端)
3. [类型定义 — `src/types/woocommerce.ts`](#3-类型定义)
4. [结账页面 — `src/app/checkout/page.tsx`](#4-结账页面)
5. [订单确认页 — `src/app/order-confirmation/[id]/page.tsx`](#5-订单确认页)
6. [货币工具 — `src/lib/currency.ts`](#6-货币工具)
7. [购物车 Store — `src/stores/cart-store.ts`](#7-购物车-store)
8. [货币 Store — `src/stores/currency-store.ts`](#8-货币-store)
9. [Providers — `src/components/providers.tsx`](#9-providers)
10. [工具函数 — `src/lib/utils.ts`](#10-工具函数)
11. [Button 组件 — `src/components/ui/button.tsx`](#11-button-组件)
12. [环境变量 — `.env.example`](#12-环境变量)
13. [Next.js 配置 — `next.config.ts`](#13-nextjs-配置)
14. [依赖 — `package.json`](#14-依赖)

---

## 1. 订单创建 API

**文件**: [`src/app/api/orders/route.ts`](src/app/api/orders/route.ts)

### 请求体结构 — `OrderRequestBody`

```typescript
interface OrderRequestBody {
  billing: WCAddress;
  shipping: WCAddress;
  line_items: Array<{
    product_id: number;
    variation_id?: number;
    quantity: number;
  }>;
  customer_note?: string;
  create_account?: boolean;
  password?: string;
  currency?: string; // e.g., 'EUR', 'GBP'
}
```

### 响应格式

```typescript
// 成功响应 (200)
{
  id: number;       // WooCommerce 订单 ID
  number: string;   // 订单编号
  status: string;   // 订单状态
  total: string;    // 订单总金额
}

// 错误响应 (400/500)
{
  message: string;  // 错误信息
}
```

### 函数签名

```typescript
export async function POST(request: Request): Promise<NextResponse>
```

### 关键逻辑

1. **验证必填字段**: `billing` 和 `line_items` 必须存在
2. **可选创建客户**: 当 `create_account=true` 且有 `password` 和 `billing.email` 时，先调用 `wooCommerce.customers.create()` 创建客户，若失败则尝试 `wooCommerce.customers.getByEmail()` 查找已有客户
3. **创建订单**: 固定使用 `payment_method: 'cod'`（货到付款），`set_paid: false`
4. **传递货币**: `currency` 作为额外查询参数传递给 WooCommerce API

### ⚠️ Stripe 集成注意事项

- 当前硬编码 `payment_method: 'cod'`，Stripe 集成时需替换为 `payment_method: 'stripe'`
- 当前 `set_paid: false`，Stripe 集成后可能需要在 webhook 中设置支付状态
- `currency` 参数已支持传递，可通过 WooCommerce MultiCurrency 插件或 Stripe 直接处理
- **响应中未返回 `total` 的解析数值**，`order-confirmation` 页面通过 `wooCommerce.orders.get()` 重新获取完整订单数据

---

## 2. WooCommerce API 客户端

**文件**: [`src/lib/woocommerce.ts`](src/lib/woocommerce.ts)

### 错误类 — `WooCommerceError`

```typescript
class WooCommerceError extends Error {
  status: number;       // HTTP 状态码
  code?: string;        // WooCommerce 错误代码

  constructor(message: string, status: number, code?: string)
}
```

### 核心请求函数

```typescript
async function wooCommerceAPI<T>(
  endpoint: string,
  options: WooCommerceRequestOptions = {}
): Promise<T>

interface WooCommerceRequestOptions extends Omit<RequestInit, 'next'> {
  params?: Record<string, string | number | boolean | undefined>;
  next?: NextFetchRequestConfig;  // Next.js 缓存配置
}
```

### 订单 API 方法签名

```typescript
orders.create: (
  data: CreateOrderData,
  params?: Record<string, string | number | boolean | undefined>
) => Promise<WCOrder>

orders.get: (id: number) => Promise<WCOrder>

orders.listByCustomer: (
  customerId: number,
  params?: { per_page?: number; page?: number }
) => Promise<WCOrder[]>

orders.update: (
  id: number,
  data: Partial<CreateOrderData>,
  params?: Record<string, string | number | boolean | undefined>
) => Promise<WCOrder>
```

### 产品 API 方法签名

```typescript
products.list: (params?: ProductsQueryParams) => Promise<WCProduct[]>
products.get: (id: number) => Promise<WCProduct>
products.getBySlug: (slug: string) => Promise<WCProduct | null>
products.getVariations: (productId: number, params?: { per_page?: number }) => Promise<WCProductVariation[]>
products.getRelated: (product: WCProduct, limit?: number) => Promise<WCProduct[]>
```

### 客户 API 方法签名

```typescript
customers.create: (data: CreateCustomerData) => Promise<WCCustomer>
customers.get: (id: number) => Promise<WCCustomer>
customers.getByEmail: (email: string) => Promise<WCCustomer | null>
customers.update: (id: number, data: Partial<WCCustomer>) => Promise<WCCustomer>
```

### 导出方式

```typescript
export const wooCommerce = { products, categories, orders, customers };
export { WooCommerceError };
```

### 代码模式

- **认证方式**: Basic Auth — `Buffer.from(WC_KEY:WC_SECRET).toString('base64')`
- **API 基础路径**: `${WC_URL}/wp-json/wc/v3${endpoint}`
- **缓存策略**: 产品/分类 API 使用 `next: { revalidate: 60 }` 或 `300`
- **错误处理**: 非 OK 响应统一抛出 `WooCommerceError`

### ⚠️ Stripe 集成注意事项

- `orders.create()` 和 `orders.update()` 接受 `params` 传递额外查询参数
- `orders.update()` 接受 `Partial<CreateOrderData>`，可用于更新 `transaction_id`、`set_paid` 等
- **所有 API 方法都是服务端使用**，密钥不会暴露给客户端
- 无 `orders.delete()` 方法

---

## 3. 类型定义

**文件**: [`src/types/woocommerce.ts`](src/types/woocommerce.ts)

### 核心接口签名

#### `WCAddress`
```typescript
interface WCAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;    // 仅 billing 地址需要
  phone?: string;    // 仅 billing 地址需要
}
```

#### `WCOrder`
```typescript
interface WCOrder {
  id: number;
  parent_id: number;
  status: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed' | 'trash';
  currency: string;
  version: string;
  prices_include_tax: boolean;
  date_created: string;
  date_modified: string;
  discount_total: string;      // 注意：所有金额字段为 string 类型
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  customer_id: number;
  order_key: string;
  billing: WCAddress;
  shipping: WCAddress;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;       // ⚠️ Stripe 支付 ID 存储在此字段
  customer_ip_address: string;
  customer_user_agent: string;
  created_via: string;
  customer_note: string;
  date_completed: string | null;
  date_paid: string | null;
  cart_hash: string;
  number: string;
  line_items: WCLineItem[];
  shipping_lines: WCShippingLine[];
  fee_lines: Array<unknown>;
  coupon_lines: Array<unknown>;
  refunds: Array<unknown>;
}
```

#### `WCLineItem`
```typescript
interface WCLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;        // ⚠️ string 类型，需要 parseFloat()
  total_tax: string;
  taxes: Array<{ id: number; total: string; subtotal: string }>;
  meta_data: Array<{ id: number; key: string; value: string }>;
  sku: string;
  price: number;
  image: WCImage;
}
```

#### `CreateOrderData`
```typescript
interface CreateOrderData {
  payment_method: string;
  payment_method_title: string;
  set_paid?: boolean;
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
  customer_id?: number;
  customer_note?: string;
  coupon_lines?: Array<{ code: string }>;
}
```

#### `WCProduct`
```typescript
interface WCProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: 'simple' | 'variable' | 'grouped' | 'external';
  status: 'publish' | 'draft' | 'pending' | 'private';
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;              // ⚠️ string 类型
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  stock_quantity: number | null;
  categories: WCCategory[];
  tags: WCTag[];
  images: WCImage[];
  attributes: WCAttribute[];
  variations: number[];
  multi_currency_prices?: WCMultiCurrencyPrices;
  // ... 其他字段
}
```

#### 多币种价格
```typescript
interface WCCurrencyPrice {
  regular_price: string | null;
  sale_price: string | null;
  price: string | null;
}

type WCMultiCurrencyPrices = Record<string, WCCurrencyPrice>;
```

#### JWT 认证类型
```typescript
interface JWTAuthResponse {
  token: string;
  user_email: string;
  user_nicename: string;
  user_display_name: string;
}

interface JWTValidateResponse {
  code: string;
  data: { status: number };
}

interface JWTErrorResponse {
  code: string;
  message: string;
  data: { status: number };
}
```

### ⚠️ Stripe 集成注意事项

- **所有金额字段 (`total`, `shipping_total`, `total_tax` 等) 都是 `string` 类型**，使用时需要 `parseFloat()`
- `transaction_id` 字段可用于存储 Stripe Payment Intent ID
- `payment_method` 字段存储支付方式标识符（如 `'stripe'`）
- `payment_method_title` 是显示用的支付方式名称
- `set_paid` 控制订单是否标记为已支付
- `coupon_lines` 已支持优惠券

---

## 4. 结账页面

**文件**: [`src/app/checkout/page.tsx`](src/app/checkout/page.tsx)

### 页面类型

```typescript
// Client Component — 'use client'
export default function CheckoutPage()
```

### 表单 Schema — `checkoutSchema`

```typescript
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
});
```

### 默认值

```typescript
defaultValues: {
  shippingSameAsBilling: true,
  createAccount: false,
  country: 'US',
  shippingCountry: 'US',
}
```

### `onSubmit` 逻辑

```typescript
const onSubmit = async (data: CheckoutFormData) => {
  setIsSubmitting(true);
  setError(null);

  try {
    // 1. 构建 billing 地址
    const billingAddress: WCAddress = {
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

    // 2. 构建 shipping 地址（可与 billing 相同）
    const shippingAddress = data.shippingSameAsBilling
      ? { ...billingAddress }
      : { /* 使用 shipping 前缀字段 */ };

    // 3. 构建 line_items
    const lineItems = items.map((item) => ({
      product_id: item.productId,
      variation_id: item.variationId || 0,
      quantity: item.quantity,
    }));

    // 4. POST 到 /api/orders
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billing: billingAddress,
        shipping: shippingAddress,
        line_items: lineItems,
        customer_note: data.orderNotes || '',
        create_account: data.createAccount,
        password: data.password,
        currency: currency,     // ⚠️ 当前选中的货币
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create order');
    }

    // 5. 成功后清空购物车并跳转
    clearCart();
    router.push(`/order-confirmation/${result.id}`);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Something went wrong');
  } finally {
    setIsSubmitting(false);
  }
};
```

### 依赖的 Store 和 Hook

```typescript
const items = useCartItems();           // 购物车商品列表
const total = useCartTotal();           // 购物车总金额
const { clearCart } = useCartStore();   // 清空购物车方法
const { user, isAuthenticated } = useAuthStore();  // 用户认证状态
const currency = useCurrencyStore((s) => s.currency);  // 当前货币
```

### UI 组件使用

```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/utils';
```

### ⚠️ Stripe 集成注意事项

- **当前 `onSubmit` 是同步提交表单并等待 API 响应**。Stripe 集成后需要：
  1. 先创建 Payment Intent（服务端 API）
  2. 使用 `@stripe/react-stripe-js` 的 `StripeElement` 收集支付信息
  3. 调用 `stripe.confirmPayment()` 确认支付
  4. 根据支付结果决定是否创建 WooCommerce 订单或更新订单状态
- **支付按钮文本**: 当前显示 `Pay ${formatPrice(total, currency)}`（移动端）和 `Place Order`（桌面端）
- **表单字段不会变化**，Stripe 集成只需在表单底部添加支付元素区域
- **`shippingAddress` 中的 `country` 字段**可用于确定 Stripe 支持的货币

---

## 5. 订单确认页

**文件**: [`src/app/order-confirmation/[id]/page.tsx`](src/app/order-confirmation/[id]/page.tsx)

### 页面类型

```typescript
// Server Component（无 'use client'）
export default async function OrderConfirmationPage({ params }: OrderConfirmationPageProps)

interface OrderConfirmationPageProps {
  params: Promise<{ id: string }>;
}
```

### 订单获取逻辑

```typescript
const { id } = await params;
const orderId = parseInt(id, 10);

if (isNaN(orderId)) {
  notFound();  // Next.js 404
}

let order;
try {
  order = await wooCommerce.orders.get(orderId);
} catch {
  notFound();
}
```

### 渲染结构

1. **成功图标** — 绿色勾号
2. **标题** — "Thank you for your order!"
3. **订单详情卡片**:
   - 订单编号 (`order.number`) 和日期 (`order.date_created`)
   - 已订购商品列表 (`order.line_items`)
   - 金额明细: Subtotal / Shipping / Tax / Total
   - 账单地址 (`order.billing`) 和收货地址 (`order.shipping`)
   - 支付方式 (`order.payment_method_title`)
4. **订单备注** (`order.customer_note`)
5. **操作按钮**: Continue Shopping / View Order History
6. **邮件确认提示**: "A confirmation email has been sent to {email}"

### 关键渲染代码

```typescript
// 金额解析 — 注意所有金额为 string 类型
formatPrice(parseFloat(item.total))
formatPrice(parseFloat(order.shipping_total))
formatPrice(parseFloat(order.total_tax))
formatPrice(parseFloat(order.total))

// Subtotal 计算
order.line_items.reduce((acc, item) => acc + parseFloat(item.total), 0)
```

### ⚠️ Stripe 集成注意事项

- **这是 Server Component**，通过 `wooCommerce.orders.get()` 直接在服务端获取订单
- **如果使用 Stripe，需要额外展示支付状态**（如 "Payment Confirmed" 或 "Payment Pending"）
- `order.payment_method_title` 会自动显示 "Stripe" 或其他支付方式标题
- `order.transaction_id` 可显示 Stripe Payment Intent ID
- `order.status` 决定显示的订单状态

---

## 6. 货币工具

**文件**: [`src/lib/currency.ts`](src/lib/currency.ts)

### 类型签名

```typescript
type SupportedCurrency = 'USD' | 'EUR' | 'GBP';

interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  locale: string;
}

interface ResolvedPrice {
  price: string;
  regularPrice: string;
  salePrice: string;
  onSale: boolean;
  currency: SupportedCurrency;
  currencyConfig: CurrencyConfig;
}
```

### 导出的常量和配置

```typescript
const CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB' },
};

const DEFAULT_CURRENCY: SupportedCurrency = 'USD';
```

### 函数签名

```typescript
// 国家代码 → 货币
countryToCurrency(countryCode: string): SupportedCurrency

// 服务端：从请求头检测国家
detectCountryFromHeaders(headers: Headers): SupportedCurrency | null

// 客户端：从 IP 检测货币
detectCurrencyFromIP(): Promise<SupportedCurrency>

// 产品价格解析（根据多币种价格）
resolveProductPrice(product: WCProduct, currency?: SupportedCurrency): ResolvedPrice
resolveVariationPrice(variation: WCProductVariation, currency?: SupportedCurrency): ResolvedPrice

// 辅助函数
getCurrencySymbol(currency: SupportedCurrency): string
getCurrencyLocale(currency: SupportedCurrency): string
```

### ⚠️ Stripe 集成注意事项

- **Stripe 支持 USD、EUR、GBP**，与项目当前货币完全兼容
- `SupportedCurrency` 类型需要与 Stripe 的货币代码匹配
- `resolveProductPrice()` 返回的 `currency` 字段可直接用于 Stripe 的 `currency` 参数（Stripe 要求小写，需 `.toLowerCase()`）

---

## 7. 购物车 Store

**文件**: [`src/stores/cart-store.ts`](src/stores/cart-store.ts)

### Store 结构

```typescript
// Cart Item 接口
interface CartItem {
  id: string;                        // 唯一 ID: productId-variationId-attributes
  productId: number;
  variationId?: number;
  name: string;
  slug: string;
  price: number;                     // ⚠️ number 类型
  regularPrice?: number;
  quantity: number;
  image: string;
  attributes?: Record<string, string>;
  maxQuantity?: number;
  currency: string;                  // 添加时自动设置当前货币
}

// State
interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

// Actions
interface CartActions {
  addItem: (item: Omit<CartItem, 'id' | 'currency'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

// Computed
interface CartComputedValues {
  total: number;
  subtotal: number;
  itemCount: number;
  isEmpty: boolean;
}

type CartStore = CartState & CartActions & CartComputedValues;
```

### 持久化配置

```typescript
persist({
  name: 'cart-storage',          // localStorage key
  version: 1,
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ items: state.items }),  // 仅持久化 items
})
```

### 选择器 Hook

```typescript
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartIsOpen = () => useCartStore((state) => state.isOpen);
export const useCartTotal = () => {
  const items = useCartStore((state) => state.items);
  return calculateTotals(items).total;
};
export const useCartItemCount = () => {
  const items = useCartStore((state) => state.items);
  return calculateTotals(items).itemCount;
};
export const useCartIsEmpty = () => useCartStore((state) => state.items.length === 0);
```

### 关键模式

- `addItem` 自动从 `useCurrencyStore` 获取当前货币并附加到 `CartItem`
- `generateCartItemId()` 基于 `productId-variationId-attributes` 生成唯一 ID
- `calculateTotals()` 在每次访问时重新计算
- `addItem` 会自动打开购物车抽屉 (`isOpen: true`)

### ⚠️ Stripe 集成注意事项

- **`CartItem.price` 是 number 类型**，在构建 `line_items` 时直接使用
- **`CartItem.currency`** 记录添加时的货币，可用于验证结账时货币一致性
- **购物车不存储税金和运费**，这些由 WooCommerce 在服务端计算
- Stripe 集成后，结账成功需调用 `clearCart()` 清空购物车

---

## 8. 货币 Store

**文件**: [`src/stores/currency-store.ts`](src/stores/currency-store.ts)

### Store 结构

```typescript
interface CurrencyState {
  currency: SupportedCurrency;
  isDetected: boolean;
}

interface CurrencyActions {
  setCurrency: (currency: SupportedCurrency) => void;
  markDetected: () => void;
  resetCurrency: () => void;
}

type CurrencyStore = CurrencyState & CurrencyActions;
```

### 持久化配置

```typescript
persist({
  name: 'currency-storage',
  version: 1,
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    currency: state.currency,
    isDetected: state.isDetected,
  }),
})
```

### 选择器 Hook

```typescript
export const useCurrency = () => useCurrencyStore((state) => state.currency);
export const useIsCurrencyDetected = () => useCurrencyStore((state) => state.isDetected);
export const useSetCurrency = () => useCurrencyStore((state) => state.setCurrency);
```

---

## 9. Providers

**文件**: [`src/components/providers.tsx`](src/components/providers.tsx)

### 结构

```typescript
'use client'

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return <>{children}</>;  // 防止 hydration mismatch
  }

  return (
    <>
      <CurrencyProvider />
      {children}
    </>
  );
}
```

### ⚠️ Stripe 集成注意事项

- **Stripe Provider 需要添加到此处**，如 `<StripeProvider>{children}</StripeProvider>`
- **hydration 保护模式**已建立，Stripe Elements 也需注意 hydration 兼容性
- 需要从 `@stripe/react-stripe-js` 包装 `<Elements>` provider

---

## 10. 工具函数

**文件**: [`src/lib/utils.ts`](src/lib/utils.ts)

### 函数签名

```typescript
// Tailwind CSS 类合并
cn(...inputs: ClassValue[]): string

// 价格格式化
formatPrice(price: number | string, currency?: string, locale?: string): string
// 默认: currency='USD', locale='en-US'

// HTML 清理
stripHtml(html: string): string

// 文本截断
truncate(str: string, length: number): string

// URL 生成
getProductUrl(slug: string): string        // → `/product/${slug}`
getCategoryUrl(slug: string): string       // → `/shop/${slug}`

// 价格范围格式化（可变产品）
formatPriceRange(price: string, currency?: string): string

// 折扣计算
calculateDiscount(regularPrice: string, salePrice: string): number
isOnSale(regularPrice: string, salePrice: string): boolean

// 日期格式化
formatDate(dateString: string, locale?: string): string

// 工具函数
generateId(): string                       // 随机 ID
debounce<T>(func: T, wait: number): void
slugify(str: string): string
parseQueryString(queryString: string): Record<string, string>
buildQueryString(params: Record<string, string | number | boolean | undefined>): string

// 库存状态
getStockStatusLabel(status: string): string
getStockStatusColor(status: string): string
```

### ⚠️ Stripe 集成注意事项

- `formatPrice()` 已支持自定义货币，可直接用于 Stripe 金额显示
- 所有金额显示统一使用此函数，确保格式一致
- **注意**: `formatPrice` 使用 `Intl.NumberFormat`，Stripe 金额（分为单位）需要先除以 100

---

## 11. Button 组件

**文件**: [`src/components/ui/button.tsx`](src/components/ui/button.tsx)

### Props 签名

```typescript
'use client'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;      // ⚠️ 注意：使用 isLoading，不是 loading
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(...)
```

### 变体样式

```typescript
const variants = {
  primary:   'bg-black text-white hover:bg-gray-800',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  outline:   'border border-black bg-transparent text-black hover:bg-black hover:text-white',
  ghost:     'bg-transparent text-gray-700 hover:bg-gray-100',
  link:      'bg-transparent text-black underline-offset-4 hover:underline p-0 h-auto',
};

const sizes = {
  sm:   'h-9 px-4 text-sm',
  md:   'h-11 px-6 text-sm',
  lg:   'h-12 px-8 text-base',
  icon: 'h-10 w-10',
};
```

### 使用示例

```tsx
<Button variant="primary" size="lg" isLoading={isSubmitting}>
  Place Order
</Button>

<Button variant="outline" size="lg">
  Continue Shopping
</Button>
```

---

## 12. 环境变量

**文件**: [`.env.example`](.env.example)

```bash
# WordPress
NEXT_PUBLIC_WORDPRESS_URL=https://cms.msrbuilds.com
NEXT_PUBLIC_GRAPHQL_URL=https://cms.msrbuilds.com/graphql

# WooCommerce REST API
WC_CONSUMER_KEY=ck_xxxxxxxx        # 仅服务端
WC_CONSUMER_SECRET=cs_xxxxxxxx     # 仅服务端

# JWT
JWT_SECRET=your-unique-secret-key-here

# Frontend
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Stripe（已预配置）
STRIPE_SECRET_KEY=sk_test_xxxxxxxx               # 服务端密钥
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxx  # 客户端密钥
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx             # Webhook 签名密钥
```

### ⚠️ Stripe 集成注意事项

- **三个 Stripe 环境变量已预配置在 `.env.example` 中**
- `STRIPE_SECRET_KEY` 和 `STRIPE_WEBHOOK_SECRET` 仅在服务端使用，不带 `NEXT_PUBLIC_` 前缀
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 带 `NEXT_PUBLIC_` 前缀，可暴露给客户端
- **Webhook 端点**需要新增 `src/app/api/stripe/webhook/route.ts`

---

## 13. Next.js 配置

**文件**: [`next.config.ts`](next.config.ts)

### 配置摘要

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',          // Docker 部署

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.wp.com' },
      { protocol: 'https', hostname: '**.wordpress.com' },
      { protocol: 'https', hostname: 'novafabric.shop' },
      { protocol: 'https', hostname: '**.novafabric.shop' },
      { protocol: 'https', hostname: '**.zipwp.top' },
      { protocol: 'http',  hostname: 'localhost' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  env: {
    NEXT_PUBLIC_WORDPRESS_URL,
    NEXT_PUBLIC_GRAPHQL_URL,
    NEXT_PUBLIC_SITE_URL,
  },

  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};
```

### ⚠️ Stripe 集成注意事项

- **无需修改此文件**，Stripe 集成不需要额外的 Next.js 配置
- 如果需要 Stripe Webhook 接收大 payload，`bodySizeLimit: '2mb'` 已足够
- API Routes（`src/app/api/`）自动支持，无需额外配置

---

## 14. 依赖

**文件**: [`package.json`](package.json)

### 关键依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `next` | 16.1.6 | Next.js 框架 |
| `react` / `react-dom` | 19.2.3 | React |
| `react-hook-form` | ^7.71.1 | 表单管理 |
| `@hookform/resolvers` | ^5.2.2 | Zod 表单验证 |
| `zod` | ^4.3.6 | Schema 验证 |
| `zustand` | ^5.0.11 | 状态管理 |
| `framer-motion` | ^12.31.0 | 动画 |
| `date-fns` | ^4.1.0 | 日期处理 |
| `tailwind-merge` / `clsx` | - | CSS 类合并 |
| **`stripe`** | **^22.3.0** | **Stripe Node SDK（已安装）** |
| **`@stripe/stripe-js`** | **^9.8.0** | **Stripe JS SDK（已安装）** |

### ⚠️ Stripe 集成注意事项

- **`stripe` 和 `@stripe/stripe-js` 两个包已安装**，无需再安装
- **缺少**: `@stripe/react-stripe-js`（React 组件库，用于在前端渲染 Stripe Elements）
  - 需要安装: `npm install @stripe/react-stripe-js`
- Zod v4 和 React Hook Form v7 均已就绪，可用于支付表单验证

---

## 汇总：Stripe 集成兼容性要点

### 字段命名对照

| 项目字段 | WooCommerce 字段 | Stripe 等价物 |
|----------|------------------|---------------|
| 订单 ID | `order.id` | PaymentIntent ID (`pi_xxx`) |
| 交易 ID | `order.transaction_id` | `pi_xxx` |
| 支付方式 | `order.payment_method` | `'stripe'` |
| 支付标题 | `order.payment_method_title` | `'Credit/Debit Card (Stripe)'` |
| 支付状态 | `order.set_paid` / `order.status` | `payment_status` |
| 货币 | `order.currency` | `currency` (小写) |
| 总金额 | `order.total` (string) | `amount` (整数，分为单位) |

### 集成改造要点

1. **新增文件**:
   - `src/app/api/stripe/create-payment-intent/route.ts` — 创建 Payment Intent
   - `src/app/api/stripe/webhook/route.ts` — 接收支付结果
   - `src/components/stripe/stripe-provider.tsx` — Stripe Elements Provider
   - `src/components/stripe/payment-form.tsx` — 支付表单组件

2. **修改文件**:
   - `src/app/checkout/page.tsx` — 在表单底部添加 Stripe Elements 区域
   - `src/components/providers.tsx` — 包装 Stripe Elements Provider
   - `src/app/api/orders/route.ts` — 支持 Stripe 支付方式和 transaction_id
   - `src/app/order-confirmation/[id]/page.tsx` — 展示支付状态

3. **金额转换**: Stripe 要求整数（分），需要 `Math.round(amount * 100)`
4. **货币代码**: Stripe 要求小写，使用 `currency.toLowerCase()`

---

*报告生成时间: 2026-06-25*
