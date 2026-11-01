'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from './logo'

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
        aria-label={isEnglish ? "Jared's homepage" : '愚人节的个人主页'}
      >
        <Logo />
        {isEnglish ? 'Jared' : '愚人节'}
      </Link>
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
    </header>
  )
}
