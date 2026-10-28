import Link from 'next/link'
import { getBlogPosts } from 'app/blog/utils'

function toDate(date: string) {
  return new Date(date.includes('T') ? date : `${date}T00:00:00`)
}

function formatMonthDay(date: Date) {
  let month = String(date.getMonth() + 1).padStart(2, '0')
  let day = String(date.getDate()).padStart(2, '0')
  return `${month}.${day}`
}

export function BlogPosts({ limit }: { limit?: number }) {
  let posts = getBlogPosts()
    .map((post) => ({ ...post, date: toDate(post.metadata.publishedAt) }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit)

  if (posts.length === 0) {
    return (
      <p className="post-empty">
        这里暂时还是空的。第一篇文章正在整理，很快会有一些认真写下的东西。
      </p>
    )
  }

  return (
    <ul className="post-list">
      {posts.map((post, index) => {
        let year = post.date.getFullYear()
        let isFirstOfYear =
          index === 0 || posts[index - 1].date.getFullYear() !== year

        return (
          <li
            key={post.slug}
            className="post-row"
            data-year-start={isFirstOfYear || undefined}
          >
            <span className="post-year" aria-hidden={!isFirstOfYear}>
              {isFirstOfYear ? year : ''}
            </span>
            <Link className="post-link" href={`/blog/${post.slug}`}>
              <span className="post-title">{post.metadata.title}</span>
              <time dateTime={post.metadata.publishedAt}>
                {formatMonthDay(post.date)}
              </time>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
