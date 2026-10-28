import { BlogPosts } from 'app/components/posts'

export const metadata = {
  title: '文章',
  description: '关于投资思考、软件开发、AI 工具、个人项目和生活观察。',
}

export default function Page() {
  return (
    <div className="journal-page">
      <header className="page-intro">
        <h1>文章</h1>
        <p>投资思考、软件开发、AI 工具和个人项目，偶尔也写生活。</p>
      </header>
      <section aria-label="文章列表">
        <BlogPosts />
      </section>
    </div>
  )
}
