import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, LogOut } from 'lucide-react'
import { Trigger } from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import authService from '@/services/authService'

const pageTitles = { '/': 'Dashboard', '/clients': 'Clients', '/treatment-services': 'Treatment & Services', '/services': 'Treatment & Services', '/follow-ups': 'Follow-ups', '/treatment-records': 'Treatment Records', '/procedures': 'Treatment Records', '/sales': 'Sales', '/expenses': 'Expenses', '/users': 'User Management' }

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const prefix = Object.keys(pageTitles).find(key => key !== '/' && pathname.startsWith(key))
  const title = pageTitles[pathname] || pageTitles[prefix] || 'Skin Goddess'
  const username = authService.getUsername()
  const role = authService.getRole()

  function signOut() { authService.logout(); navigate('/login', { replace: true }) }

  return <header className="clinic-topbar">
    <Trigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation"><Menu size={20} /></Button></Trigger>
    <div className="clinic-breadcrumb"><span className="hidden sm:inline">Clinic</span><span className="hidden sm:inline" aria-hidden="true">/</span><span>{title}</span></div>
    <div className="clinic-account">
      <div className="hidden sm:flex flex-col text-right"><span className="clinic-account-name">{username}</span><span className="clinic-account-role">{role === 'admin' ? 'Administrator' : 'Clinic staff'}</span></div>
      <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={17} /></Button>
    </div>
  </header>
}
