'use client'

import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/')

  return (
    <footer className="site-footer" lang={isEnglish ? 'en' : 'zh-CN'}>
      <p>
        © {new Date().getFullYear()} {isEnglish ? 'Jared' : '杰'}
      </p>
      <a href="/rss" aria-label={isEnglish ? 'RSS feed' : 'RSS 订阅'}>
        RSS
      </a>
    </footer>
  )
}
