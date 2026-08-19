import Link from 'next/link'
import { formatDate, getBlogPosts } from 'app/blog/utils'

export function BlogPosts() {
  let allBlogs = getBlogPosts()

  if (allBlogs.length === 0) {
    return (
      <div className="empty-posts">
        <h3>这里暂时还是空的。</h3>
        <p>第一篇文章正在整理，很快会有一些认真写下的东西。</p>
      </div>
    )
  }

  return (
    <div className="post-list">
      {allBlogs
        .sort((a, b) => {
          if (
            new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)
          ) {
            return -1
          }
          return 1
        })
        .map((post) => (
          <Link
            key={post.slug}
            className="post-item"
            href={`/blog/${post.slug}`}
          >
            <h3>{post.metadata.title}</h3>
            <time dateTime={post.metadata.publishedAt}>
              {formatDate(post.metadata.publishedAt, false)}
            </time>
            <p>{post.metadata.summary}</p>
          </Link>
        ))}
    </div>
  )
}
