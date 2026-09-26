import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Stethoscope,
  ShoppingCart,
  Package,
  Receipt,
  UserCheck,
  Clock,
  Banknote,
  BarChart2,
  Scissors,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  {
    section: 'Overview',
    items: [
      { to: '/',           label: 'Dashboard',   Icon: LayoutDashboard },
    ],
  },
  {
    section: 'Clients',
    items: [
      { to: '/clients',    label: 'Clients',     Icon: Users },
      { to: '/follow-ups', label: 'Follow-ups',  Icon: CalendarClock },
    ],
  },
  {
    section: 'Services',
    items: [
      { to: '/services',   label: 'Services',    Icon: Scissors },
      { to: '/procedures', label: 'Procedures',  Icon: Stethoscope },
      { to: '/sales',      label: 'Sales',       Icon: ShoppingCart },
    ],
  },
  {
    section: 'Inventory',
    items: [
      { to: '/inventory',  label: 'Inventory',   Icon: Package },
    ],
  },
  {
    section: 'Finance',
    items: [
      { to: '/expenses',   label: 'Expenses',    Icon: Receipt },
    ],
  },
  {
    section: 'Team',
    items: [
      { to: '/employees',  label: 'Employees',   Icon: UserCheck },
      { to: '/attendance', label: 'Attendance',  Icon: Clock },
      { to: '/salary',     label: 'Salary',      Icon: Banknote },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { to: '/reports',    label: 'Reports',     Icon: BarChart2 },
    ],
  },
]

export default function SidebarContent({ onNavigate }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Brand mark — a small rose dot accent */}
          <span
            className="inline-flex h-7 w-7 rounded-full items-center justify-center shrink-0"
            style={{ background: 'var(--color-brand)' }}
            aria-hidden="true"
          >
            <span className="text-white text-xs font-bold">SG</span>
          </span>
          <div>
            <div className="text-white text-sm font-semibold leading-tight">
              Skin Goddess
            </div>
            <div
              className="text-xs mt-0.5 uppercase tracking-widest"
              style={{ color: 'var(--color-sidebar-text)', fontSize: '0.6rem' }}
            >
              Clinic Management
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Main navigation">
        {NAV.map((group) => (
          <div key={group.section} className="mb-1">
            <div
              className="px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(168,162,158,0.5)' }}
            >
              {group.section}
            </div>
            {group.items.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--color-sidebar-active)] text-white'
                      : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0',
                        isActive
                          ? 'text-[var(--color-brand)]'
                          : 'opacity-60'
                      )}
                      aria-hidden="true"
                    />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </div>
  )
}
