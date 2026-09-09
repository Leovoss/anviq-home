import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'

const NAV = [
  { href: '#work', label: 'The work' },
  { href: '#approach', label: 'Approach' },
  { href: '#work-selected', label: 'Selected work' },
  { href: '#activity', label: 'Activity' },
  { href: '#engagement', label: 'Engagement' },
  { href: '#faq', label: 'FAQ' },
]

export function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-ash bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-site items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-mono text-[15px] tracking-wide" aria-label="Anviq">
          <Logo />
          anviq
        </Link>
        <div className="flex items-center gap-2">
          <a
            href="mailto:lvoss@anviq.net"
            className="hidden min-h-[40px] items-center justify-center rounded bg-iron px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-ember sm:inline-flex"
          >
            Start a conversation
          </a>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-ash text-iron xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-nav" className="border-t border-ash bg-white xl:hidden">
          <nav className="mx-auto flex max-w-site flex-col px-4 py-2 text-[15px]">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="border-b border-ash py-3 text-steel"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a href="mailto:lvoss@anviq.net" className="py-3 font-semibold text-ember">
              Start a conversation
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
