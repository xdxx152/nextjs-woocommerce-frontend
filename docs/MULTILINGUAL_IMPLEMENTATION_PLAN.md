# 多语言（i18n）实施方案文档

> **项目名称**: NovaFabric Headless — nextjs-woocommerce-frontend
> **文档版本**: v1.0
> **创建日期**: 2026-06-28
> **适用框架**: Next.js 16 App Router + React 19

---

## 目录

1. [概述](#1-概述)
2. [技术方案对比](#2-技术方案对比)
3. [next-intl 集成步骤（详细）](#3-next-intl-集成步骤详细)
   - [3.1 安装依赖](#31-安装依赖)
   - [3.2 目录结构调整](#32-目录结构调整)
   - [3.3 配置文件](#33-配置文件)
   - [3.4 翻译文件结构](#34-翻译文件结构)
   - [3.5 组件改造指南](#35-组件改造指南)
   - [3.6 WordPress 内容多语言](#36-wordpress-内容多语言)
   - [3.7 SEO 处理](#37-seo-处理)
4. [改造工作量和难度评估](#4-改造工作量和难度评估)
5. [实施路线图](#5-实施路线图)
6. [潜在风险](#6-潜在风险)
7. [结论和建议](#7-结论和建议)

---

## 1. 概述

### 1.1 项目背景

[`nextjs-woocommerce-frontend`](/) 是一个基于 Next.js 16 App Router 构建的 headless WooCommerce 电商前端项目。当前项目状态如下：

| 维度 | 现状 |
|------|------|
| **UI 文案** | 所有组件中的导航文字、按钮文字、表单标签、错误提示等均为英文硬编码 |
| **动态内容** | 产品、分类、页面内容通过 WPGraphQL 从 WordPress 获取；订单、用户通过 WooCommerce REST API 获取 |
| **路由** | 无语言前缀（如 `/shop`、`/product/[slug]`、`/cart`）|
| **i18n 依赖** | 无任何国际化相关依赖 |
| **状态管理** | Zustand 管理购物车、认证、货币、UI 状态，持久化到 localStorage |
| **表单** | React Hook Form + Zod，验证消息硬编码为英文 |
| **SEO** | Next.js [`metadata`](/src/app/layout.tsx:24) API，title/description 硬编码为英文 |

### 1.2 多语言需求范围

本项目计划支持 **中文（简体）** 和 **英文** 两种语言，涉及以下领域：

| 范围 | 内容类型 | 说明 |
|------|---------|------|
| **静态 UI 文案** | 导航、按钮、标签、提示、错误信息 | 通过翻译文件（JSON）管理 |
| **动态业务内容** | 产品名称/描述、分类名称、页面内容 | 通过 WordPress 多语言插件提供 |
| **表单验证消息** | Zod schema 错误提示 | 本地化翻译 |
| **价格/日期格式** | 货币格式、日期格式 | 使用 `Intl.NumberFormat` / `Intl.DateTimeFormat` |
| **SEO 元数据** | 页面标题、描述、OpenGraph | 按语言生成 |
| **URL 结构** | 路由前缀 | `/en/shop`、`/zh/shop` |

### 1.3 推荐方案：next-intl

**核心推荐理由：**

- **Next.js 官方推荐**：由 Vercel 团队维护，与 App Router 深度集成
- **Server Components 原生支持**：无需 `'use client'` 即可在服务端使用翻译
- **轻量化**：tree-shaking 友好，无额外运行时开销
- **内置路由/中间件支持**：提供完整的 [`middleware.ts`](#33-配置文件) 和路由配置方案
- **ICU 消息格式**：支持复数、性别、选择等复杂翻译场景
- **良好的 TypeScript 支持**：提供类型安全的翻译 key 推断

---

## 2. 技术方案对比

### 2.1 方案对比总览

| 维度 | next-intl ✅ | next-i18next | 自建 i18n 方案 |
|------|-------------|-------------|---------------|
| **维护方** | Vercel（Amannn） | community（isaachinman） | 项目团队自行维护 |
| **App Router 支持** | ✅ 原生（Server & Client） | ⚠️ 需额外配置（pages router 为主） | ❌ 需完全自行实现 |
| **Server Components** | ✅ 完美支持 | ❌ 不支持 | ❌ 需要自己处理 |
| **Bundle Size** | ~3KB gzipped | ~30KB gzipped（含 i18next 核心） | 取决于实现 |
| **学习曲线** | 低 | 中 | 高 |
| **TypeScript 支持** | ✅ 完整的类型推断 | ⚠️ 部分支持 | ❌ 需要自行编写类型 |
| **ICU 消息格式** | ✅ 原生支持 | ⚠️ 需要 i18next ICU 插件 | 需要自行实现 |
| **社区生态** | 快速增长，Next.js 官方生态 | 成熟但逐渐边缘化 | 无生态 |
| **Active maintenance** | ✅ 活跃（周更） | ⚠️ 维护频率低 | N/A |

### 2.2 详细分析

#### next-intl（推荐）⭐

**优点：**
- 与 Next.js App Router 的 `layout.tsx`、`page.tsx`、`generateMetadata` 无缝集成
- 在 Server Components 中可以直接使用 [`useTranslations()`](/src/i18n/request.ts) 而无需客户端 JavaScript
- 内置导航 API（`Link`、`useRouter`、`redirect`）自动处理语言前缀
- 通过 `next-intl/plugin` 提供零配置集成，无需手动修改 webpack
- 支持按需加载翻译文件（每个语言只加载自己的翻译）

**缺点：**
- 相对较新（但已稳定，v4 版本成熟）
- 不支持嵌套翻译 key（所有 key 以 `.` 分隔的扁平结构）
- 社区资源相对 i18next 较少

#### next-i18next

**优点：**
- 成熟的社区和丰富的文档
- 支持嵌套翻译 key 结构
- 丰富的 i18next 生态插件

**缺点：**
- 主要为 Pages Router 设计，App Router 支持不完善
- 在 Server Components 中使用需要额外的 `serverSideTranslations` 配置
- 较大的 bundle 体积
- 维护活跃度下降

#### 自建 i18n 方案

**优点：**
- 完全控制实现细节
- 无第三方依赖
- 可以完美适配项目特定需求

**缺点：**
- 需要实现：翻译加载、语言检测、路由前缀、Server/Client 兼容、ICU 格式化等
- 长期维护成本高
- 需要自行处理边缘情况（SSR hydration、缓存等）
- 时间成本远超使用成熟方案

### 2.3 推荐结论

> **选择 next-intl**。理由如下：
> 1. 本项目完全使用 Next.js App Router，next-intl 是唯一原生支持该架构的方案
> 2. 项目有大量 Server Components，next-intl 可以在不增加客户端 JS 的前提下实现翻译
> 3. 轻量级、活跃维护、Vercel 官方背书
> 4. 提供完整的 TypeScript 类型安全保障

---

## 3. next-intl 集成步骤（详细）

### 3.1 安装依赖

```bash
npm install next-intl
```

next-intl v4+ 版本支持 Next.js 14+，完全兼容当前项目的 Next.js 16。

> **注意**：无需安装其他 i18n 相关依赖。next-intl 内置了：ICU 消息格式化、日期/数字格式化、路由处理等功能。

### 3.2 目录结构调整

#### 当前结构（需改造）

```
src/app/
├── [slug]/
├── account/
├── api/
├── cart/
├── checkout/
├── contact/
├── order-confirmation/
├── product/
├── shop/
├── layout.tsx
└── page.tsx
```

#### 目标结构

```
src/
├── messages/                   # 翻译文件
│   ├── en.json                 # 英文翻译
│   └── zh.json                 # 中文翻译
├── i18n/
│   ├── request.ts              # next-intl 服务端配置
│   └── routing.ts              # 路由和语言配置
├── app/
│   └── [locale]/               # 语言前缀（en/zh）
│       ├── [slug]/
│       │   └── page.tsx        # 通用内容页
│       ├── account/
│       │   ├── page.tsx        # 账户概览
│       │   ├── addresses/
│       │   ├── details/
│       │   ├── forgot-password/
│       │   ├── login/
│       │   ├── orders/
│       │   ├── register/
│       │   └── ...
│       ├── api/                # API 路由（保持不变）
│       ├── cart/
│       │   └── page.tsx
│       ├── checkout/
│       │   └── page.tsx
│       ├── contact/
│       │   └── page.tsx
│       ├── order-confirmation/
│       ├── product/
│       ├── shop/
│       ├── layout.tsx          # 根布局（含语言参数）
│       └── page.tsx            # 首页
├── middleware.ts               # 语言检测和重定向（新建）
└── components/                 # 组件保持不变，仅内部使用 useTranslations
    ├── layout/
    │   ├── header.tsx
    │   └── footer.tsx
    └── ...
```

**关键变化说明：**

| 变化 | 说明 |
|------|------|
| [`src/app/[locale]/`](/src/app/) | 新增 `[locale]` 动态路由段作为所有页面的根 |
| [`src/i18n/`](/src/i18n/) | 新建目录，存放 next-intl 配置 |
| [`src/messages/`](/src/messages/) | 新建目录，存放 JSON 翻译文件 |
| [`src/middleware.ts`](/src/middleware.ts) | 新建中间件，处理语言检测和重定向 |
| [`src/app/api/`](/src/app/api/) | API 路由**不需要**放在 `[locale]` 下 |

> **API 路由说明**：`src/app/api/` 下的 API 路由应保持在与 `[locale]` 同级的目录中，不受语言前缀影响。原因是 API 请求通常通过 `Accept-Language` header 或请求参数来确定语言，而不是 URL 路径。

### 3.3 配置文件

#### 3.3.1 `i18n/routing.ts` — 语言和路由配置

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // 支持的语言列表
  locales: ['en', 'zh'],

  // 默认语言
  defaultLocale: 'en',

  // 语言检测策略
  localeDetection: true,

  // 默认语言的 URL 前缀策略
  // 'always' - 始终显示语言前缀 (/en/shop, /zh/shop)
  // 'as-needed' - 默认语言不显示前缀 (/shop), 其他语言显示 (/zh/shop)
  // 'never' - 不显示语言前缀
  localePrefix: 'always',

  // 语言域名映射（可选，用于多域名部署）
  // localeDomains: {
  //   zh: 'zh.novafabric.shop',
  // },
});
```

> **关于 `localePrefix` 的建议**：推荐使用 `'always'` 策略，原因如下：
> - 所有语言 URL 结构一致，对 SEO 更友好
> - 避免重定向逻辑复杂化
> - 服务端渲染时无需额外判断
> - Google 推荐使用不同的 URL 来处理多语言内容

#### 3.3.2 `i18n/request.ts` — next-intl 服务端配置

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // 获取请求的语言
  let locale = await requestLocale;

  // 确保语言在支持列表中
  if (!locale || !routing.locales.includes(locale)) {
    locale = routing.defaultLocale;
  }

  // 加载对应的翻译文件
  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    // 时区配置（可选，用于日期格式化）
    timeZone: 'Asia/Shanghai',
    // 当翻译 key 缺失时的处理策略
    onError: (error) => {
      console.error('Translation error:', error);
    },
    // 获取未找到的翻译 key 时的回调
    getMessageFallback: ({ key, namespace }) => {
      return `${namespace || 'global'}.${key}`;
    },
  };
});
```

#### 3.3.3 `middleware.ts` — 语言检测和重定向中间件

```typescript
// src/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// 创建 next-intl 中间件
export default createMiddleware(routing);

// 配置中间件匹配的路由
export const config = {
  // 匹配所有路由，排除 API、静态资源和 Next.js 内部路径
  matcher: [
    // 匹配所有路由，除了：
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // 同时匹配根路径
    '/',
  ],
};
```

**中间件功能说明：**

| 功能 | 描述 |
|------|------|
| **自动语言检测** | 基于 `Accept-Language` header、cookie、默认语言自动检测用户首选语言 |
| **重定向** | 访问 `/shop` 自动重定向到 `/en/shop` 或 `/zh/shop` |
| **Cookie 持久化** | 用户切换语言后，中间件将语言偏好写入 cookie，后续请求自动使用该语言 |
| **SEO 友好** | 服务端渲染时正确设置 `html[lang]` 属性 |

#### 3.3.4 `next.config.ts` 修改

```typescript
// next.config.ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// next-intl 插件配置
const withNextIntl = createNextIntlPlugin(
  // 指定 i18n 请求配置文件的路径
  './src/i18n/request.ts'
);

const nextConfig: NextConfig = {
  // 保持原有配置不变
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.wp.com',
      },
      {
        protocol: 'https',
        hostname: '**.wordpress.com',
      },
      {
        protocol: 'https',
        hostname: 'wd.novafabric.shop',
      },
      {
        protocol: 'https',
        hostname: '**.wd.novafabric.shop',
      },
      {
        protocol: 'https',
        hostname: '**.zipwp.top',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  env: {
    NEXT_PUBLIC_WORDPRESS_URL: process.env.NEXT_PUBLIC_WORDPRESS_URL,
    NEXT_PUBLIC_GRAPHQL_URL: process.env.NEXT_PUBLIC_GRAPHQL_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default withNextIntl(nextConfig);
```

#### 3.3.5 `src/app/[locale]/layout.tsx` — 语言感知的根布局

```typescript
// src/app/[locale]/layout.tsx
import type { Metadata } from 'next';
import { Inter, Syne } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import '@/app/globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { Providers } from '@/components/providers';
import { notFound } from 'next/navigation';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const syne = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
  weight: ['400', '500', '600', '700', '800'],
});

// 为每种语言生成不同的 metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });

  return {
    title: {
      default: t('siteTitle'),
      template: t('titleTemplate'),
    },
    description: t('siteDescription'),
    keywords: t('keywords').split(','),
    authors: [{ name: 'NovaFabric' }],
    openGraph: {
      type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      siteName: t('siteName'),
    },
    twitter: {
      card: 'summary_large_image',
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: '/favicon.svg',
    },
    // 多语言 alternate links
    alternates: {
      canonical: `https://novafabric.shop/${locale}`,
      languages: {
        en: 'https://novafabric.shop/en',
        zh: 'https://novafabric.shop/zh',
      },
    },
  };
}

// 验证 locale 参数是否有效
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 验证 locale 是否有效
  if (!routing.locales.includes(locale)) {
    notFound();
  }

  // 加载翻译消息
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${syne.variable}`}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <CartDrawer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

#### 3.3.6 页面路由迁移示例

以首页 [`/src/app/page.tsx`](/src/app/page.tsx) 为例：

```typescript
// src/app/[locale]/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('home');

  return (
    <div>
      <h1>{t('heroTitle')}</h1>
      <p>{t('heroSubtitle')}</p>
      {/* 其余组件保持不变 */}
    </div>
  );
}
```

---

### 3.4 翻译文件结构

#### 3.4.1 翻译 Key 命名规范

采用 **按模块命名空间的扁平结构**，格式为 `模块.子模块.具体描述`：

```
navigation.home
product.addToCart
cart.empty.title
checkout.form.email.label
account.login.title
validation.required
```

#### 3.4.2 `messages/en.json` — 英文翻译

```json
{
  "navigation": {
    "home": "Home",
    "shop": "Shop",
    "products": "Products",
    "about": "About",
    "contact": "Contact",
    "cart": "Cart",
    "account": "My Account",
    "orders": "My Orders",
    "login": "Sign In",
    "register": "Create Account",
    "logout": "Sign Out",
    "search": "Search products...",
    "wishlist": "Wishlist"
  },

  "product": {
    "addToCart": "Add to Cart",
    "addToCartLoading": "Adding...",
    "viewDetails": "View Details",
    "outOfStock": "Out of Stock",
    "inStock": "In Stock",
    "sale": "Sale",
    "quantity": "Quantity",
    "description": "Description",
    "additionalInfo": "Additional Information",
    "reviews": "Reviews",
    "relatedProducts": "Related Products",
    "youMayAlsoLike": "You May Also Like",
    "categories": "Categories",
    "tags": "Tags",
    "sku": "SKU",
    "selectOptions": "Please select all options",
    "priceFrom": "From {price}"
  },

  "cart": {
    "title": "Shopping Bag",
    "empty": {
      "title": "Your bag is empty",
      "description": "Looks like you haven't added anything yet. Start shopping and fill it up!",
      "shopLink": "Continue Shopping"
    },
    "subtotal": "Subtotal",
    "total": "Total",
    "shipping": "Shipping",
    "calculatedAtCheckout": "Calculated at checkout",
    "checkout": "Checkout",
    "viewCart": "View Cart",
    "removeItem": "Remove",
    "updateQuantity": "Update",
    "summary": "Order Summary",
    "discount": "Discount",
    "couponCode": "Coupon Code",
    "applyCoupon": "Apply",
    "free": "Free",
    "itemCount": "{count, plural, =0 {0 items} one {# item} other {# items}}"
  },

  "checkout": {
    "title": "Checkout",
    "returnToCart": "Return to Cart",
    "step": {
      "information": "Information",
      "shipping": "Shipping",
      "payment": "Payment"
    },
    "form": {
      "email": {
        "label": "Email address",
        "placeholder": "your@email.com",
        "error": "Please enter a valid email"
      },
      "firstName": {
        "label": "First name",
        "placeholder": "John",
        "error": "First name is required"
      },
      "lastName": {
        "label": "Last name",
        "placeholder": "Doe",
        "error": "Last name is required"
      },
      "phone": {
        "label": "Phone number",
        "placeholder": "+1 (555) 000-0000",
        "error": "Phone number is required"
      },
      "address1": {
        "label": "Address",
        "placeholder": "123 Main St",
        "error": "Address is required"
      },
      "address2": {
        "label": "Apartment, suite, etc. (optional)",
        "placeholder": "Apt 4B"
      },
      "city": {
        "label": "City",
        "placeholder": "New York",
        "error": "City is required"
      },
      "state": {
        "label": "State / Province",
        "placeholder": "NY",
        "error": "State is required"
      },
      "postcode": {
        "label": "Postal code",
        "placeholder": "10001",
        "error": "Postal code is required"
      },
      "country": {
        "label": "Country / Region",
        "placeholder": "Select a country",
        "error": "Country is required"
      },
      "orderNotes": {
        "label": "Order notes (optional)",
        "placeholder": "Special instructions for your order"
      },
      "createAccount": "Create an account?",
      "password": {
        "label": "Account password",
        "error": "Password is required"
      },
      "shippingSameAsBilling": "Shipping address same as billing"
    },
    "payment": {
      "title": "Payment Method",
      "stripe": "Credit Card (Stripe)",
      "paypal": "PayPal",
      "bacs": "Bank Transfer",
      "cod": "Cash on Delivery",
      "placeOrder": "Place Order",
      "processing": "Processing..."
    },
    "shipping": {
      "title": "Shipping Method",
      "freeShipping": "Free Shipping",
      "flatRate": "Flat Rate"
    },
    "error": {
      "general": "An error occurred. Please try again.",
      "paymentFailed": "Payment failed. Please try again.",
      "invalidCoupon": "Invalid coupon code.",
      "expiredSession": "Your session has expired. Please refresh the page."
    },
    "success": {
      "title": "Order Confirmed!",
      "message": "Thank you for your order. We'll send you a confirmation email shortly.",
      "orderNumber": "Order number",
      "viewOrder": "View Order"
    }
  },

  "account": {
    "login": {
      "title": "Sign In",
      "subtitle": "Welcome back! Sign in to your account.",
      "emailLabel": "Email or username",
      "emailError": "Email or username is required",
      "passwordLabel": "Password",
      "passwordError": "Password is required",
      "submit": "Sign In",
      "forgotPassword": "Forgot password?",
      "noAccount": "Don't have an account?",
      "registerLink": "Create one",
      "error": "Login failed. Please try again.",
      "rememberMe": "Remember me"
    },
    "register": {
      "title": "Create Account",
      "subtitle": "Join us and start shopping today.",
      "emailLabel": "Email address",
      "emailError": "Please enter a valid email",
      "passwordLabel": "Password",
      "passwordError": "Password must be at least 8 characters",
      "confirmPassword": "Confirm password",
      "confirmPasswordError": "Passwords do not match",
      "submit": "Create Account",
      "hasAccount": "Already have an account?",
      "loginLink": "Sign in",
      "success": "Account created successfully!",
      "error": "Registration failed. Please try again."
    },
    "forgotPassword": {
      "title": "Forgot Password",
      "subtitle": "Enter your email and we'll send you a reset link.",
      "emailLabel": "Email address",
      "submit": "Send Reset Link",
      "success": "Reset link sent! Check your email.",
      "backToLogin": "Back to Sign In",
      "error": "Failed to send reset link. Please try again."
    },
    "dashboard": {
      "title": "My Account",
      "welcome": "Welcome back, {name}!",
      "navOverview": "Overview",
      "navOrders": "Orders",
      "navAddresses": "Addresses",
      "navDetails": "Account Details",
      "navLogout": "Sign Out",
      "recentOrders": "Recent Orders",
      "noOrders": "No orders yet.",
      "viewAllOrders": "View All Orders"
    },
    "orders": {
      "title": "My Orders",
      "orderNumber": "Order #{number}",
      "date": "Date",
      "status": "Status",
      "total": "Total",
      "items": "Items",
      "viewDetails": "View Details",
      "noOrders": "No orders found.",
      "statusLabels": {
        "pending": "Pending",
        "processing": "Processing",
        "on-hold": "On Hold",
        "completed": "Completed",
        "cancelled": "Cancelled",
        "refunded": "Refunded",
        "failed": "Failed"
      }
    },
    "addresses": {
      "title": "My Addresses",
      "billing": "Billing Address",
      "shipping": "Shipping Address",
      "edit": "Edit",
      "addNew": "Add New Address",
      "save": "Save Address",
      "noBilling": "No billing address set.",
      "noShipping": "No shipping address set.",
      "success": "Address updated successfully!",
      "error": "Failed to update address."
    },
    "details": {
      "title": "Account Details",
      "firstName": "First name",
      "lastName": "Last name",
      "email": "Email",
      "currentPassword": "Current password",
      "newPassword": "New password",
      "confirmPassword": "Confirm new password",
      "save": "Save Changes",
      "success": "Account updated successfully!",
      "error": "Failed to update account.",
      "passwordNote": "Leave blank to keep current password."
    }
  },

  "footer": {
    "companyDescription": "Premium fashion and apparel for the modern individual.",
    "quickLinks": "Quick Links",
    "customerService": "Customer Service",
    "followUs": "Follow Us",
    "newsletter": "Newsletter",
    "newsletterPlaceholder": "Enter your email",
    "newsletterButton": "Subscribe",
    "privacyPolicy": "Privacy Policy",
    "termsOfService": "Terms of Service",
    "shippingReturns": "Shipping & Returns",
    "faq": "FAQ",
    "copyright": "© {year} NovaFabric. All rights reserved.",
    "madeWith": "Made with care"
  },

  "contact": {
    "title": "Contact Us",
    "subtitle": "We'd love to hear from you.",
    "form": {
      "name": "Your name",
      "email": "Your email",
      "subject": "Subject",
      "message": "Message",
      "submit": "Send Message",
      "success": "Message sent! We'll get back to you soon.",
      "error": "Failed to send message. Please try again."
    },
    "info": {
      "email": "Email",
      "phone": "Phone",
      "address": "Address"
    }
  },

  "shop": {
    "title": "Shop",
    "filter": "Filter",
    "sortBy": "Sort by",
    "sortOptions": {
      "date": "Newest",
      "price_asc": "Price: Low to High",
      "price_desc": "Price: High to Low",
      "popularity": "Most Popular",
      "rating": "Top Rated"
    },
    "noProducts": "No products found.",
    "loadMore": "Load More",
    "viewAs": "View as",
    "grid": "Grid",
    "list": "List",
    "category": "Category",
    "allCategories": "All Categories",
    "priceRange": "Price Range",
    "clearFilters": "Clear All Filters",
    "results": "{count} products found",
    "soldOut": "Sold Out",
    "onSale": "On Sale"
  },

  "common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Try Again",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close",
    "back": "Back",
    "next": "Next",
    "skip": "Skip",
    "search": "Search",
    "noResults": "No results found",
    "share": "Share",
    "copy": "Copy",
    "copied": "Copied!",
    "viewAll": "View All",
    "showMore": "Show More",
    "showLess": "Show Less",
    "optional": "Optional",
    "required": "Required",
    "page": "Page",
    "of": "of",
    "itemsPerPage": "Items per page"
  },

  "validation": {
    "required": "This field is required",
    "email": "Please enter a valid email address",
    "minLength": "Must be at least {length} characters",
    "maxLength": "Must be at most {length} characters",
    "passwordMatch": "Passwords do not match",
    "passwordMin": "Password must be at least 8 characters",
    "invalidUrl": "Please enter a valid URL",
    "invalidPhone": "Please enter a valid phone number",
    "invalidPostcode": "Please enter a valid postal code",
    "numericOnly": "Please enter numbers only",
    "positiveNumber": "Please enter a positive number",
    "requiredSelect": "Please select an option"
  },

  "seo": {
    "siteTitle": "NovaFabric — Premium Apparel, Redefined",
    "titleTemplate": "NovaFabric — %s",
    "siteDescription": "Discover the latest fashion trends. Shop new arrivals in men's clothing, accessories, and more.",
    "keywords": "fashion,clothing,accessories,online store,ecommerce",
    "siteName": "NovaFabric"
  },

  "errors": {
    "notFound": {
      "title": "Page Not Found",
      "description": "The page you're looking for doesn't exist or has been moved.",
      "backHome": "Back to Home"
    },
    "serverError": {
      "title": "Server Error",
      "description": "Something went wrong on our end. Please try again later."
    },
    "networkError": "Network error. Please check your connection.",
    "sessionExpired": "Your session has expired. Please sign in again.",
    "unauthorized": "You need to sign in to access this page.",
    "forbidden": "You don't have permission to access this page."
  }
}
```

#### 3.4.3 `messages/zh.json` — 中文翻译

```json
{
  "navigation": {
    "home": "首页",
    "shop": "商店",
    "products": "全部商品",
    "about": "关于我们",
    "contact": "联系我们",
    "cart": "购物车",
    "account": "我的账户",
    "orders": "我的订单",
    "login": "登录",
    "register": "注册",
    "logout": "退出登录",
    "search": "搜索商品...",
    "wishlist": "收藏夹"
  },

  "product": {
    "addToCart": "加入购物车",
    "addToCartLoading": "正在添加...",
    "viewDetails": "查看详情",
    "outOfStock": "缺货",
    "inStock": "有货",
    "sale": "促销",
    "quantity": "数量",
    "description": "商品描述",
    "additionalInfo": "附加信息",
    "reviews": "用户评价",
    "relatedProducts": "相关商品",
    "youMayAlsoLike": "猜你喜欢",
    "categories": "分类",
    "tags": "标签",
    "sku": "商品编号",
    "selectOptions": "请选择所有选项",
    "priceFrom": "起价 {price}"
  },

  "cart": {
    "title": "购物袋",
    "empty": {
      "title": "购物袋是空的",
      "description": "您还没有添加任何商品，快去逛逛吧！",
      "shopLink": "继续购物"
    },
    "subtotal": "小计",
    "total": "合计",
    "shipping": "运费",
    "calculatedAtCheckout": "结算时计算",
    "checkout": "去结算",
    "viewCart": "查看购物车",
    "removeItem": "移除",
    "updateQuantity": "更新",
    "summary": "订单摘要",
    "discount": "优惠",
    "couponCode": "优惠券码",
    "applyCoupon": "使用",
    "free": "免费",
    "itemCount": "{count, plural, =0 {0 件商品} one {# 件商品} other {# 件商品}}"
  },

  "checkout": {
    "title": "结算",
    "returnToCart": "返回购物车",
    "step": {
      "information": "信息",
      "shipping": "配送",
      "payment": "支付"
    },
    "form": {
      "email": {
        "label": "邮箱地址",
        "placeholder": "your@email.com",
        "error": "请输入有效的邮箱地址"
      },
      "firstName": {
        "label": "名字",
        "placeholder": "三",
        "error": "请输入名字"
      },
      "lastName": {
        "label": "姓氏",
        "placeholder": "张",
        "error": "请输入姓氏"
      },
      "phone": {
        "label": "手机号码",
        "placeholder": "138-0000-0000",
        "error": "请输入手机号码"
      },
      "address1": {
        "label": "详细地址",
        "placeholder": "朝阳区建国路88号",
        "error": "请输入详细地址"
      },
      "address2": {
        "label": "公寓、单元号等（选填）",
        "placeholder": "A座 1208室"
      },
      "city": {
        "label": "城市",
        "placeholder": "北京市",
        "error": "请输入城市"
      },
      "state": {
        "label": "省/州",
        "placeholder": "北京市",
        "error": "请输入省/州"
      },
      "postcode": {
        "label": "邮政编码",
        "placeholder": "100000",
        "error": "请输入邮政编码"
      },
      "country": {
        "label": "国家/地区",
        "placeholder": "请选择国家",
        "error": "请选择国家"
      },
      "orderNotes": {
        "label": "订单备注（选填）",
        "placeholder": "如有特殊要求请在此说明"
      },
      "createAccount": "创建账号？",
      "password": {
        "label": "账号密码",
        "error": "请输入密码"
      },
      "shippingSameAsBilling": "配送地址与账单地址相同"
    },
    "payment": {
      "title": "支付方式",
      "stripe": "信用卡支付（Stripe）",
      "paypal": "PayPal 支付",
      "bacs": "银行转账",
      "cod": "货到付款",
      "placeOrder": "提交订单",
      "processing": "正在处理..."
    },
    "shipping": {
      "title": "配送方式",
      "freeShipping": "免费配送",
      "flatRate": "统一运费"
    },
    "error": {
      "general": "发生错误，请重试。",
      "paymentFailed": "支付失败，请重试。",
      "invalidCoupon": "优惠券码无效。",
      "expiredSession": "会话已过期，请刷新页面。"
    },
    "success": {
      "title": "订单已确认！",
      "message": "感谢您的订单，我们将尽快为您发货。确认邮件将发送至您的邮箱。",
      "orderNumber": "订单号",
      "viewOrder": "查看订单"
    }
  },

  "account": {
    "login": {
      "title": "登录",
      "subtitle": "欢迎回来！登录您的账号。",
      "emailLabel": "邮箱或用户名",
      "emailError": "请输入邮箱或用户名",
      "passwordLabel": "密码",
      "passwordError": "请输入密码",
      "submit": "登录",
      "forgotPassword": "忘记密码？",
      "noAccount": "还没有账号？",
      "registerLink": "立即注册",
      "error": "登录失败，请重试。",
      "rememberMe": "记住我"
    },
    "register": {
      "title": "注册账号",
      "subtitle": "加入我们，开始购物之旅。",
      "emailLabel": "邮箱地址",
      "emailError": "请输入有效的邮箱地址",
      "passwordLabel": "密码",
      "passwordError": "密码至少需要8个字符",
      "confirmPassword": "确认密码",
      "confirmPasswordError": "两次密码输入不一致",
      "submit": "注册",
      "hasAccount": "已有账号？",
      "loginLink": "去登录",
      "success": "账号注册成功！",
      "error": "注册失败，请重试。"
    },
    "forgotPassword": {
      "title": "忘记密码",
      "subtitle": "输入您的邮箱，我们将发送重置链接。",
      "emailLabel": "邮箱地址",
      "submit": "发送重置链接",
      "success": "重置链接已发送！请查看您的邮箱。",
      "backToLogin": "返回登录",
      "error": "发送重置链接失败，请重试。"
    },
    "dashboard": {
      "title": "我的账户",
      "welcome": "欢迎回来，{name}！",
      "navOverview": "概览",
      "navOrders": "我的订单",
      "navAddresses": "收货地址",
      "navDetails": "账户信息",
      "navLogout": "退出登录",
      "recentOrders": "最近订单",
      "noOrders": "暂无订单。",
      "viewAllOrders": "查看全部订单"
    },
    "orders": {
      "title": "我的订单",
      "orderNumber": "订单 #{number}",
      "date": "日期",
      "status": "状态",
      "total": "金额",
      "items": "商品",
      "viewDetails": "查看详情",
      "noOrders": "暂无订单。",
      "statusLabels": {
        "pending": "待付款",
        "processing": "处理中",
        "on-hold": "待确认",
        "completed": "已完成",
        "cancelled": "已取消",
        "refunded": "已退款",
        "failed": "失败"
      }
    },
    "addresses": {
      "title": "收货地址",
      "billing": "账单地址",
      "shipping": "配送地址",
      "edit": "编辑",
      "addNew": "新增地址",
      "save": "保存地址",
      "noBilling": "未设置账单地址。",
      "noShipping": "未设置配送地址。",
      "success": "地址更新成功！",
      "error": "地址更新失败。"
    },
    "details": {
      "title": "账户信息",
      "firstName": "名字",
      "lastName": "姓氏",
      "email": "邮箱",
      "currentPassword": "当前密码",
      "newPassword": "新密码",
      "confirmPassword": "确认新密码",
      "save": "保存修改",
      "success": "账户更新成功！",
      "error": "账户更新失败。",
      "passwordNote": "不修改密码请留空。"
    }
  },

  "footer": {
    "companyDescription": "为现代人打造的高级时尚服饰品牌。",
    "quickLinks": "快速链接",
    "customerService": "客户服务",
    "followUs": "关注我们",
    "newsletter": "订阅资讯",
    "newsletterPlaceholder": "输入您的邮箱",
    "newsletterButton": "订阅",
    "privacyPolicy": "隐私政策",
    "termsOfService": "服务条款",
    "shippingReturns": "配送与退货",
    "faq": "常见问题",
    "copyright": "© {year} NovaFabric。保留所有权利。",
    "madeWith": "用心制造"
  },

  "contact": {
    "title": "联系我们",
    "subtitle": "我们期待您的来信。",
    "form": {
      "name": "您的姓名",
      "email": "您的邮箱",
      "subject": "主题",
      "message": "留言内容",
      "submit": "发送消息",
      "success": "消息已发送！我们会尽快回复您。",
      "error": "消息发送失败，请重试。"
    },
    "info": {
      "email": "邮箱",
      "phone": "电话",
      "address": "地址"
    }
  },

  "shop": {
    "title": "全部商品",
    "filter": "筛选",
    "sortBy": "排序方式",
    "sortOptions": {
      "date": "最新上架",
      "price_asc": "价格：从低到高",
      "price_desc": "价格：从高到低",
      "popularity": "最受欢迎",
      "rating": "评分最高"
    },
    "noProducts": "暂无商品。",
    "loadMore": "加载更多",
    "viewAs": "显示方式",
    "grid": "网格",
    "list": "列表",
    "category": "分类",
    "allCategories": "全部分类",
    "priceRange": "价格区间",
    "clearFilters": "清除筛选",
    "results": "共 {count} 件商品",
    "soldOut": "已售罄",
    "onSale": "限时优惠"
  },

  "common": {
    "loading": "加载中...",
    "error": "出了点问题",
    "retry": "重试",
    "cancel": "取消",
    "confirm": "确认",
    "save": "保存",
    "delete": "删除",
    "edit": "编辑",
    "close": "关闭",
    "back": "返回",
    "next": "下一步",
    "skip": "跳过",
    "search": "搜索",
    "noResults": "未找到结果",
    "share": "分享",
    "copy": "复制",
    "copied": "已复制！",
    "viewAll": "查看全部",
    "showMore": "展开更多",
    "showLess": "收起",
    "optional": "选填",
    "required": "必填",
    "page": "第",
    "of": "页，共",
    "itemsPerPage": "每页显示"
  },

  "validation": {
    "required": "此字段为必填项",
    "email": "请输入有效的邮箱地址",
    "minLength": "至少需要 {length} 个字符",
    "maxLength": "最多 {length} 个字符",
    "passwordMatch": "两次密码输入不一致",
    "passwordMin": "密码至少需要8个字符",
    "invalidUrl": "请输入有效的URL",
    "invalidPhone": "请输入有效的电话号码",
    "invalidPostcode": "请输入有效的邮政编码",
    "numericOnly": "请输入数字",
    "positiveNumber": "请输入正数",
    "requiredSelect": "请选择一个选项"
  },

  "seo": {
    "siteTitle": "NovaFabric — 高级服饰，全新定义",
    "titleTemplate": "NovaFabric — %s",
    "siteDescription": "发现最新时尚趋势。选购男装、配饰等新品。",
    "keywords": "时尚,服装,配饰,在线商店,电商",
    "siteName": "NovaFabric"
  },

  "errors": {
    "notFound": {
      "title": "页面未找到",
      "description": "您访问的页面不存在或已被移动。",
      "backHome": "返回首页"
    },
    "serverError": {
      "title": "服务器错误",
      "description": "服务器出了点问题，请稍后重试。"
    },
    "networkError": "网络连接错误，请检查网络。",
    "sessionExpired": "会话已过期，请重新登录。",
    "unauthorized": "请先登录再访问此页面。",
    "forbidden": "您没有权限访问此页面。"
  }
}
```

---

### 3.5 组件改造指南

#### 3.5.1 Server Components 改造

Server Components 无需 `'use client'`，直接使用 [`getTranslations`](https://next-intl.dev/docs/en/usage/server-components)：

```typescript
// src/components/layout/footer.tsx（Server Component）
import { getTranslations } from 'next-intl/server';

export default async function Footer() {
  const t = await getTranslations('footer');

  return (
    <footer>
      <p>{t('companyDescription')}</p>
      <nav>
        <h3>{t('quickLinks')}</h3>
        <ul>
          <li><Link href="/shop">{t('shop')}</Link></li>
          <li><Link href="/about">{t('about')}</Link></li>
        </ul>
      </nav>
      <p>{t('copyright', { year: new Date().getFullYear() })}</p>
    </footer>
  );
}
```

> **改造要点**：
> - 将 `footer.tsx` 从 `'use client'` 改为 Server Component（如原本是 client，需评估是否需要交互性）
> - 使用 [`getTranslations(namespace)`] 加载对应命名空间的翻译
> - 服务端渲染时直接读取 JSON，无客户端 JS 开销

#### 3.5.2 Client Components 改造

Client Components 使用 `useTranslations` hook：

```typescript
// src/components/cart/cart-drawer.tsx（Client Component）
'use client';

import { useTranslations } from 'next-intl';

export function CartDrawer() {
  const t = useTranslations('cart');
  // t 会自动绑定到 'cart' 命名空间

  return (
    <div>
      <h2>{t('title')} ({items.length})</h2>
      {items.length === 0 ? (
        <div>
          <h3>{t('empty.title')}</h3>
          <p>{t('empty.description')}</p>
          <Link href="/shop">{t('empty.shopLink')}</Link>
        </div>
      ) : (
        <>
          <p>{t('total')}: {formatPrice(total, currency)}</p>
          <Link href="/checkout">{t('checkout')}</Link>
        </>
      )}
    </div>
  );
}
```

> **改造要点**：
> - `useTranslations('cart')` 返回一个绑定了 `cart` 命名空间的翻译函数
> - 也可以使用 `useTranslations()` 不传参，然后手动调用 `t('cart.title')`

#### 3.5.3 表单验证本地化

##### 方案 A：使用自定义错误消息映射（推荐）

```typescript
// src/app/[locale]/checkout/page.tsx
'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export default function CheckoutPage() {
  const t = useTranslations('checkout.form');
  const v = useTranslations('validation');

  const checkoutSchema = z.object({
    email: z.string().email(v('email')),
    firstName: z.string().min(1, v('required')),
    lastName: z.string().min(1, v('required')),
    phone: z.string().min(1, v('required')),
    address1: z.string().min(1, v('required')),
    // ...
  });

  type FormData = z.infer<typeof checkoutSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(checkoutSchema),
  });

  return (
    <form>
      <label>{t('email.label')}</label>
      <input
        {...register('email')}
        placeholder={t('email.placeholder')}
      />
      {errors.email && (
        <p className="text-red-500">{errors.email.message}</p>
      )}
      {/* ... */}
    </form>
  );
}
```

> **注意**：上述代码中，Zod schema 是在组件内部创建的，因为需要使用 hook 获取翻译。如果需要在组件外部定义 schema，可以考虑方案 B。

##### 方案 B：使用 `zod-i18n` 插件（备选）

如果需要在组件外部定义 schema，可以使用 `zod-i18n` 配合 next-intl：

```bash
npm install zod-i18n
```

```typescript
// src/lib/validation.ts
import { z } from 'zod';
import { makeZodI18nMap } from 'zod-i18n';

// 需要在组件中初始化
// const t = useTranslations('validation');
// z.setErrorMap(makeZodI18nMap({ t }));
```

**推荐方案 A**，原因：
- 无需额外依赖
- 与 next-intl 翻译体系完全一致
- 代码更直观，易于维护

#### 3.5.4 价格格式化

使用 next-intl 的 [`useFormatter`](https://next-intl.dev/docs/en/usage/numbers) 替代当前项目中自定义的 [`formatPrice`](/src/lib/utils.ts)：

```typescript
// 在 Client Component 中
'use client';

import { useFormatter } from 'next-intl';

function PriceDisplay({ amount }: { amount: number }) {
  const format = useFormatter();

  return (
    <span>
      {format.number(amount, {
        style: 'currency',
        currency: 'USD', // 或从 currency store 获取
        // 根据语言自动决定千分位、小数点格式
      })}
    </span>
  );
}
```

```typescript
// 在 Server Component 中
import { getFormatter } from 'next-intl/server';

async function PriceDisplay({ amount, locale }: { amount: number; locale: string }) {
  const formatter = await getFormatter({ locale });

  return (
    <span>
      {formatter.number(amount, {
        style: 'currency',
        currency: 'USD',
      })}
    </span>
  );
}
```

> **改造影响**：当前项目使用 [`formatPrice(price, currency)`](/src/lib/utils.ts) 工具函数。重写该函数以支持国际化格式：

```typescript
// src/lib/utils.ts — 修改后的 formatPrice
import { getFormatter } from 'next-intl/server';

// 服务端版本
export async function formatPriceServer(
  price: number,
  currency: string,
  locale: string
): Promise<string> {
  const formatter = await getFormatter({ locale });
  return formatter.number(price, {
    style: 'currency',
    currency,
  });
}

// 客户端版本（在组件中使用 useFormatter）
```

**或者**，保持现有的纯客户端 [`formatPrice`](/src/lib/utils.ts) 函数不变，仅在组件层面使用 next-intl 的 formatter。这样可以减少迁移成本。

#### 3.5.5 日期格式化

使用 next-intl 的 formatter 替代 [`date-fns`](/package.json:17)：

```typescript
// Client Component
'use client';

import { useFormatter } from 'next-intl';

function OrderDate({ date }: { date: Date }) {
  const format = useFormatter();

  return (
    <time dateTime={date.toISOString()}>
      {format.dateTime(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    </time>
  );
}
```

```typescript
// Server Component
import { getFormatter } from 'next-intl/server';

async function OrderDate({ date, locale }: { date: Date; locale: string }) {
  const formatter = await getFormatter({ locale });

  return (
    <time dateTime={date.toISOString()}>
      {formatter.dateTime(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    </time>
  );
}
```

> **注意**：`date-fns` 仍可用于日期计算（加减、比较等），但**格式化输出应使用 next-intl**，以确保语言感知。

#### 3.5.6 导航和链接改造

next-intl 提供 `Link` 组件自动处理语言前缀：

```typescript
// src/components/layout/header.tsx
'use client';

import { Link } from '@/i18n/routing'; // 或使用 next-intl 的 Link
// 注意：需要从 next-intl 导入 Link
import { useTranslations } from 'next-intl';

export function Header() {
  const t = useTranslations('navigation');

  return (
    <nav>
      <Link href="/">{t('home')}</Link>
      <Link href="/shop">{t('shop')}</Link>
      <Link href="/about">{t('about')}</Link>
      <Link href="/contact">{t('contact')}</Link>
      <Link href="/cart">{t('cart')}</Link>
      <Link href="/account">{t('account')}</Link>
    </nav>
  );
}
```

> **重要**：`next-intl` 的 `Link` 组件会自动在 href 前加上当前语言前缀（如 `/en/shop`），无需手动拼接。

```typescript
// 创建封装的导航服务
// src/i18n/routing.ts 扩展
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// 导出语言感知的导航工具
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

组件中使用：

```typescript
// 使用封装的导航工具
import { Link, usePathname, useRouter } from '@/i18n/routing';
```

#### 3.5.7 语言切换器组件

创建一个语言切换器组件：

```typescript
'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { useTransition } from 'react';

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchLanguage = (nextLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <div className="flex items-center gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => switchLanguage(lang.code)}
          disabled={locale === lang.code || isPending}
          className={cn(
            'px-2 py-1 text-sm rounded',
            locale === lang.code
              ? 'bg-black text-white'
              : 'hover:bg-gray-100'
          )}
        >
          {lang.flag} {lang.label}
        </button>
      ))}
    </div>
  );
}
```

---

### 3.6 WordPress 内容多语言

#### 3.6.1 WordPress 端方案推荐

| 插件 | 优缺点 | 推荐度 |
|------|--------|--------|
| **Polylang** | 免费版功能完整、轻量、WPGraphQL 有兼容扩展 | ⭐⭐⭐ |
| **WPML** | 功能最全面、商业付费、资源消耗大、学习曲线陡 | ⭐⭐ |
| **Natively** | 免费、轻量、适合简单场景、功能有限 | ⭐ |

**推荐使用 Polylang**（免费版）+ [WPGraphQL Polylang Extension](https://github.com/valu-digital/wp-graphql-polylang)。

#### 3.6.2 WPGraphQL 多语言查询

```typescript
// src/lib/graphql.ts — 多语言查询示例

// 语言映射表
const localeToWordPressLang: Record<string, string> = {
  en: 'en',    // WordPress 中的英文语言代码
  zh: 'zh',    // WordPress 中的中文语言代码
};

export async function getProductBySlug(slug: string, locale: string) {
  const query = `
    query GetProduct($slug: String!, $language: String!) {
      product(id: $slug, idType: SLUG) {
        id
        title
        content
        featuredImage {
          node {
            sourceUrl
          }
        }
        # Polylang 语言过滤
        translation(language: $language) {
          id
          title
          content
        }
      }
    }
  `;

  return graphqlFetch<{ product: Product }>(query, {
    slug,
    language: localeToWordPressLang[locale] || 'en',
  });
}

// 获取产品列表（多语言过滤）
export async function getProducts(locale: string, options?: { category?: string }) {
  const language = localeToWordPressLang[locale] || 'en';

  const query = `
    query GetProducts($language: String!) {
      products(where: { language: $language }) {
        nodes {
          id
          name
          slug
          ...ProductFields
        }
      }
    }
  `;

  return graphqlFetch(query, { language });
}
```

#### 3.6.3 WooCommerce REST API 多语言

WooCommerce REST API 本身不直接支持多语言。需要 WordPress 插件（如 Polylang/WPML）将产品数据与翻译关联：

```typescript
// src/lib/woocommerce.ts — 多语言产品获取
import { productsApi } from '@/lib/woocommerce';

// WooCommerce API 本身返回的是默认语言的数据
// 需要通过 WPGraphQL 获取翻译关联的 ID
export async function getProductInLocale(productId: number, locale: string) {
  // 1. 通过 WPGraphQL 获取当前语言对应的产品 ID
  const translationId = await getTranslationProductId(productId, locale);

  // 2. 使用翻译后的 ID 获取 WooCommerce 数据
  if (translationId && translationId !== productId) {
    return productsApi.get(translationId);
  }

  // 3. 没有翻译则返回默认语言的产品
  return productsApi.get(productId);
}
```

**注**：上述方案依赖于 WordPress 端 Polylang/WPML 对 WooCommerce 产品的翻译关联。如果 WordPress 端未配置多语言，则 `getTranslationProductId` 返回空，回退到默认语言。

---

### 3.7 SEO 处理

#### 3.7.1 多语言 Metadata

```typescript
// src/app/[locale]/layout.tsx 中已包含 generateMetadata
// 在页面级别添加语言特定的 metadata

// src/app/[locale]/shop/page.tsx
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'shop' });

  return {
    title: t('title'),
    description: t('description') || 'Browse our collection',
    alternates: {
      canonical: `https://novafabric.shop/${locale}/shop`,
      languages: {
        en: 'https://novafabric.shop/en/shop',
        zh: 'https://novafabric.shop/zh/shop',
      },
    },
  };
}
```

#### 3.7.2 多语言 Sitemap

```typescript
// src/app/sitemap.ts
import { routing } from '@/i18n/routing';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://novafabric.shop';

// 定义所有路由
const routes = [
  '',
  '/shop',
  '/cart',
  '/checkout',
  '/contact',
  '/account',
  '/account/orders',
  '/account/addresses',
  '/account/details',
];

export default async function sitemap() {
  // 为每种语言生成 URL
  const localizedRoutes = routing.locales.flatMap((locale) =>
    routes.map((route) => ({
      url: `${BASE_URL}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: route === '' ? 'weekly' as const : 'monthly' as const,
      priority: route === '' ? 1.0 : 0.8,
      // 为每个 URL 添加 alternate links
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${BASE_URL}/${l}${route}`])
        ),
      },
    }))
  );

  return localizedRoutes;
}
```

#### 3.7.3 `robots.txt`

```
# public/robots.txt
User-agent: *
Allow: /

Sitemap: https://novafabric.shop/sitemap.xml
```

---

## 4. 改造工作量和难度评估

### 4.1 详细评估表

| 模块 | 涉及文件 | 改造难度 | 预估工时 | 说明 |
|------|---------|---------|---------|------|
| **配置层** | `next.config.ts`、`middleware.ts`、`i18n/routing.ts`、`i18n/request.ts` | 中 | 4h | 安装依赖、配置中间件、路由、request 配置 |
| **根布局迁移** | `src/app/layout.tsx` → `src/app/[locale]/layout.tsx` | 中 | 2h | 添加语言参数、NextIntlClientProvider、generateMetadata |
| **页面路由迁移** | 所有 `src/app/*/page.tsx` 移动到 `src/app/[locale]/*/page.tsx` | 易 | 2h | 目录结构调整，更新 import 路径 |
| **Header** | `src/components/layout/header.tsx` | 易 | 2h | 替换导航文字为 `useTranslations`，使用 next-intl Link |
| **Footer** | `src/components/layout/footer.tsx` | 易 | 1h | 替换所有硬编码文字（原为 server component） |
| **UI 组件** | `button.tsx`、`input.tsx`、`skeleton.tsx`、`price-display.tsx`、`currency-selector.tsx` | 易 | 2h | 替换内置 aria-label、默认文案 |
| **产品模块** | `product-card.tsx`、`product-info.tsx`、`product-gallery.tsx`、`product-grid.tsx` | 中 | 4h | 替换 add to cart、stock status 等文案 |
| **购物车** | `cart-drawer.tsx`、`cart/page.tsx` | 中 | 3h | 替换购物车为空、结算按钮、摘要文字 |
| **结账流程** | `checkout/page.tsx`、`payment-method-selector.tsx`、`paypal-button.tsx`、`stripe-poller-wrapper.tsx`、`bank-transfer-instructions.tsx` | 难 | 6h | Zod schema 验证消息本地化、表单标签/错误消息、支付文案 |
| **账户模块** | `login/page.tsx`、`register/page.tsx`、`forgot-password/page.tsx`、`account/page.tsx`、`orders/page.tsx`、`orders/[id]/page.tsx`、`addresses/page.tsx`、`details/page.tsx` | 难 | 8h | 大量表单验证消息、状态标签、导航、错误提示 |
| **首页和内容页** | `page.tsx`（首页）、`[slug]/page.tsx`、`contact/page.tsx`、`order-confirmation/[id]/page.tsx` | 中 | 3h | Hero 文案、页面标题、联系表单 |
| **翻译文件** | `messages/en.json`、`messages/zh.json` | - | 6h | 整理所有文案、编写中英文翻译 |
| **WordPress 集成** | `src/lib/graphql.ts`、`src/lib/woocommerce.ts` | 中 | 4h | 语言参数传递、翻译 ID 映射 |
| **SEO 配置** | `sitemap.ts`、各页面 `generateMetadata` | 中 | 2h | 多语言 sitemap、alternate links |
| **测试和修复** | 全量回归测试 | 难 | 8h | 确保两种语言下所有流程正常 |
| **总计** | ~40+ 个文件 | - | **~52h** | |

### 4.2 难度分布图

```
难度分布（按工时占比）：
  
  配置 / 基础架构：    ████████  15%  (8h)
  页面迁移：           ████       8%  (4h)
  核心组件改造：       ████████████  23%  (12h)
  复杂流程改造：       ████████████████  27%  (14h)
  翻译内容：           ████████  12%  (6h)
  WordPress 集成：     ██████     8%  (4h)
  SEO + 测试：         ████████████  19%  (10h)
```

### 4.3 各模块依赖关系

```
阶段 1 ───▶ 配置 + 翻译文件框架
                │
                ▼
阶段 2 ───▶ 布局组件 + 页面路由迁移 + 核心 UI
                │
                ▼
阶段 3 ───▶ 产品 + 购物车 + 结账 + 账户
                │
                ▼
阶段 4 ───▶ WordPress 多语言 + SEO + 测试
```

---

## 5. 实施路线图

### 阶段 1：基础设施搭建（预估 8h）

**目标**：安装 next-intl、配置路由、创建翻译文件框架、验证多语言路由正常

| 步骤 | 任务 | 工时 | 完成条件 |
|------|------|------|---------|
| 1.1 | 安装 `next-intl` 依赖 | 0.5h | `npm install next-intl` 成功 |
| 1.2 | 创建 `src/i18n/routing.ts` | 1h | 配置语言列表、默认语言、前缀策略 |
| 1.3 | 创建 `src/i18n/request.ts` | 1h | 服务端加载翻译文件 |
| 1.4 | 创建 `src/middleware.ts` | 0.5h | 语言检测和重定向正常 |
| 1.5 | 修改 `next.config.ts` | 0.5h | 集成 next-intl 插件 |
| 1.6 | 创建 `src/messages/en.json` 框架 | 1h | 所有 namespace 定义完整 |
| 1.7 | 创建 `src/messages/zh.json` 框架 | 1h | 所有 namespace 定义完整 |
| 1.8 | 移动 `layout.tsx` → `[locale]/layout.tsx` | 1.5h | NextIntlClientProvider、generateMetadata |
| 1.9 | 验证路由正常工作 | 1h | `/en/shop`、`/zh/shop` 均可访问 |

**验证清单**：
- [ ] 访问 `/en/shop` 正常渲染英文页面
- [ ] 访问 `/zh/shop` 正常渲染中文页面
- [ ] 访问 `/shop` 自动重定向到 `/en/shop`
- [ ] 语言切换后刷新页面保持语言选择
- [ ] API 路由 `/api/...` 不受语言前缀影响

### 阶段 2：核心功能改造（预估 16h）

**目标**：改造布局组件、产品模块、购物车

| 步骤 | 任务 | 工时 | 涉及文件 |
|------|------|------|---------|
| 2.1 | 改造 Header | 2h | [`header.tsx`](/src/components/layout/header.tsx) |
| 2.2 | 改造 Footer | 1h | [`footer.tsx`](/src/components/layout/footer.tsx) |
| 2.3 | 创建 LanguageSwitcher | 1h | 新组件 |
| 2.4 | 改造 UI 组件（Button、Input 等） | 2h | [`button.tsx`](/src/components/ui/button.tsx)、[`input.tsx`](/src/components/ui/input.tsx) 等 |
| 2.5 | 改造 ProductCard | 2h | [`product-card.tsx`](/src/components/product/product-card.tsx) |
| 2.6 | 改造 ProductInfo | 2h | [`product-info.tsx`](/src/components/product/product-info.tsx) |
| 2.7 | 改造 CartDrawer | 2h | [`cart-drawer.tsx`](/src/components/cart/cart-drawer.tsx) |
| 2.8 | 改造 CartPage | 1h | [`cart/page.tsx`](/src/app/cart/page.tsx) |
| 2.9 | 页面路由迁移 | 2h | 所有页面文件迁移到 `[locale]` 目录 |
| 2.10 | 移动首页和内容页 | 1h | [`page.tsx`](/src/app/page.tsx)、[`[slug]/page.tsx`](/src/app/%5Bslug%5D/page.tsx) |

### 阶段 3：完整功能改造（预估 18h）

**目标**：改造结账流程、账户模块、WordPress 多语言

| 步骤 | 任务 | 工时 | 涉及文件 |
|------|------|------|---------|
| 3.1 | 改造结账页面（表单） | 3h | [`checkout/page.tsx`](/src/app/checkout/page.tsx) |
| 3.2 | Zod schema 验证本地化 | 1h | 结账和账户页面的验证消息 |
| 3.3 | 改造支付方式选择器 | 1h | [`payment-method-selector.tsx`](/src/components/checkout/payment-method-selector.tsx) |
| 3.4 | 改造 PayPal 按钮 | 1h | [`paypal-button.tsx`](/src/components/checkout/paypal-button.tsx) |
| 3.5 | 改造银行转账说明 | 0.5h | [`bank-transfer-instructions.tsx`](/src/components/checkout/bank-transfer-instructions.tsx) |
| 3.6 | 改造 OrderStatus 组件 | 0.5h | [`order-status-banner.tsx`](/src/components/checkout/order-status-banner.tsx) |
| 3.7 | 改造登录页面 | 1.5h | [`login/page.tsx`](/src/app/account/login/page.tsx) |
| 3.8 | 改造注册页面 | 1.5h | [`register/page.tsx`](/src/app/account/register/page.tsx) |
| 3.9 | 改造忘记密码页面 | 1h | [`forgot-password/page.tsx`](/src/app/account/forgot-password/page.tsx) |
| 3.10 | 改造账户概览页 | 1h | [`account/page.tsx`](/src/app/account/page.tsx) |
| 3.11 | 改造订单页面 | 1.5h | [`orders/page.tsx`](/src/app/account/orders/page.tsx)、[`orders/[id]/page.tsx`](/src/app/account/orders/%5Bid%5D/page.tsx) |
| 3.12 | 改造地址页面 | 1h | [`addresses/page.tsx`](/src/app/account/addresses/page.tsx) |
| 3.13 | 改造账户详情页 | 1h | [`details/page.tsx`](/src/app/account/details/page.tsx) |
| 3.14 | WordPress 多语言集成 | 4h | [`graphql.ts`](/src/lib/graphql.ts)、[`woocommerce.ts`](/src/lib/woocommerce.ts) |

### 阶段 4：优化上线（预估 10h）

**目标**：SEO 配置、全流程测试、性能优化

| 步骤 | 任务 | 工时 | 说明 |
|------|------|------|------|
| 4.1 | 配置多语言 Sitemap | 1.5h | [`sitemap.ts`](/src/app/sitemap.ts) |
| 4.2 | 各页面 generateMetadata | 1.5h | 为每个页面添加语言特定的 SEO 元数据 |
| 4.3 | 语言切换时状态保持 | 1h | 确保切换语言时购物车、认证状态不丢失 |
| 4.4 | 性能测试 | 1h | Lighthouse 测试、bundle 体积检查 |
| 4.5 | 功能回归测试（英文） | 2h | 确保英文端所有功能正常 |
| 4.6 | 功能回归测试（中文） | 2h | 确保中文端所有功能正常 |
| 4.7 | 部署验证 | 1h | 部署到 staging/production 验证 |

---

## 6. 潜在风险

### 6.1 风险矩阵

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| WordPress 端未安装/配置多语言插件 | 高 | 高 | 需要在项目启动前与运维确认；可先实现 UI 多语言，内容多语言作为第二阶段 |
| WPGraphQL 与多语言插件兼容性问题 | 中 | 中 | 提前在测试环境验证；备选方案：使用 REST API 返回的语言字段 |
| 语言切换时购物车数据兼容性 | 中 | 中 | 购物车 store 中的产品名称在切换语言后不会自动翻译；使用产品 ID 而非名称进行匹配 |
| 表单验证本地化后 Zod schema 重构 | 中 | 中 | 先在 checkout 和 login 两个关键页面验证方案可行性，再全面推广 |
| Stripe/PayPal 支付界面本地化 | 低 | 低 | 支付 SDK 通常自动识别浏览器语言，无需额外配置 |
| 部署后语言 cookie 导致旧页面 404 | 中 | 低 | 部署前清理所有语言 cookie；配置合理的 404 页面 | 
| 现有 SEO 排名下降 | 中 | 高 | 正确设置 canonical URL 和 alternate links；提交新的 sitemap 到 Google Search Console |
| next-intl 版本升级破坏性变更 | 低 | 中 | 锁定 next-intl 版本；升级前阅读 changelog |

### 6.2 关键风险详解

#### 风险 A：WordPress 多语言内容

**问题描述**：WPGraphQL 默认不支持多语言内容查询。需要 WordPress 端安装额外的扩展插件。

**解决方案**：
1. 安装 [Polylang](https://wordpress.org/plugins/polylang/)（免费）
2. 安装 [WPGraphQL Polylang Extension](https://github.com/valu-digital/wp-graphql-polylang)
3. 在 GraphQL 查询中添加 `language` 参数

**备选方案**：如果 Polylang 兼容性有问题，可使用 WPML（商业插件），但需要对应的 WPGraphQL WPML 扩展。

#### 风险 B：购物车数据语言切换

**问题描述**：用户添加商品到购物车后切换语言，购物车中存储的产品名称不会自动翻译。

**解决方案**：
- 购物车 [`CartItem`](/src/stores/cart-store.ts:6) 中的 `name` 字段在产品添加到购物车时锁定
- 显示时使用 `name` 字段，不依赖翻译
- 如需切换语言后更新产品名称，可以在显示购物车时根据 `productId` 重新获取当前语言的产品名称（但会增加 API 请求）

#### 风险 C：现有 SEO 排名

**问题描述**：URL 结构从 `/shop` 变为 `/en/shop`，可能导致原有搜索引擎索引失效。

**解决方案**：
- 确保每个页面正确设置 `<link rel="canonical" />` 指向新的语言特定 URL
- 在 `middleware.ts` 中对旧 URL 配置 301 重定向
- 更新 `sitemap.xml` 并提交到 Google Search Console
- 使用 `localePrefix: 'always'` 而非 `as-needed`，避免 routing 混乱

---

## 7. 结论和建议

### 7.1 可行性评估

**结论：完全可行，推荐实施。**

- **技术可行性**：next-intl 与 Next.js App Router 深度集成，与项目现有架构无冲突
- **时间可行性**：预估 52 工时（约 6-7 个工作日），可按阶段分步实施
- **成本可行性**：next-intl 开源免费；WordPress 端 Polylang 免费版即可满足需求
- **风险可控**：核心风险可通过提前规划缓解

### 7.2 实施优先级建议

```
第一阶段（P0 - 必须）：基础设施
├── 安装 next-intl + 配置
├── 创建翻译文件
└── 路由迁移

第二阶段（P1 - 重要）：核心体验
├── 布局组件翻译（header/footer）
├── 产品模块翻译
├── 购物车翻译
└── 语言切换器

第三阶段（P2 - 重要）：完整流程
├── 结账流程翻译
├── 账户模块翻译
├── 表单验证本地化
└── WordPress 多语言

第四阶段（P3 - 优化）：上线准备
├── SEO 配置
├── 全流程测试
└── 性能优化
```

### 7.3 长期维护建议

1. **翻译文件管理**
   - 将翻译文件纳入版本控制，在 CI/CD 流程中验证翻译完整性
   - 考虑使用 Lokalise / Crowdin 等翻译管理平台管理翻译文件
   - 建立翻译审核流程，确保专业术语的一致性

2. **新增语言的扩展**
   - 添加新语言只需：在 `routing.ts` 的 `locales` 数组添加新语言代码
   - 创建对应的 JSON 翻译文件（如 `messages/ja.json`）
   - 无需修改任何组件代码

3. **代码质量**
   - 使用 TypeScript 为翻译 key 提供类型安全（next-intl 支持）
   - 避免在组件中使用 `t('navigation.home')` 这种路径字符串，优先使用 `useTranslations('navigation')` 进行命名空间绑定
   - 禁止在 React 组件外使用翻译函数（如工具函数中不应包含翻译逻辑）

4. **监控和告警**
   - 监控 missing translation keys（已配置 `getMessageFallback`）
   - 设置 CI 检查：确保每个语言的文件包含相同数量的翻译 key
   - 对 SEO 相关翻译的变更进行特别审查

### 7.4 总结

| 维度 | 评估 |
|------|------|
| **技术方案成熟度** | ⭐⭐⭐⭐⭐（next-intl 是 Next.js 官方推荐方案） |
| **与现有架构兼容性** | ⭐⭐⭐⭐⭐（无冲突，平滑集成） |
| **实施风险** | ⭐⭐（中低风险，主要体现在 WordPress 多语言集成） |
| **团队学习成本** | ⭐⭐⭐⭐⭐（学习曲线低，API 设计直观） |
| **长期维护成本** | ⭐⭐⭐⭐（低维护成本，翻译文件独立于代码） |
| **用户体验提升** | ⭐⭐⭐⭐⭐（极显著，多语言是国际化电商的基本需求） |

> **最终建议**：立即开始实施阶段 1，尽早验证技术方案的可行性。在此期间，与运维确认 WordPress 端的多语言插件安装计划，确保内容多语言与 UI 多语言同步上线。

---

> **文档信息**：本文档由 AI 辅助生成，基于对项目源代码、依赖关系和架构的全面分析。如有疑问或需要调整实施计划，请在项目 Issues 中提出讨论。

*最后更新：2026-06-28*
