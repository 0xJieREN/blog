import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="page-intro not-found">
      <h1>这里什么也没有</h1>
      <p>你访问的页面不存在，或许它已经被移走了。</p>
      <p>
        <Link href="/">回到首页</Link>
      </p>
    </section>
  )
}
