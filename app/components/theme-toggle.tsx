'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function MoonIcon() {
  return (
    <svg
      className="theme-icon theme-icon-moon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.4 15.2A8.5 8.5 0 0 1 8.8 3.6 8.5 8.5 0 1 0 20.4 15.2Z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      className="theme-icon theme-icon-sun"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

export function ThemeToggle({ language = 'zh-CN' }: { language?: 'zh-CN' | 'en' }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const root = document.documentElement
    const currentTheme = root.dataset.theme === 'dark' ? 'dark' : 'light'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    setTheme(currentTheme)

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      let hasSavedTheme = false
      try {
        hasSavedTheme = Boolean(window.localStorage.getItem('theme'))
      } catch (_) {}

      if (hasSavedTheme) {
        return
      }

      const nextTheme = event.matches ? 'dark' : 'light'
      root.dataset.theme = nextTheme
      setTheme(nextTheme)
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = nextTheme
    try {
      window.localStorage.setItem('theme', nextTheme)
    } catch (_) {}
    setTheme(nextTheme)
  }

  const label =
    language === 'en'
      ? theme === 'dark'
        ? 'Switch to light mode'
        : 'Switch to dark mode'
      : theme === 'dark'
        ? '切换到日间模式'
        : '切换到夜间模式'

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <MoonIcon />
      <SunIcon />
    </button>
  )
}
