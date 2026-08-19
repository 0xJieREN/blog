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
        <p>
          这里主要记录投资思考、软件开发、AI
          工具和个人项目，也偶尔写一些生活中的观察。
        </p>
      </header>
      <section aria-label="文章列表">
        <BlogPosts />
      </section>
    </div>
  )
}
