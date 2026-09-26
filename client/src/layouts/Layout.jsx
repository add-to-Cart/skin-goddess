import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import SidebarContent from './Sidebar'

/**
 * Root layout shell.
 *
 * Desktop (lg+): fixed 240px sidebar on the left, content area offset right.
 * Mobile (<lg):  sidebar hidden; hamburger in header opens a full-height drawer
 *                overlay with the same SidebarContent.
 */
export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the drawer on route change (user tapped a nav link)
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  return (
    <div className="flex min-h-screen w-full" style={{ background: 'var(--color-background)' }}>

      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-60 z-50 overflow-hidden"
        style={{ background: 'var(--color-sidebar)', width: '240px' }}
        aria-label="Sidebar"
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer overlay ─────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <aside
            className="fixed top-0 left-0 bottom-0 z-50 flex flex-col w-64 lg:hidden overflow-hidden"
            style={{ background: 'var(--color-sidebar)' }}
            aria-label="Navigation drawer"
          >
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      {/* ── Main content ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-h-screen lg:ml-60">
        <Header onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 px-4 py-5 lg:px-6 lg:py-6 w-full max-w-[1280px] mx-auto">
          <Outlet />
        </main>
      </div>

    </div>
  )
}
