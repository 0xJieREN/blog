'use client'

import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/')

  return (
    <footer className="site-footer" lang={isEnglish ? 'en' : 'zh-CN'}>
      <p>© {new Date().getFullYear()} {isEnglish ? 'Jared' : '杰'}</p>
      <nav
        className="footer-links"
        aria-label={isEnglish ? 'External links' : '外部链接'}
      >
        <a
          href="https://github.com/0xJieREN"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <a
          href="https://www.linkedin.com/in/jierenglobal/"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        <a
          href="https://www.xiaohongshu.com/user/profile/62ef1618000000001f00540f"
          target="_blank"
          rel="noopener noreferrer"
        >
          {isEnglish ? 'Xiaohongshu' : '小红书'}
        </a>
        <a href="mailto:jierenglobal@gmail.com">Email</a>
        <a href="/rss" aria-label={isEnglish ? 'RSS feed' : 'RSS 订阅'}>
          RSS
        </a>
      </nav>
    </footer>
  )
}
