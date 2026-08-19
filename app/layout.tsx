import './global.css'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Navbar } from './components/nav'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Footer from './components/footer'
import { baseUrl } from './sitemap'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: '杰的个人主页',
    template: '%s · 杰',
  },
  description: '杰的个人主页与博客，记录想法、作品和正在探索的事。',
  openGraph: {
    title: '杰的个人主页',
    description: '记录想法、作品和正在探索的事。',
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
    <html lang="zh-CN" className={cx(GeistSans.variable, GeistMono.variable)}>
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
