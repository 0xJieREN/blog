import Link from 'next/link'
import { BlogPosts } from 'app/components/posts'

export default function Page() {
  return (
    <div className="home-page">
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="hero-title">
          你好，我是杰。
        </h1>
        <p className="hero-intro">
          这里是我的个人主页，也是一间安静的文字房间。我会在这里记录想法、作品，以及那些值得被慢慢想清楚的事。
        </p>
      </section>

      <section className="home-section" aria-labelledby="latest-posts">
        <div className="section-heading">
          <h2 id="latest-posts">最近文章</h2>
          <Link href="/blog">全部文章</Link>
        </div>
        <BlogPosts />
      </section>
    </div>
  )
}
