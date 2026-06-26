# Headless WordPress 电商前端 (NovaFabric)

一个基于 **Next.js 16**、**React 19** 和 **Tailwind CSS v4** 构建的现代化、生产就绪的无头电商店铺前端。以 WordPress/WooCommerce 作为无头 CMS 来管理内容和商品。支持多币种、多支付网关，并拥有丰富的动画用户界面。

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06D6B4?logo=tailwindcss)
![Stripe](https://img.shields.io/badge/Stripe-%E6%94%AF%E4%BB%98-008CDD?logo=stripe)
![PayPal](https://img.shields.io/badge/PayPal-%E6%94%AF%E4%BB%98-00457C?logo=paypal)

![GitHub stars](https://img.shields.io/github/stars/wpacademy/nextjs-woocommerce-frontend?style=social)
![GitHub forks](https://img.shields.io/github/forks/wpacademy/nextjs-woocommerce-frontend?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/wpacademy/nextjs-woocommerce-frontend?style=social)
![GitHub license](https://img.shields.io/github/license/wpacademy/nextjs-woocommerce-frontend)

<img width="1920" height="1080" alt="preview" src="https://github.com/user-attachments/assets/26009a55-84aa-4a17-9f45-164299fc1f4a" />

**[在线演示](https://nextjs-woocommerce-frontend-ochre.vercel.app/)**

## 功能特性

- **无头架构** — 前后端分离，后端使用 WordPress/WooCommerce
- **服务端渲染** — 使用 Next.js App Router 实现快速的首屏加载
- **商品目录** — 支持按分类、筛选条件和搜索浏览商品
- **可变商品** — 支持商品变体（尺寸、颜色等）
- **购物车** — 基于 localStorage 的持久化购物车
- **用户认证** — 基于 JWT 的登录、注册和账户管理
- **结账流程** — 通过 WooCommerce 完成订单处理
- **响应式设计** — 移动优先，适配所有设备
- **图片优化** — 使用 Next.js Image 自动优化图片
- **多币种支持** — USD / EUR / GBP，GeoIP 自动检测 + 手动切换
- **支付系统** — Stripe（信用卡/借记卡）、PayPal、银行转账（BACS，支持英/德/美三国银行）、货到付款（COD）
- **首页 Hero 轮播图** — 使用 Framer Motion 的带动画轮播横幅组件
- **联系页面** — 集成 Contact Form 7 的联系表单
- **订单确认页面** — 支付完成后的订单详情展示
- **订单状态轮询** — 支付后自动轮询订单处理状态
- **分类页面浏览** — 支持按分类筛选商品，拥有专属分类页面
- **产品搜索** — 带防抖输入的实时搜索 API
- **运费计算** — 基于收货地址的实时运费查询

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16.1.6 (App Router) |
| UI 库 | React 19.2.3 |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand 5.0.11 |
| 表单 | React Hook Form + Zod |
| 动画 | Framer Motion |
| 支付 (Stripe) | `@stripe/stripe-js` + `stripe` |
| 支付 (PayPal) | `@paypal/react-paypal-js` |
| 日期处理 | `date-fns` |
| 语言 | TypeScript 5（严格模式）|

## 项目结构

```
src/
├── app/                                  # Next.js App Router 页面和 API 路由
│   ├── layout.tsx                        # 根布局（包含 providers）
│   ├── page.tsx                          # 首页（hero 轮播 + 精选商品）
│   ├── globals.css                       # 全局样式（含 Tailwind）
│   │
│   ├── [slug]/                           # WordPress 页面通配路由（关于我们等）
│   │   └── page.tsx
│   │
│   ├── account/                          # 用户账户页面
│   │   ├── page.tsx                      # 账户仪表盘
│   │   ├── login/page.tsx                # 登录页面
│   │   ├── register/page.tsx             # 注册页面
│   │   ├── forgot-password/page.tsx      # 密码重置
│   │   ├── details/page.tsx              # 账户详情编辑
│   │   ├── addresses/page.tsx            # 账单/收货地址
│   │   ├── orders/page.tsx               # 订单历史
│   │   └── orders/[id]/page.tsx          # 单笔订单详情
│   │
│   ├── api/                              # API 路由（仅服务端）
│   │   ├── account/                      # 用户账户 CRUD
│   │   │   ├── addresses/route.ts
│   │   │   ├── orders/route.ts
│   │   │   ├── orders/[id]/route.ts
│   │   │   ├── password/route.ts
│   │   │   └── update/route.ts
│   │   ├── auth/                         # 用户认证
│   │   │   ├── register/route.ts
│   │   │   └── forgot-password/route.ts
│   │   ├── categories/route.ts           # 分类列表
│   │   ├── checkout/                     # 支付处理
│   │   │   ├── stripe/route.ts           # Stripe Checkout Session
│   │   │   └── paypal/
│   │   │       ├── create-order/route.ts # 创建 PayPal 订单
│   │   │       └── capture/route.ts      # 捕获 PayPal 付款
│   │   ├── orders/route.ts               # 创建订单
│   │   ├── orders/[id]/route.ts          # 按 ID 查询订单（状态轮询用）
│   │   ├── products/search/route.ts      # 产品搜索
│   │   ├── shipping/rates/route.ts       # 运费计算
│   │   └── webhooks/stripe/route.ts      # Stripe Webhook 处理
│   │
│   ├── cart/page.tsx                     # 购物车页面
│   ├── checkout/page.tsx                 # 结账页面
│   ├── contact/page.tsx                  # 联系表单页面
│   ├── order-confirmation/[id]/page.tsx  # 订单确认页面
│   ├── product/[slug]/page.tsx           # 商品详情页
│   ├── shop/page.tsx                     # 商品列表页
│   └── shop/[category]/page.tsx          # 按分类筛选的商品列表
│
├── components/
│   ├── providers.tsx                     # 根 Provider 组合
│   │
│   ├── cart/
│   │   └── cart-drawer.tsx               # 滑出式购物车抽屉
│   │
│   ├── checkout/
│   │   ├── bank-transfer-instructions.tsx # BACS 银行账户信息展示
│   │   ├── order-status-banner.tsx       # 订单状态通知
│   │   ├── order-status-poller.tsx       # 自动轮询订单处理状态
│   │   ├── payment-method-selector.tsx   # 支付方式单选组件
│   │   ├── paypal-button.tsx             # PayPal 智能按钮集成
│   │   └── stripe-poller-wrapper.tsx     # Stripe 支付 + 状态轮询
│   │
│   ├── home/
│   │   └── hero-slider.tsx               # 带动画的 Hero 轮播（Framer Motion）
│   │
│   ├── layout/
│   │   ├── header.tsx                    # 网站头部（导航、购物车、币种、搜索）
│   │   ├── footer.tsx                    # 网站底部
│   │   └── search.tsx                    # 搜索覆盖层/输入框
│   │
│   ├── product/
│   │   ├── product-card.tsx              # 商品卡片（网格项）
│   │   ├── product-gallery.tsx           # 商品图片画廊
│   │   ├── product-grid.tsx              # 商品网格布局
│   │   └── product-info.tsx              # 商品详情（变体、加入购物车）
│   │
│   ├── providers/
│   │   ├── currency-provider.tsx         # 币种上下文和 GeoIP 检测
│   │   └── paypal-provider.tsx           # PayPal SDK Provider 封装
│   │
│   └── ui/
│       ├── button.tsx                    # 可复用按钮（primary/outline/ghost 变体）
│       ├── currency-selector.tsx         # 币种切换下拉框
│       ├── input.tsx                     # 美化的输入框组件
│       ├── price-display.tsx             # 币种感知的价格展示
│       └── skeleton.tsx                  # 加载骨架屏组件
│
├── lib/                                  # 工具函数和 API 客户端
│   ├── auth.ts                           # JWT 认证辅助函数
│   ├── bacs-accounts.ts                  # BACS 银行账户数据（英/德/美）
│   ├── currency.ts                       # 多币种配置和 GeoIP 检测
│   ├── graphql.ts                        # GraphQL 请求客户端
│   ├── hooks.ts                          # 共享 React hooks（useMounted）
│   ├── paypal.ts                         # PayPal REST API v2 服务端客户端
│   ├── stripe.ts                         # Stripe 服务端客户端和辅助函数
│   ├── utils.ts                          # 共享工具函数（cn）
│   └── woocommerce.ts                    # WooCommerce REST API 客户端
│
├── stores/                               # Zustand 状态仓库
│   ├── auth-store.ts                     # 认证状态（持久化）
│   ├── cart-store.ts                     # 购物车状态（持久化）
│   ├── currency-store.ts                 # 币种偏好（持久化）
│   └── ui-store.ts                       # UI 状态（移动菜单、弹窗等）
│
└── types/
    └── woocommerce.ts                    # TypeScript 类型定义（WC API v3）
```

## 页面

| 路由 | 说明 |
|------|------|
| `/` | 首页，含 Hero 轮播、精选分类和新品展示 |
| `/shop` | 商品列表，支持分页和筛选 |
| `/shop/[category]` | 按分类筛选的商品列表 |
| `/product/[slug]` | 商品详情页，含变体和图片画廊 |
| `/cart` | 购物车页面，支持数量管理 |
| `/checkout` | 多步骤结账（地址、配送、支付） |
| `/order-confirmation/[id]` | 支付成功后的订单确认页面 |
| `/contact` | 联系表单页面 |
| `/account` | 账户仪表盘 |
| `/account/login` | 用户登录 |
| `/account/register` | 用户注册 |
| `/account/forgot-password` | 密码重置 |
| `/account/details` | 编辑账户详情 |
| `/account/addresses` | 管理账单/收货地址 |
| `/account/orders` | 订单历史 |
| `/account/orders/[id]` | 单笔订单详情 |

## API 路由参考

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 注册新用户 |
| `/api/auth/forgot-password` | POST | 发送密码重置邮件 |
| `/api/account/update` | POST | 更新账户信息 |
| `/api/account/password` | POST | 修改密码 |
| `/api/account/addresses` | GET/POST | 查询/更新地址 |
| `/api/account/orders` | GET | 查询用户订单列表 |
| `/api/account/orders/[id]` | GET | 查询单笔订单 |
| `/api/categories` | GET | 获取所有分类 |
| `/api/products/search` | GET | 实时产品搜索 |
| `/api/orders` | POST | 创建新订单 |
| `/api/orders/[id]` | GET | 按 ID 查询订单（状态轮询用） |
| `/api/checkout/stripe` | POST | 创建 Stripe Checkout Session |
| `/api/checkout/paypal/create-order` | POST | 创建 PayPal 订单 |
| `/api/checkout/paypal/capture` | POST | 捕获 PayPal 付款 |
| `/api/shipping/rates` | POST | 计算运费 |
| `/api/webhooks/stripe` | POST | Stripe Webhook 接收器 |

## 支付方式

### Stripe

Stripe 通过 Checkout Sessions 处理信用卡/借记卡支付。流程如下：

1. 结账页面收集地址和配送信息，创建 WooCommerce 订单
2. `POST /api/checkout/stripe` 创建 Stripe Checkout Session 并返回跳转 URL
3. 用户被重定向到 Stripe 托管结账页面完成信用卡支付
4. 支付完成后，用户被重定向回 `order-confirmation/[id]` 页面
5. Stripe 发送 `checkout.session.completed` webhook 到 `/api/webhooks/stripe`
6. Webhook 处理器将 WooCommerce 订单状态更新为 `processing`

**Webhook 设置：** 在 Stripe 管理后台配置将事件发送到 `{SITE_URL}/api/webhooks/stripe`。所需事件：
- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`

### PayPal

PayPal 支付使用 PayPal Orders v2 API：

1. `POST /api/checkout/paypal/create-order` 在服务端创建 PayPal 订单
2. 前端通过 `@paypal/react-paypal-js` 渲染 PayPal 智能按钮
3. 用户在 PayPal 弹窗中授权支付
4. `POST /api/checkout/paypal/capture` 在服务端捕获付款
5. 成功后，WooCommerce 订单更新为 `processing`

### 银行转账 (BACS)

BACS 适用于离线银行转账。项目预配置了三个地区的银行账户：

| 地区 | 币种 | 银行 |
|------|------|------|
| 英国 (UK) | GBP | Barclays Bank |
| 德国/欧盟 (EU) | EUR | Commerzbank |
| 美国 (US) | USD | JPMorgan Chase |

银行详情在订单提交后通过 [`BankTransferInstructions`](src/components/checkout/bank-transfer-instructions.tsx) 组件展示。配置信息位于 [`src/lib/bacs-accounts.ts`](src/lib/bacs-accounts.ts)。

### 货到付款 (COD)

COD 是 WooCommerce 的标准支付网关，直接在 WooCommerce 设置中启用即可，无需额外配置。

## 多币种

### 支持的币种

| 币种 | 代码 | 符号 | 区域设置 |
|------|------|------|---------|
| 美元 | USD | $ | en-US |
| 欧元 | EUR | € | de-DE |
| 英镑 | GBP | £ | en-GB |

### 工作原理

1. **GeoIP 检测**：用户访问网站时，[`CurrencyProvider`](src/components/providers/currency-provider.tsx) 通过以下方式检测用户所在国家：
   - Cloudflare `cf-ipcountry` 请求头（当网站使用 Cloudflare CDN 时）
   - 客户端 IP 地理位置检测（通过 `ipapi.co`）
2. **自动选择**：检测到的国家映射到支持的币种（欧盟 → EUR，英国 → GBP，其他 → USD）
3. **手动切换**：用户可通过 [`CurrencySelector`](src/components/ui/currency-selector.tsx) 组件手动切换币种
4. **持久化**：币种偏好通过 [`currencyStore`](src/stores/currency-store.ts) 持久化到 localStorage
5. **价格解析**：[`resolveProductPrice()`](src/lib/currency.ts) 函数检查商品级别的 `multi_currency_prices` 元数据，如果未找到多币种价格则回退到基础币种（USD）
6. **购物车计算**：购物车总额在整个结账流程中使用所选币种计算

### WordPress 多币种设置

商品需要设置 `multi_currency_prices` 元数据，结构如下：

```
multi_currency_prices: {
  EUR: { regular_price: "24.99", sale_price: "19.99", price: "19.99" },
  GBP: { regular_price: "21.99", sale_price: "17.99", price: "17.99" }
}
```

可通过 WordPress 插件或自定义代码为商品和变体添加此元数据。

## 前置要求

开始之前，请确保你已准备好：

- **Node.js 18+**（推荐 Node.js 20）
- **npm**、**yarn**、**pnpm** 或 **bun**
- **WordPress 站点**，并安装以下插件：
  - [WooCommerce](https://woocommerce.com/) — 电商功能
  - [WPGraphQL](https://www.wpgraphql.com/) — GraphQL API
  - [JWT Authentication for WP REST API](https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/) — 用户认证

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/wpacademy/nextjs-woocommerce-frontend.git
cd nextjs-woocommerce-frontend
```

### 2. 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 3. 配置环境变量

复制示例环境文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的配置：

```env
# =================================
# WordPress 配置
# =================================
NEXT_PUBLIC_WORDPRESS_URL=https://your-wordpress-site.com
NEXT_PUBLIC_GRAPHQL_URL=https://your-wordpress-site.com/graphql

# =================================
# WooCommerce REST API
# =================================
WC_CONSUMER_KEY=ck_your_consumer_key
WC_CONSUMER_SECRET=cs_your_consumer_secret

# =================================
# JWT 认证
# =================================
JWT_SECRET=your-jwt-secret-key

# =================================
# 前端地址
# =================================
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# =================================
# Stripe
# =================================
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx

# =================================
# PayPal
# =================================
NEXT_PUBLIC_PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_API_BASE=sandbox
```

### 4. 运行开发服务器

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

## WordPress 设置

### WooCommerce REST API 密钥

1. 进入 **WooCommerce > 设置 > 高级 > REST API**
2. 点击 **添加密钥**
3. 设置**描述**（例如 "Headless Frontend"）
4. **用户**选择管理员账号
5. **权限**设置为 **读取/写入**
6. 点击 **生成 API 密钥**
7. 复制 **Consumer Key** 和 **Consumer Secret** 到你的 `.env.local`

### JWT 认证设置

1. 安装并启用 [JWT Authentication 插件](https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/)
2. 在你的 `wp-config.php` 中添加：

```php
define('JWT_AUTH_SECRET_KEY', 'your-unique-secret-key');
define('JWT_AUTH_CORS_ENABLE', true);
```

3. 在你的 `.htaccess`（Apache）或 nginx 配置中添加：

```apache
RewriteEngine on
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule ^(.*) - [E=HTTP_AUTHORIZATION:%1]
```

### WPGraphQL 设置

1. 安装并启用 [WPGraphQL](https://www.wpgraphql.com/)
2. 安装 [WPGraphQL for WooCommerce](https://github.com/wp-graphql/wp-graphql-woocommerce)（可选，用于 GraphQL 商品查询）
3. 在 `https://your-site.com/graphql` 测试你的 GraphQL 端点

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产环境 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint |

## 部署

### 部署到 Vercel

部署此 Next.js 应用最简单的方式：

1. 将代码推送到 GitHub/GitLab/Bitbucket
2. 访问 [vercel.com](https://vercel.com) 并登录
3. 点击 **"Add New Project"**
4. 导入你的仓库
5. 配置环境变量 — 添加 `.env.local` 中的所有变量
6. 确保 `NEXT_PUBLIC_SITE_URL` 指向你的 Vercel 域名
7. 点击 **Deploy**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/wpacademy/nextjs-woocommerce-frontend)

### 部署到 Netlify

1. 将代码推送到 GitHub/GitLab/Bitbucket
2. 访问 [netlify.com](https://netlify.com) 并登录
3. 点击 **"Add new site"** > **"Import an existing project"**
4. 连接你的仓库
5. 配置构建设置：
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
6. 在 **Site settings > Environment variables** 中添加环境变量
7. 安装 **Next.js 插件**：
   - 进入 **Plugins** > 搜索 "Next.js" > 安装 **@netlify/plugin-nextjs**
8. 点击 **Deploy site**

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/wpacademy/nextjs-woocommerce-frontend)

**Netlify 配置（`netlify.toml`）：**

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### 使用 Docker 部署

使用 Docker 构建并运行：

```bash
# 构建镜像
docker build -t headless-wp-frontend .

# 运行容器
docker run -p 3000:3000 --env-file .env.local headless-wp-frontend
```

或者使用 Docker Compose：

```bash
docker-compose up
```

### 部署到其他平台

本项目输出独立构建产物，兼容以下平台：

- **Railway** — 连接仓库、添加环境变量、部署
- **Render** — 使用 Docker 或 Node.js 环境
- **DigitalOcean App Platform** — 连接仓库、配置环境变量
- **AWS Amplify** — 从 Git 导入、添加环境变量
- **Google Cloud Run** — 使用项目内置的 Dockerfile

## 配置

### 图片域名

要允许加载来自 WordPress 站点的图片，请更新 `next.config.ts`：

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'your-wordpress-site.com',
    },
    {
      protocol: 'https',
      hostname: '*.wp.com',
    },
  ],
},
```

### CORS 配置

确保你的 WordPress 站点允许来自前端域名的请求。在 `wp-config.php` 中添加：

```php
header("Access-Control-Allow-Origin: https://your-frontend-domain.com");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
```

或者使用 CORS 插件，例如 [WP CORS](https://wordpress.org/plugins/wp-cors/)。

## 故障排除

### 常见问题

**CORS 错误**
- 确保 WordPress 允许你的前端来源
- 检查 JWT 插件的 CORS 设置
- 验证 `.htaccess` 配置

**401 未授权错误**
- 验证 WooCommerce API 凭据
- 检查 API 密钥是否具有读取/写入权限
- 确保 API 密钥关联的用户是管理员

**GraphQL 错误**
- 验证 WPGraphQL 插件已启用
- 在 `your-site.com/graphql` 测试查询
- 检查 WordPress 中的 PHP 错误

**图片无法加载**
- 将你的 WordPress 域名添加到 `next.config.ts` 的 remotePatterns 中
- 确保图片可公开访问

**购物车未持久化**
- 检查浏览器是否启用了 localStorage
- 清除 localStorage 后重试

### Stripe Webhook 调试

**Webhook 未收到：**
- 验证 webhook URL 是否可以公开访问（不能是 `localhost`）
- 使用 Stripe CLI 在本地转发事件：`stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- 在 Stripe 管理后台 **Developers > Webhooks** 中查看最近的投递记录

**签名验证失败：**
- 确保 `STRIPE_WEBHOOK_SECRET` 与 Stripe 管理后台的签名密钥一致
- 如果在 Stripe 管理后台重新生成密钥，请重新复制

**支付后订单未更新：**
- 验证 `order_id` 已正确传递到 Stripe session 的 metadata 中
- 检查 webhook 处理器的日志，确认幂等性检查

### PayPal 沙箱测试

**使用沙箱账户：**
1. 在 [developer.paypal.com](https://developer.paypal.com) 创建沙箱买家/卖家账户
2. 在 `.env.local` 中设置 `PAYPAL_API_BASE=sandbox`
3. 使用沙箱买家凭证进行测试支付

**常见 PayPal 问题：**
- 确保 `NEXT_PUBLIC_PAYPAL_CLIENT_ID` 与你在 PayPal Developer Dashboard 中创建的应用一致
- 检查 `PAYPAL_API_BASE` 是否与环境匹配（sandbox 或 live）
- 如果捕获失败，检查 WooCommerce 订单是否已在 PayPal 订单之前创建

### 多币种价格同步

**价格未按所选币种显示：**
- 验证商品在 WordPress 中已设置 `multi_currency_prices` 元数据
- 检查元数据结构是否符合预期格式（参见[多币种章节](#多币种)）
- 基础币种为 USD — 没有多币种价格的商品将显示 USD 价格

**GeoIP 检测不准确：**
- 如果使用 Cloudflare，确保 `cf-ipcountry` 请求头已正确转发
- IP 检测 API（`ipapi.co`）每天有 1000 次请求的限制
- 币种偏好会持久化到 localStorage，优先级高于 GeoIP 检测

## 贡献

欢迎提交 Pull Request 参与贡献！

1. Fork 本仓库
2. 创建你的功能分支（`git checkout -b feature/amazing-feature`）
3. 提交你的更改（`git commit -m 'Add some amazing feature'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 打开一个 Pull Request

## 许可证

本项目是开源项目，基于 [GPL 3.0](LICENSE) 许可证发布。

## 致谢

- [Next.js](https://nextjs.org/) — React 框架
- [WooCommerce](https://woocommerce.com/) — WordPress 电商解决方案
- [WPGraphQL](https://www.wpgraphql.com/) — WordPress 的 GraphQL API
- [Tailwind CSS](https://tailwindcss.com/) — 实用优先的 CSS 框架
- [Zustand](https://github.com/pmndrs/zustand) — 状态管理
- [Stripe](https://stripe.com/) — 支付处理
- [PayPal](https://developer.paypal.com/) — 支付处理
