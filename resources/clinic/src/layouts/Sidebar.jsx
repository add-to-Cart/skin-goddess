import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarClock, Stethoscope, Receipt, Scissors, UserCog, ShoppingCart } from 'lucide-react'
import authService from '@/services/authService'

const clinicNavigation = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', Icon: Users },
  { to: '/treatment-records', label: 'Treatment Records', Icon: Stethoscope },
  { to: '/follow-ups', label: 'Follow-ups', Icon: CalendarClock },
  { to: '/sales', label: 'Sales', Icon: ShoppingCart },
]

export default function SidebarContent({ onNavigate }) {
  const groups = [
    { label: 'Clinic', items: clinicNavigation },
    { label: 'Manage', items: [
      { to: '/treatment-services', label: 'Treatment & Services', Icon: Scissors },
      ...(authService.isAdmin() ? [
        { to: '/expenses', label: 'Expenses', Icon: Receipt },
        { to: '/users', label: 'User Management', Icon: UserCog },
      ] : []),
    ] },
  ]

  return <div className="clinic-navigation">
    <NavLink to="/" onClick={onNavigate} className="clinic-wordmark" aria-label="Skin Goddess dashboard">
      <img className="clinic-brand-logo" src="/app-logo.png" alt="" width="44" height="44" />
      <span className="clinic-brand-text"><span className="clinic-brand-name">Skin Goddess</span><span className="clinic-wordmark-caption">Clinic management</span></span>
    </NavLink>
    <nav aria-label="Main navigation" className="clinic-nav-groups">
      {groups.map(group => <div className="clinic-nav-group" key={group.label}>
        <p className="clinic-nav-label">{group.label}</p>
        {group.items.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate} className={({ isActive }) => `clinic-nav-link${isActive ? ' is-active' : ''}`}>
          <Icon size={18} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span>
        </NavLink>)}
      </div>)}
    </nav>
    <div className="clinic-nav-footer"><span className="clinic-footer-line" aria-hidden="true" /><span>Skin Goddess Clinic</span></div>
  </div>
}
