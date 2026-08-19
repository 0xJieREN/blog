'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './theme-toggle'

export function Navbar() {
  const pathname = usePathname()
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/')

  const navItems = isEnglish
    ? [
        { href: '/en', name: 'Home' },
        { href: '/', name: '中文', lang: 'zh-CN' },
      ]
    : [
        { href: '/', name: '首页' },
        { href: '/blog', name: '文章' },
        { href: '/en', name: 'EN', lang: 'en' },
      ]

  return (
    <header className="site-header" lang={isEnglish ? 'en' : 'zh-CN'}>
      <Link
        className="brand"
        href={isEnglish ? '/en' : '/'}
        aria-label={isEnglish ? "Jared's homepage" : '杰的个人主页'}
      >
        {isEnglish ? (
          "Jared's Blog"
        ) : (
          <>
            <span className="brand-name">杰</span>
            <span className="brand-label">的博客</span>
          </>
        )}
      </Link>
      <div className="header-actions">
        <nav
          className="site-nav"
          aria-label={isEnglish ? 'Main navigation' : '主导航'}
        >
          {navItems.map(({ href, name, lang }) => (
            <Link key={href} href={href} lang={lang}>
              {name}
            </Link>
          ))}
        </nav>
        <ThemeToggle language={isEnglish ? 'en' : 'zh-CN'} />
      </div>
    </header>
  )
}
