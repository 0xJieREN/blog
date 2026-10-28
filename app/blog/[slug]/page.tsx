import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CustomMDX } from 'app/components/mdx'
import { formatDate, getBlogPosts } from 'app/blog/utils'
import { baseUrl } from 'app/sitemap'

export async function generateStaticParams() {
  let posts = getBlogPosts()

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }) {
  let { slug } = await params
  let post = getBlogPosts().find((post) => post.slug === slug)
  if (!post) {
    return
  }

  let {
    title,
    publishedAt: publishedTime,
    summary: description,
    image,
  } = post.metadata
  let ogImage = image
    ? image
    : `${baseUrl}/og?title=${encodeURIComponent(title)}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime,
      url: `${baseUrl}/blog/${post.slug}`,
      images: [
        {
          url: ogImage,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

function ArrowUpLeft() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.5 9.5 2.5 2.5M2.5 8V2.5H8" />
    </svg>
  )
}

export default async function Blog({ params }) {
  let { slug } = await params
  let posts = getBlogPosts().sort(
    (a, b) =>
      new Date(b.metadata.publishedAt).getTime() -
      new Date(a.metadata.publishedAt).getTime()
  )
  let index = posts.findIndex((post) => post.slug === slug)
  let post = posts[index]

  if (!post) {
    notFound()
  }

  let older = posts[index + 1]
  let newer = posts[index - 1]

  return (
    <section className="article-page">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.metadata.title,
            datePublished: post.metadata.publishedAt,
            dateModified: post.metadata.publishedAt,
            description: post.metadata.summary,
            image: post.metadata.image
              ? `${baseUrl}${post.metadata.image}`
              : `/og?title=${encodeURIComponent(post.metadata.title)}`,
            url: `${baseUrl}/blog/${post.slug}`,
            author: {
              '@type': 'Person',
              name: '杰',
            },
          }),
        }}
      />
      <Link className="article-back" href="/blog">
        <ArrowUpLeft />
        文章
      </Link>
      <header className="article-header">
        <h1>{post.metadata.title}</h1>
        <time className="article-meta" dateTime={post.metadata.publishedAt}>
          {formatDate(post.metadata.publishedAt)}
        </time>
      </header>
      <article className="prose">
        <CustomMDX source={post.content} />
      </article>
      {(older || newer) && (
        <nav className="article-pager" aria-label="更多文章">
          {older && (
            <Link href={`/blog/${older.slug}`} data-direction="previous">
              <span>上一篇</span>
              <strong>{older.metadata.title}</strong>
            </Link>
          )}
          {newer && (
            <Link href={`/blog/${newer.slug}`} data-direction="next">
              <span>下一篇</span>
              <strong>{newer.metadata.title}</strong>
            </Link>
          )}
        </nav>
      )}
    </section>
  )
}
