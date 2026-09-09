import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-ash">
      <div className="mx-auto flex max-w-site flex-col items-center justify-between gap-3 px-4 py-8 font-mono text-[12px] text-steel sm:flex-row">
        <span>Anviq / Engineering delivery</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link to="/privacy" className="transition hover:text-iron">
            Privacy Policy
          </Link>
          <Link to="/cookies" className="transition hover:text-iron">
            Cookie Policy
          </Link>
          <Link to="/terms" className="transition hover:text-iron">
            Terms &amp; Disclaimer
          </Link>
        </nav>
        <span>&copy; 2026 Anviq. Independent practice.</span>
      </div>
    </footer>
  )
}
