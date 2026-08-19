import './global.css'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Navbar } from './components/nav'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Footer from './components/footer'
import { baseUrl } from './sitemap'

const themeScript = `
  (function () {
    var theme = 'light'
    try {
      var savedTheme = window.localStorage.getItem('theme')
      theme = savedTheme === 'light' || savedTheme === 'dark'
        ? savedTheme
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
    } catch (_) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    document.documentElement.setAttribute('data-theme', theme)
  })()
`

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: '杰的个人主页',
    template: '%s · 杰',
  },
  description:
    '关注 AI 和 Finance 的独立开发者，记录投资思考、软件开发、AI 工具、个人项目和生活观察。',
  openGraph: {
    title: '杰的个人主页',
    description:
      '关注 AI 和 Finance 的独立开发者，记录投资思考、软件开发、AI 工具和个人项目。',
    url: baseUrl,
    siteName: '杰的个人主页',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const cx = (...classes) => classes.filter(Boolean).join(' ')

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="zh-CN"
      className={cx(GeistSans.variable, GeistMono.variable)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <div className="site-shell">
          <Navbar />
          <main className="site-main">{children}</main>
          <Footer />
          <Analytics />
          <SpeedInsights />
        </div>
      </body>
    </html>
  )
}
