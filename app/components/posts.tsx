import Link from 'next/link'
import { formatDate, getBlogPosts } from 'app/blog/utils'

export function BlogPosts() {
  let allBlogs = getBlogPosts()

  if (allBlogs.length === 0) {
    return (
      <div className="empty-posts">
        <span className="post-number">00</span>
        <div>
          <h3>第一篇文章，正在路上</h3>
          <p>内容还在整理。很快，这里会出现一些认真写下的东西。</p>
        </div>
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
        .map((post, index) => (
          <Link
            key={post.slug}
            className="post-item"
            href={`/blog/${post.slug}`}
          >
            <span className="post-number">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="post-copy">
              <h3>{post.metadata.title}</h3>
              <p>{post.metadata.summary}</p>
            </div>
            <time dateTime={post.metadata.publishedAt}>
              {formatDate(post.metadata.publishedAt, false)}
            </time>
            <span className="post-arrow" aria-hidden="true">↗</span>
          </Link>
        ))}
    </div>
  )
}
