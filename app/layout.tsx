import './global.css'
import type { Metadata, Viewport } from 'next'
import { fontVariables } from './fonts'
import { Navbar } from './components/nav'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { baseUrl } from './sitemap'
// Next's bundled React exports ViewTransition; @types/react 18 does not know it.
// @ts-expect-error
import { ViewTransition } from 'react'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: '愚人节',
    template: '%s · 愚人节',
  },
  description:
    '关注 AI 和 Finance 的独立开发者，记录投资思考、软件开发、AI 工具、个人项目和生活观察。',
  openGraph: {
    title: '愚人节的个人主页',
    description:
      '关注 AI 和 Finance 的独立开发者，记录投资思考、软件开发、AI 工具和个人项目。',
    url: baseUrl,
    siteName: '愚人节的个人主页',
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

export const viewport: Viewport = {
  themeColor: '#fdfdfc',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" className={fontVariables}>
      <body>
        <div className="site-shell">
          <Navbar />
          {/* global.css animates the `page` group on navigation. Wrapping
              <main> gives the group one element that stays across pages. */}
          <ViewTransition name="page">
            <main className="site-main">{children}</main>
          </ViewTransition>
          <Analytics />
          <SpeedInsights />
        </div>
      </body>
    </html>
  )
}
