import { notFound } from 'next/navigation';
import { getPageBySlug } from '@/lib/graphql';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * [slug] 动态页面
 *
 * 使用 force-dynamic 避免构建时预渲染所有 WordPress 页面，
 * 改为运行时按需渲染。这样即使 WordPress 在构建时不可达，构建也能正常通过。
 *
 * WordPress 所有页面（隐私政策、服务条款等）通过此路由处理。
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const page = await getPageBySlug(slug);

    if (!page) {
      return { title: 'Page Not Found' };
    }

    // Extract description from content (first paragraph)
    const description = page.content?.replace(/<[^>]*>/g, '').slice(0, 160) || undefined;

    return {
      title: page.title,
      description,
      openGraph: {
        title: page.title,
        description,
        images: page.featuredImage?.node?.sourceUrl
          ? [{ url: page.featuredImage.node.sourceUrl }]
          : [],
      },
    };
  } catch {
    // WordPress 不可达时，仍然显示页面（标题降级为 slug）
    return { title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }
  }
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;

  // Skip reserved routes
  const reservedSlugs = ['shop', 'product', 'cart', 'checkout', 'account', 'api'];
  if (reservedSlugs.includes(slug)) {
    notFound();
  }

  // Determine page type for specific styling
  const isLegalPage = [
    'privacy-policy', 'privacy', 'terms', 'terms-of-service',
    'terms-and-conditions', 'cookie-policy', 'refund-and-returns-policy',
  ].includes(slug);

  let page;
  try {
    page = await getPageBySlug(slug);
  } catch {
    // WordPress 不可达时返回 404
    notFound();
  }

  if (!page) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8 lg:py-16">
      <article>
        <header className="mb-10 border-b border-gray-200 pb-8">
          <h1 className="text-3xl font-light tracking-tight lg:text-4xl">{page.title}</h1>
          {page.modified && (
            <p className="mt-3 text-sm text-gray-500">
              Last updated: {new Date(page.modified).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}
        </header>

        <div
          className={`wp-content page-content ${isLegalPage ? 'legal-content' : ''}`}
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </article>
    </div>
  );
}
