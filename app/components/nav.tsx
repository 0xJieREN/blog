import Link from 'next/link'

const navItems = {
  '/': {
    name: '首页',
  },
  '/blog': {
    name: '文章',
  },
}

export function Navbar() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="杰的个人主页">
        <span className="brand-name">杰</span>
        <span className="brand-label">Personal notes</span>
      </Link>
      <nav className="site-nav" aria-label="主导航">
        {Object.entries(navItems).map(([path, { name }]) => (
          <Link key={path} href={path}>
            {name}
          </Link>
        ))}
      </nav>
    </header>
  )
}
