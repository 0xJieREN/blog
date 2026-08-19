import { BlogPosts } from 'app/components/posts'

export const metadata = {
  title: '文章',
  description: '杰的文章与随笔。',
}

export default function Page() {
  return (
    <div className="journal-page">
      <header className="page-intro">
        <h1>文章</h1>
        <p>关于技术、生活与思考。不追求更新频率，只认真对待每一次表达。</p>
      </header>
      <section aria-label="文章列表">
        <BlogPosts />
      </section>
    </div>
  )
}
