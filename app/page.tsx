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
          我是一名关注 AI 和 Finance 的独立开发者。这里主要记录投资思考、软件开发、AI
          工具和个人项目，也偶尔写一些生活中的观察。
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
