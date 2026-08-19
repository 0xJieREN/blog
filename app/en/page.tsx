import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: {
    absolute: "Jared's Blog",
  },
  description:
    'Jared is an independent developer focused on AI and finance, writing about investing, software, AI tools, personal projects, and life.',
  alternates: {
    languages: {
      'zh-CN': '/',
      en: '/en',
    },
  },
  openGraph: {
    title: "Jared's Blog",
    description:
      'An independent developer writing about AI, finance, software, and the occasional observation from everyday life.',
    url: '/en',
    locale: 'en_US',
    type: 'website',
  },
}

export default function EnglishPage() {
  return (
    <div className="home-page english-page" lang="en">
      <section className="hero" aria-labelledby="english-hero-title">
        <h1 id="english-hero-title" className="hero-title">
          Hi, I’m Jared.
        </h1>
        <p className="hero-intro">
          I’m an independent developer focused on AI and finance. I write about
          investing, software development, AI tools, personal projects, and the
          occasional observation from everyday life.
        </p>
      </section>

      <section className="home-section" aria-labelledby="english-writing">
        <div className="section-heading">
          <h2 id="english-writing">WRITING</h2>
          <Link href="/blog" lang="zh-CN">
            Read in Chinese
          </Link>
        </div>
        <div className="empty-posts">
          <h3>English notes are on the way.</h3>
          <p>
            I’m preparing the first few pieces. For now, you can find my writing
            in the Chinese archive.
          </p>
        </div>
      </section>
    </div>
  )
}
