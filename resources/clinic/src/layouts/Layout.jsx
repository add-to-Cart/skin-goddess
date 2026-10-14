import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import Header from './Header'
import SidebarContent from './Sidebar'

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) setDrawerOpen(false) }
    const closeOnHistory = () => setDrawerOpen(false)
    desktop.addEventListener('change', closeOnDesktop)
    window.addEventListener('popstate', closeOnHistory)
    return () => {
      desktop.removeEventListener('change', closeOnDesktop)
      window.removeEventListener('popstate', closeOnHistory)
    }
  }, [])

  return <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
    <div className="clinic-workspace">
      <aside className="clinic-rail" aria-label="Sidebar"><SidebarContent /></aside>
      <Dialog.Portal>
        <Dialog.Overlay className="clinic-drawer-overlay" />
        <Dialog.Content className="clinic-drawer" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">Clinic navigation</Dialog.Title>
          <Dialog.Close className="clinic-drawer-close" aria-label="Close navigation"><X size={20} /></Dialog.Close>
          <SidebarContent onNavigate={() => setDrawerOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
      <div className="clinic-workspace-body">
        <a className="clinic-skip-link" href="#clinic-content">Skip to content</a>
        <Header />
        <main id="clinic-content" tabIndex={-1} className="clinic-content"><Outlet /></main>
      </div>
    </div>
  </Dialog.Root>
}
