# Headless WordPress 电商前端

一个基于 **Next.js 16**、**React 19** 和 **Tailwind CSS v4** 构建的现代化、高性能无头电商店铺前端。以 WordPress/WooCommerce 作为无头 CMS 来管理内容和商品。

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss)

![GitHub stars](https://img.shields.io/github/stars/wpacademy/nextjs-woocommerce-frontend?style=social)
![GitHub forks](https://img.shields.io/github/forks/wpacademy/nextjs-woocommerce-frontend?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/wpacademy/nextjs-woocommerce-frontend?style=social)
![GitHub license](https://img.shields.io/github/license/wpacademy/nextjs-woocommerce-frontend)

<img width="1920" height="1080" alt="preview" src="https://github.com/user-attachments/assets/26009a55-84aa-4a17-9f45-164299fc1f4a" />

**[在线演示](https://nextjs-woocommerce-frontend-ochre.vercel.app/)**

## 功能特性

- **无头架构** - 前后端分离，后端使用 WordPress/WooCommerce
- **服务端渲染** - 使用 Next.js App Router 实现快速的首屏加载
- **商品目录** - 支持按分类、筛选条件和搜索浏览商品
- **可变商品** - 支持商品变体（尺寸、颜色等）
- **购物车** - 基于 localStorage 的持久化购物车
- **用户认证** - 基于 JWT 的登录、注册和账户管理
- **结账流程** - 通过 WooCommerce 完成订单处理
- **响应式设计** - 移动优先，适配所有设备
- **图片优化** - 使用 Next.js Image 自动优化图片

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16.1.6 (App Router) |
| UI 库 | React 19.2.3 |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand 5.0.11 |
| 表单 | React Hook Form + Zod |
| 动画 | Framer Motion |
| 语言 | TypeScript 5（严格模式）|

## 前置要求

开始之前，请确保你已准备好：

- **Node.js 18+**（推荐 Node.js 20）
- **npm**、**yarn**、**pnpm** 或 **bun**
- **WordPress 站点**，并安装以下插件：
  - [WooCommerce](https://woocommerce.com/) - 电商功能
  - [WPGraphQL](https://www.wpgraphql.com/) - GraphQL API
  - [JWT Authentication for WP REST API](https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/) - 用户认证

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

编辑 `.env.local`，填入你的 WordPress 配置：

```env
# WordPress 配置
NEXT_PUBLIC_WORDPRESS_URL=https://your-wordpress-site.com
NEXT_PUBLIC_GRAPHQL_URL=https://your-wordpress-site.com/graphql

# WooCommerce REST API（来自 WooCommerce > 设置 > 高级 > REST API）
WC_CONSUMER_KEY=ck_your_consumer_key
WC_CONSUMER_SECRET=cs_your_consumer_secret

# JWT 密钥（必须与 wp-config.php 中的 JWT_AUTH_SECRET_KEY 一致）
JWT_SECRET=your-jwt-secret-key

# 前端地址
NEXT_PUBLIC_SITE_URL=http://localhost:3000
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

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── account/           # 用户账户页面
│   ├── product/[slug]/    # 商品详情页
│   ├── shop/              # 商品列表
│   ├── cart/              # 购物车
│   ├── checkout/          # 结账流程
│   └── layout.tsx         # 根布局
├── components/
│   ├── layout/            # 头部、底部
│   ├── product/           # 商品组件
│   ├── cart/              # 购物车组件
│   └── ui/                # 可复用 UI 组件
├── lib/
│   ├── graphql.ts         # GraphQL 客户端
│   ├── woocommerce.ts     # WooCommerce API 客户端
│   ├── auth.ts            # 认证工具
│   └── utils.ts           # 辅助函数
├── stores/                # Zustand 状态仓库
└── types/                 # TypeScript 类型定义
```

## 部署

### 部署到 Vercel

部署此 Next.js 应用最简单的方式：

1. 将代码推送到 GitHub/GitLab/Bitbucket
2. 访问 [vercel.com](https://vercel.com) 并登录
3. 点击 **"Add New Project"**
4. 导入你的仓库
5. 配置环境变量：
   - 添加 `.env.local` 中的所有变量
   - 确保 `NEXT_PUBLIC_SITE_URL` 指向你的 Vercel 域名
6. 点击 **Deploy**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/wpacademy/nextjs-woocommerce-frontend)

**Vercel 环境变量：**

```
NEXT_PUBLIC_WORDPRESS_URL=https://your-wordpress-site.com
NEXT_PUBLIC_GRAPHQL_URL=https://your-wordpress-site.com/graphql
WC_CONSUMER_KEY=ck_xxxxx
WC_CONSUMER_SECRET=cs_xxxxx
JWT_SECRET=your-secret
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

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

在项目根目录创建 `netlify.toml` 文件：

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Netlify 环境变量：**

在 **Site settings > Environment variables** 中添加：

```
NEXT_PUBLIC_WORDPRESS_URL=https://your-wordpress-site.com
NEXT_PUBLIC_GRAPHQL_URL=https://your-wordpress-site.com/graphql
WC_CONSUMER_KEY=ck_xxxxx
WC_CONSUMER_SECRET=cs_xxxxx
JWT_SECRET=your-secret
NEXT_PUBLIC_SITE_URL=https://your-app.netlify.app
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

- **Railway** - 连接仓库、添加环境变量、部署
- **Render** - 使用 Docker 或 Node.js 环境
- **DigitalOcean App Platform** - 连接仓库、配置环境变量
- **AWS Amplify** - 从 Git 导入、添加环境变量
- **Google Cloud Run** - 使用项目内置的 Dockerfile

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

- [Next.js](https://nextjs.org/) - React 框架
- [WooCommerce](https://woocommerce.com/) - WordPress 电商解决方案
- [WPGraphQL](https://www.wpgraphql.com/) - WordPress 的 GraphQL API
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [Zustand](https://github.com/pmndrs/zustand) - 状态管理
