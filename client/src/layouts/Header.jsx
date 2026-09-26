import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import authService from '@/services/authService'

const PAGE_TITLES = {
  '/':           'Dashboard',
  '/clients':    'Clients',
  '/services':   'Services',
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
  const navigate = useNavigate()
  const title = getTitle(pathname)

  function handleLogout() {
    authService.logout()
    navigate('/login', { replace: true })
  }

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4 lg:px-6"
      style={{
        background:  'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Hamburger — mobile only */}
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

      {/* Right slot */}
      <div className="ml-auto flex items-center gap-3">
        <span
          className="hidden sm:inline-flex text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            background: 'var(--color-brand-soft)',
            color:      'var(--color-brand-strong)',
          }}
        >
          Skin Goddess
        </span>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
        </Button>
      </div>
    </header>
  )
}
