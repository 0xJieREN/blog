import Link from 'next/link'
import { BlogPosts } from 'app/components/posts'

export default function Page() {
  return (
    <div className="home-page">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">Hello / 你好</p>
        <h1 id="hero-title" className="hero-title">
          我是杰。
          <span>这里是我的个人主页，也是一间安静的文字房间。</span>
        </h1>
        <p className="hero-intro">
          我会在这里记录想法、作品，以及那些值得被慢慢想清楚的事。
        </p>
        <div className="hero-actions">
          <Link className="text-link" href="/blog">
            阅读文章 <span aria-hidden="true">↗</span>
          </Link>
          <span className="site-status">
            <span className="status-dot" aria-hidden="true" />
            持续更新中
          </span>
        </div>
      </section>

      <section className="home-section" aria-labelledby="latest-posts">
        <div className="section-heading">
          <p className="section-index">01</p>
          <h2 id="latest-posts">最近文章</h2>
          <Link href="/blog">查看全部</Link>
        </div>
        <BlogPosts />
      </section>
    </div>
  )
}
