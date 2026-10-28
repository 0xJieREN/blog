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
    <div className="home-page" lang="en">
      <section className="intro" aria-label="Introduction">
        <p>
          I’m Jared, an independent developer focused on <em>AI</em> and{' '}
          <em>finance</em>.
        </p>
        <p>
          I write about investing, software development, AI tools, personal
          projects, and the occasional observation from everyday life.
        </p>
      </section>

      <section className="section" aria-labelledby="english-writing">
        <div className="section-label">
          <h2 id="english-writing">Writing</h2>
          <Link href="/blog" lang="zh-CN">
            In Chinese
          </Link>
        </div>
        <p className="post-empty">
          English notes are on the way. For now, my writing lives in the Chinese
          archive.
        </p>
      </section>

      <section className="section" aria-labelledby="english-connect">
        <div className="section-label">
          <h2 id="english-connect">Connect</h2>
        </div>
        <p className="text">
          You can find my code on{' '}
          <a href="https://github.com/0xJieREN" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>{' '}
          and my work history on{' '}
          <a
            href="https://www.linkedin.com/in/jierenglobal/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          , or reach me via <a href="mailto:jierenglobal@gmail.com">email</a>.
        </p>
      </section>
    </div>
  )
}
