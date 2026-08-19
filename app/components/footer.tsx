export default function Footer() {
  return (
    <footer className="site-footer">
      <p>© {new Date().getFullYear()} 杰</p>
      <a href="/rss" aria-label="RSS 订阅">
        RSS
      </a>
    </footer>
  )
}
