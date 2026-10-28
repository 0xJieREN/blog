import Link from 'next/link'
import { FeaturedPosts } from 'app/components/posts'

export default function Page() {
  return (
    <div className="home-page">
      <section className="intro" aria-label="介绍">
        <p>
          我是杰，一名关注 <em>AI</em> 和 <em>Finance</em> 的独立开发者。
        </p>
        <p>
          这里主要记录投资思考、软件开发、AI
          工具和个人项目，也偶尔写一些生活中的观察。
        </p>
      </section>

      <section className="section" aria-labelledby="latest-posts">
        <div className="section-label">
          <h2 id="latest-posts">最近文章</h2>
          <Link href="/blog">全部</Link>
        </div>
        <FeaturedPosts limit={5} />
      </section>

      <section className="section" aria-labelledby="connect">
        <div className="section-label">
          <h2 id="connect">找到我</h2>
        </div>
        <p className="text">
          代码在{' '}
          <a href="https://github.com/0xJieREN" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          ，日常在
          <a
            href="https://www.xiaohongshu.com/user/profile/62ef1618000000001f00540f"
            target="_blank"
            rel="noopener noreferrer"
          >
            小红书
          </a>
          ，工作经历在{' '}
          <a
            href="https://www.linkedin.com/in/jierenglobal/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          。想聊点什么，可以直接<a href="mailto:jierenglobal@gmail.com">写邮件</a>
          给我。
        </p>
      </section>
    </div>
  )
}
