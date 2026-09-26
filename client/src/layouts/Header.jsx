import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PAGE_TITLES = {
  '/':           'Dashboard',
  '/clients':    'Clients',
  '/follow-ups': 'Follow-ups',
  '/procedures': 'Procedures',
  '/sales':      'Sales',
  '/inventory':  'Inventory',
  '/expenses':   'Expenses',
  '/employees':  'Employees',
  '/attendance': 'Attendance',
  '/salary':     'Salary',
  '/reports':    'Reports',
}

function getTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const prefix = Object.keys(PAGE_TITLES).find(
    (key) => key !== '/' && pathname.startsWith(key)
  )
  return prefix ? PAGE_TITLES[prefix] : 'Skin Goddess'
}

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation()
  const title = getTitle(pathname)

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4 lg:px-6"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Hamburger — visible only on mobile */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden shrink-0"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        {title}
      </span>

      {/* Right slot — reserved for future user menu / notifications */}
      <div className="ml-auto flex items-center gap-2">
        <span
          className="hidden sm:inline-flex text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            background: 'var(--color-brand-soft)',
            color: 'var(--color-brand-strong)',
          }}
        >
          Skin Goddess
        </span>
      </div>
    </header>
  )
}
