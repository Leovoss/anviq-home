import { useEffect, useState } from 'react'
import { BounceSidebar, type BounceSidebarItem } from '@/components/ui/bounce-sidebar'

const SECTIONS = [
  { id: 'work', label: 'The work' },
  { id: 'approach', label: 'Approach' },
  { id: 'work-selected', label: 'Selected work' },
  { id: 'activity', label: 'Activity' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'faq', label: 'FAQ' },
]

const ITEMS: BounceSidebarItem[] = SECTIONS.map((s) => ({ label: s.label, href: `#${s.id}` }))

export function Sidebar() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const elements = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el)
    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = elements.indexOf(entry.target as HTMLElement)
          if (index !== -1) setActive(index)
        }
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: 0 },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="sticky top-24">
      <BounceSidebar items={ITEMS} value={active} onChange={setActive} dotColor="#B54827" />
    </div>
  )
}
