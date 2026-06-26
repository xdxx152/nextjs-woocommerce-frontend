# Headless WordPress E-Commerce Frontend (NovaFabric)

A modern, production-ready headless e-commerce storefront built with **Next.js 16**, **React 19**, and **Tailwind CSS v4**. Connects to WordPress/WooCommerce as a headless CMS for content and product management. Features multi-currency support, multiple payment gateways, and a rich, animated user interface.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06D6B4?logo=tailwindcss)
![Stripe](https://img.shields.io/badge/Stripe-payments-008CDD?logo=stripe)
![PayPal](https://img.shields.io/badge/PayPal-payments-00457C?logo=paypal)

![GitHub stars](https://img.shields.io/github/stars/wpacademy/nextjs-woocommerce-frontend?style=social)
![GitHub forks](https://img.shields.io/github/forks/wpacademy/nextjs-woocommerce-frontend?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/wpacademy/nextjs-woocommerce-frontend?style=social)
![GitHub license](https://img.shields.io/github/license/wpacademy/nextjs-woocommerce-frontend)

**[Live Demo](https://nextjs-woocommerce-frontend-ochre.vercel.app/)**

## Features

- **Headless Architecture** — Decoupled frontend with WordPress/WooCommerce backend
- **Server-Side Rendering** — Fast initial page loads with Next.js App Router
- **Product Catalog** — Browse products with categories, filters, and search
- **Variable Products** — Support for product variations (size, color, etc.)
- **Shopping Cart** — Persistent cart with localStorage
- **User Authentication** — JWT-based login, registration, and account management
- **Checkout Flow** — Complete order processing through WooCommerce
- **Responsive Design** — Mobile-first design that works on all devices
- **Image Optimization** — Automatic image optimization with Next.js Image
- **Multi-Currency Support** — USD / EUR / GBP with GeoIP auto-detection + manual switching
- **Payment System** — Stripe (credit/debit cards), PayPal, Bank Transfer (BACS for UK/DE/US banks), Cash on Delivery (COD)
- **Home Hero Slider** — Animated carousel banner component with Framer Motion
- **Contact Page** — Contact form integrated with Contact Form 7
- **Order Confirmation** — Detailed order summary after payment completion
- **Order Status Polling** — Automatic polling for payment processing status
- **Category Browsing** — Filter products by category with dedicated pages
- **Product Search** — Real-time search API with debounced input
- **Shipping Calculator** — Real-time shipping rate quotes based on delivery address

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| UI Library | React 19.2.3 |
| Styling | Tailwind CSS v4 |
| State Management | Zustand 5.0.11 |
| Forms | React Hook Form + Zod |
| Animation | Framer Motion |
| Payment (Stripe) | `@stripe/stripe-js` + `stripe` |
| Payment (PayPal) | `@paypal/react-paypal-js` |
| Dates | `date-fns` |
| Language | TypeScript 5 (strict mode) |

## Project Structure

```
src/
├── app/                                  # Next.js App Router pages & API routes
│   ├── layout.tsx                        # Root layout with providers
│   ├── page.tsx                          # Homepage (hero slider + featured products)
│   ├── globals.css                       # Global CSS with Tailwind
│   │
│   ├── [slug]/                           # WordPress page catch-all (about, etc.)
│   │   └── page.tsx
│   │
│   ├── account/                          # User account pages
│   │   ├── page.tsx                      # Account dashboard
│   │   ├── login/page.tsx                # Login page
│   │   ├── register/page.tsx             # Registration page
│   │   ├── forgot-password/page.tsx      # Password reset
│   │   ├── details/page.tsx              # Account details
│   │   ├── addresses/page.tsx            # Billing/shipping addresses
│   │   ├── orders/page.tsx               # Order history
│   │   └── orders/[id]/page.tsx          # Single order details
│   │
│   ├── api/                              # API routes (server-side only)
│   │   ├── account/                      # User account CRUD
│   │   │   ├── addresses/route.ts
│   │   │   ├── orders/route.ts
│   │   │   ├── orders/[id]/route.ts
│   │   │   ├── password/route.ts
│   │   │   └── update/route.ts
│   │   ├── auth/                         # Authentication
│   │   │   ├── register/route.ts
│   │   │   └── forgot-password/route.ts
│   │   ├── categories/route.ts           # Category listing
│   │   ├── checkout/                     # Payment processing
│   │   │   ├── stripe/route.ts           # Stripe Checkout Session
│   │   │   └── paypal/
│   │   │       ├── create-order/route.ts # Create PayPal order
│   │   │       └── capture/route.ts      # Capture PayPal payment
│   │   ├── orders/route.ts               # Create order
│   │   ├── orders/[id]/route.ts          # Fetch order by ID (status polling)
│   │   ├── products/search/route.ts      # Product search
│   │   ├── shipping/rates/route.ts       # Shipping rate calculation
│   │   └── webhooks/stripe/route.ts      # Stripe webhook handler
│   │
│   ├── cart/page.tsx                     # Cart page
│   ├── checkout/page.tsx                 # Checkout page
│   ├── contact/page.tsx                  # Contact form page
│   ├── order-confirmation/[id]/page.tsx  # Order confirmation page
│   ├── product/[slug]/page.tsx           # Product detail page
│   ├── shop/page.tsx                     # Shop / product listing
│   └── shop/[category]/page.tsx          # Category-specific product listing
│
├── components/
│   ├── providers.tsx                      # Root provider composition
│   │
│   ├── cart/
│   │   └── cart-drawer.tsx               # Slide-out cart drawer
│   │
│   ├── checkout/
│   │   ├── bank-transfer-instructions.tsx # BACS bank details display
│   │   ├── order-status-banner.tsx       # Order status notification
│   │   ├── order-status-poller.tsx       # Auto-poll order processing status
│   │   ├── payment-method-selector.tsx   # Payment method radio selector
│   │   ├── paypal-button.tsx             # PayPal Smart Button integration
│   │   └── stripe-poller-wrapper.tsx     # Stripe payment + status poller
│   │
│   ├── home/
│   │   └── hero-slider.tsx               # Animated hero carousel (Framer Motion)
│   │
│   ├── layout/
│   │   ├── header.tsx                    # Site header (nav, cart, currency, search)
│   │   ├── footer.tsx                    # Site footer
│   │   └── search.tsx                    # Search overlay/input
│   │
│   ├── product/
│   │   ├── product-card.tsx              # Product card (grid item)
│   │   ├── product-gallery.tsx           # Product image gallery
│   │   ├── product-grid.tsx              # Product grid layout
│   │   └── product-info.tsx              # Product details (variations, add-to-cart)
│   │
│   ├── providers/
│   │   ├── currency-provider.tsx         # Currency context & GeoIP detection
│   │   └── paypal-provider.tsx           # PayPal SDK provider wrapper
│   │
│   └── ui/
│       ├── button.tsx                    # Reusable button (variants: primary/outline/ghost)
│       ├── currency-selector.tsx         # Currency switch dropdown
│       ├── input.tsx                     # Styled input component
│       ├── price-display.tsx             # Currency-aware price display
│       └── skeleton.tsx                  # Loading skeleton component
│
├── lib/                                  # Utilities & API clients
│   ├── auth.ts                           # JWT auth helpers
│   ├── bacs-accounts.ts                  # BACS bank account data (UK/DE/US)
│   ├── currency.ts                       # Multi-currency config & GeoIP detection
│   ├── graphql.ts                        # GraphQL fetch client
│   ├── hooks.ts                          # Shared React hooks (useMounted)
│   ├── paypal.ts                         # PayPal REST API v2 server-side client
│   ├── stripe.ts                         # Stripe server-side client & helpers
│   ├── utils.ts                          # Shared utility functions (cn)
│   └── woocommerce.ts                    # WooCommerce REST API client
│
├── stores/                               # Zustand state stores
│   ├── auth-store.ts                     # Authentication state (persisted)
│   ├── cart-store.ts                     # Shopping cart state (persisted)
│   ├── currency-store.ts                 # Currency preference (persisted)
│   └── ui-store.ts                       # UI state (mobile menu, modals, etc.)
│
└── types/
    └── woocommerce.ts                    # TypeScript type definitions (WC API v3)
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with hero slider, featured categories, and new products |
| `/shop` | Product listing with pagination and filters |
| `/shop/[category]` | Category-filtered product listing |
| `/product/[slug]` | Single product detail with variations gallery |
| `/cart` | Full cart view with quantity management |
| `/checkout` | Multi-step checkout (address, shipping, payment) |
| `/order-confirmation/[id]` | Order confirmation after successful payment |
| `/contact` | Contact form page |
| `/account` | Account dashboard |
| `/account/login` | User login |
| `/account/register` | User registration |
| `/account/forgot-password` | Password reset |
| `/account/details` | Edit account details |
| `/account/addresses` | Manage billing/shipping addresses |
| `/account/orders` | Order history |
| `/account/orders/[id]` | Single order details |

## API Routes Reference

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/register` | POST | Register a new user |
| `/api/auth/forgot-password` | POST | Send password reset email |
| `/api/account/update` | POST | Update account details |
| `/api/account/password` | POST | Change password |
| `/api/account/addresses` | GET/POST | List/update addresses |
| `/api/account/orders` | GET | List customer orders |
| `/api/account/orders/[id]` | GET | Get single order |
| `/api/categories` | GET | List all categories |
| `/api/products/search` | GET | Real-time product search |
| `/api/orders` | POST | Create a new order |
| `/api/orders/[id]` | GET | Fetch order by ID (used by status poller) |
| `/api/checkout/stripe` | POST | Create Stripe Checkout Session |
| `/api/checkout/paypal/create-order` | POST | Create PayPal order |
| `/api/checkout/paypal/capture` | POST | Capture PayPal payment |
| `/api/shipping/rates` | POST | Calculate shipping rates |
| `/api/webhooks/stripe` | POST | Stripe webhook receiver |

## Payment Methods

### Stripe

Stripe handles credit/debit card payments via Checkout Sessions. The flow:

1. Checkout page collects address and shipping info, creates a WooCommerce order
2. `POST /api/checkout/stripe` creates a Stripe Checkout Session and returns a redirect URL
3. Customer is redirected to Stripe's hosted checkout page to complete card payment
4. After payment, customer is redirected back to `order-confirmation/[id]`
5. Stripe sends a `checkout.session.completed` webhook to `/api/webhooks/stripe`
6. Webhook handler updates WooCommerce order status to `processing`

**Webhook setup:** Configure your Stripe dashboard to send events to `{SITE_URL}/api/webhooks/stripe`. Required events:
- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`

### PayPal

PayPal payments use the PayPal Orders v2 API:

1. `POST /api/checkout/paypal/create-order` creates a PayPal order server-side
2. Frontend renders the PayPal Smart Button via `@paypal/react-paypal-js`
3. User approves in the PayPal popup
4. `POST /api/checkout/paypal/capture` captures the payment server-side
5. On success, WooCommerce order is updated to `processing`

### Bank Transfer (BACS)

BACS is available for offline bank transfers. The project includes pre-configured bank accounts for three regions:

| Region | Currency | Bank |
|--------|----------|------|
| United Kingdom | GBP | Barclays Bank |
| Germany (EU) | EUR | Commerzbank |
| United States | USD | JPMorgan Chase |

Bank details are displayed after order placement via the [`BankTransferInstructions`](src/components/checkout/bank-transfer-instructions.tsx) component. Configuration lives in [`src/lib/bacs-accounts.ts`](src/lib/bacs-accounts.ts).

### Cash on Delivery (COD)

COD is available in WooCommerce as a standard payment gateway. No additional configuration is required beyond enabling it in WooCommerce settings.

## Multi-Currency

### Supported Currencies

| Currency | Code | Symbol | Locale |
|----------|------|--------|--------|
| US Dollar | USD | $ | en-US |
| Euro | EUR | € | de-DE |
| British Pound | GBP | £ | en-GB |

### How It Works

1. **GeoIP Detection**: When a user visits the site, the [`CurrencyProvider`](src/components/providers/currency-provider.tsx) detects their country via:
   - Cloudflare `cf-ipcountry` header (when behind Cloudflare CDN)
   - Client-side IP geolocation via `ipapi.co`
2. **Automatic Selection**: The detected country is mapped to a supported currency (EU → EUR, UK → GBP, rest → USD)
3. **Manual Override**: Users can switch currencies via the [`CurrencySelector`](src/components/ui/currency-selector.tsx) component
4. **Persistence**: Currency preference is persisted in localStorage via [`currencyStore`](src/stores/currency-store.ts)
5. **Price Resolution**: The [`resolveProductPrice()`](src/lib/currency.ts) function checks product-level `multi_currency_prices` metadata and falls back to base currency (USD) if no multi-currency price is found
6. **Cart Calculation**: Cart totals are calculated in the selected currency throughout the checkout flow

### WordPress Setup for Multi-Currency

Products need `multi_currency_prices` metadata assigned. This is structured as:

```
multi_currency_prices: {
  EUR: { regular_price: "24.99", sale_price: "19.99", price: "19.99" },
  GBP: { regular_price: "21.99", sale_price: "17.99", price: "17.99" }
}
```

Configure this via a WordPress plugin or custom code that adds the metadata to products and variations.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** (recommended: Node.js 20)
- **npm**, **yarn**, **pnpm**, or **bun**
- **WordPress site** with the following plugins:
  - [WooCommerce](https://woocommerce.com/) — E-commerce functionality
  - [WPGraphQL](https://www.wpgraphql.com/) — GraphQL API
  - [JWT Authentication for WP REST API](https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/) — User authentication

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/wpacademy/nextjs-woocommerce-frontend.git
cd nextjs-woocommerce-frontend
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# =================================
# WordPress Configuration
# =================================
NEXT_PUBLIC_WORDPRESS_URL=https://your-wordpress-site.com
NEXT_PUBLIC_GRAPHQL_URL=https://your-wordpress-site.com/graphql

# =================================
# WooCommerce REST API
# =================================
WC_CONSUMER_KEY=ck_your_consumer_key
WC_CONSUMER_SECRET=cs_your_consumer_secret

# =================================
# JWT Authentication
# =================================
JWT_SECRET=your-jwt-secret-key

# =================================
# Frontend URLs
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

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## WordPress Setup

### WooCommerce REST API Keys

1. Go to **WooCommerce > Settings > Advanced > REST API**
2. Click **Add Key**
3. Set **Description** (e.g., "Headless Frontend")
4. Set **User** to an admin user
5. Set **Permissions** to **Read/Write**
6. Click **Generate API Key**
7. Copy the **Consumer Key** and **Consumer Secret** to your `.env.local`

### JWT Authentication Setup

1. Install and activate the [JWT Authentication plugin](https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/)
2. Add to your `wp-config.php`:

```php
define('JWT_AUTH_SECRET_KEY', 'your-unique-secret-key');
define('JWT_AUTH_CORS_ENABLE', true);
```

3. Add to your `.htaccess` (Apache) or nginx config:

```apache
RewriteEngine on
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule ^(.*) - [E=HTTP_AUTHORIZATION:%1]
```

### WPGraphQL Setup

1. Install and activate [WPGraphQL](https://www.wpgraphql.com/)
2. Install [WPGraphQL for WooCommerce](https://github.com/wp-graphql/wp-graphql-woocommerce) (optional, for GraphQL product queries)
3. Test your GraphQL endpoint at `https://your-site.com/graphql`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Deployment

### Deploy to Vercel

The easiest way to deploy this Next.js app:

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click **"Add New Project"**
4. Import your repository
5. Configure environment variables — add all variables from `.env.local`
6. Ensure `NEXT_PUBLIC_SITE_URL` points to your Vercel domain
7. Click **Deploy**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/wpacademy/nextjs-woocommerce-frontend)

### Deploy to Netlify

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [netlify.com](https://netlify.com) and sign in
3. Click **"Add new site"** > **"Import an existing project"**
4. Connect your repository
5. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
6. Add environment variables in **Site settings > Environment variables**
7. Install the **Next.js plugin**:
   - Go to **Plugins** > Search "Next.js" > Install **@netlify/plugin-nextjs**
8. Click **Deploy site**

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/wpacademy/nextjs-woocommerce-frontend)

**Netlify Configuration (`netlify.toml`):**

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Deploy with Docker

Build and run with Docker:

```bash
# Build the image
docker build -t headless-wp-frontend .

# Run the container
docker run -p 3000:3000 --env-file .env.local headless-wp-frontend
```

Or use Docker Compose:

```bash
docker-compose up
```

### Deploy to Other Platforms

This project outputs a standalone build, making it compatible with:

- **Railway** — Connect repo, add env vars, deploy
- **Render** — Use Docker or Node.js environment
- **DigitalOcean App Platform** — Connect repo, configure env vars
- **AWS Amplify** — Import from Git, add env vars
- **Google Cloud Run** — Use the included Dockerfile

## Configuration

### Image Domains

To allow images from your WordPress site, update `next.config.ts`:

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

### CORS Configuration

Ensure your WordPress site allows requests from your frontend domain. Add to `wp-config.php`:

```php
header("Access-Control-Allow-Origin: https://your-frontend-domain.com");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
```

Or use a CORS plugin like [WP CORS](https://wordpress.org/plugins/wp-cors/).

## Troubleshooting

### Common Issues

**CORS Errors**
- Ensure WordPress allows your frontend origin
- Check JWT plugin CORS settings
- Verify `.htaccess` configuration

**401 Unauthorized Errors**
- Verify WooCommerce API credentials
- Check that API keys have Read/Write permissions
- Ensure the user associated with API keys is an admin

**GraphQL Errors**
- Verify WPGraphQL plugin is active
- Test queries at `your-site.com/graphql`
- Check for PHP errors in WordPress

**Images Not Loading**
- Add your WordPress domain to `next.config.ts` remote patterns
- Ensure images are publicly accessible

**Cart Not Persisting**
- Check browser localStorage is enabled
- Clear localStorage and try again

### Stripe Webhook Debugging

**Webhook not being received:**
- Verify the webhook URL is publicly accessible (not `localhost`)
- Use Stripe CLI to forward events locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Check Stripe Dashboard **Developers > Webhooks** for recent delivery attempts

**Signature verification failure:**
- Ensure `STRIPE_WEBHOOK_SECRET` matches the signing secret in Stripe Dashboard
- Re-copy the secret if you regenerate it in the Stripe Dashboard

**Order not updating after payment:**
- Verify the `order_id` is correctly passed in the Stripe session metadata
- Check the webhook handler logs for idempotency checks

### PayPal Sandbox Testing

**Using sandbox accounts:**
1. Create sandbox buyer/seller accounts at [developer.paypal.com](https://developer.paypal.com)
2. Set `PAYPAL_API_BASE=sandbox` in your `.env.local`
3. Use the sandbox buyer credentials to make test payments

**Common PayPal Issues:**
- Ensure `NEXT_PUBLIC_PAYPAL_CLIENT_ID` matches the application you created in the PayPal Developer Dashboard
- Check the PAYPAL_API_BASE matches your environment (sandbox vs live)
- If capture fails, check the WooCommerce order was created before the PayPal order

### Multi-Currency Price Synchronization

**Prices not showing in selected currency:**
- Verify the product has `multi_currency_prices` metadata set in WordPress
- Check the metadata structure matches the expected format (see [Multi-Currency section](#multi-currency))
- The base currency is USD — products without multi-currency prices will display USD prices

**GeoIP not detecting correctly:**
- If using Cloudflare, ensure the `cf-ipcountry` header is being forwarded
- The IP detection API (`ipapi.co`) has a rate limit of 1000 requests/day
- Currency preference is persisted in localStorage and takes priority over GeoIP

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [GPL 3.0](LICENSE).

## Acknowledgments

- [Next.js](https://nextjs.org/) — The React Framework
- [WooCommerce](https://woocommerce.com/) — E-commerce for WordPress
- [WPGraphQL](https://www.wpgraphql.com/) — GraphQL API for WordPress
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Zustand](https://github.com/pmndrs/zustand) — State management
- [Stripe](https://stripe.com/) — Payment processing
- [PayPal](https://developer.paypal.com/) — Payment processing
