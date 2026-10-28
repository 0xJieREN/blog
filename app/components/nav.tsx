'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './theme-toggle'

export function Navbar() {
  const pathname = usePathname()
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/')

  const navItems = isEnglish
    ? [{ href: '/', name: '中文', lang: 'zh-CN' }]
    : [
        { href: '/blog', name: '文章' },
        { href: '/en', name: 'EN', lang: 'en' },
      ]

  return (
    <header className="site-header" lang={isEnglish ? 'en' : 'zh-CN'}>
      <Link
        className="identity"
        href={isEnglish ? '/en' : '/'}
        aria-label={isEnglish ? "Jared's homepage" : '杰的个人主页'}
      >
        <span className="identity-name">{isEnglish ? 'Jared' : '杰'}</span>
        <span className="identity-role">
          {isEnglish ? 'Independent developer' : '独立开发者'}
        </span>
      </Link>
      <div className="header-actions">
        <nav
          className="site-nav"
          aria-label={isEnglish ? 'Main navigation' : '主导航'}
        >
          {navItems.map(({ href, name, lang }) => (
            <Link
              key={href}
              href={href}
              lang={lang}
              aria-current={pathname === href ? 'page' : undefined}
            >
              {name}
            </Link>
          ))}
        </nav>
        <ThemeToggle language={isEnglish ? 'en' : 'zh-CN'} />
      </div>
    </header>
  )
}
