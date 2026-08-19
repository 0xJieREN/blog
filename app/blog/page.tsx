import { BlogPosts } from 'app/components/posts'

export const metadata = {
  title: '文章',
  description: '杰的文章与随笔。',
}

export default function Page() {
  return (
    <div className="journal-page">
      <header className="page-intro">
        <p className="eyebrow">Journal / 文章</p>
        <h1>写下一些<br />值得留下的东西。</h1>
        <p>关于技术、生活与思考。不追求更新频率，只认真对待每一次表达。</p>
      </header>
      <section className="home-section" aria-label="文章列表">
        <div className="section-heading">
          <p className="section-index">01</p>
          <h2>全部文章</h2>
        </div>
        <BlogPosts />
      </section>
    </div>
  )
}
