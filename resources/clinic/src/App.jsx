import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

import RequireAuth       from './components/shared/RequireAuth'
import RequireAdmin      from './components/shared/RequireAdmin'
import Layout            from './layouts/Layout'
import LoginPage         from './pages/auth/LoginPage'
import DashboardPage     from './pages/dashboard/DashboardPage'
import ClientsPage       from './pages/clients/ClientsPage'
import ClientProfilePage from './pages/clients/ClientProfilePage'
import ServicesPage      from './pages/services/ServicesPage'
import ProceduresPage    from './pages/procedures/ProceduresPage'
import FollowUpsPage     from './pages/follow-ups/FollowUpsPage'
import SalesPage         from './pages/sales/SalesPage'
import SaleDetailPage    from './pages/sales/SaleDetailPage'
import ExpensesPage      from './pages/expenses/ExpensesPage'
import UserManagementPage from './pages/users/UserManagementPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — all business pages require auth */}
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index                   element={<DashboardPage />} />
          <Route path="clients"          element={<ClientsPage />} />
          <Route path="clients/:id"      element={<ClientProfilePage />} />
          <Route path="treatment-services" element={<ServicesPage />} />
          <Route path="treatment-records"  element={<ProceduresPage />} />
          {/* Preserve old bookmarks while using clear staff-facing URLs. */}
          <Route path="services" element={<Navigate to="/treatment-services" replace />} />
          <Route path="procedures" element={<Navigate to="/treatment-records" replace />} />
          <Route path="follow-ups"       element={<FollowUpsPage />} />
          <Route path="sales"            element={<SalesPage />} />
          <Route path="sales/:id"        element={<SaleDetailPage />} />
          {/* Admin-only financial and account-management pages */}
          <Route
            path="expenses"
            element={<RequireAdmin><ExpensesPage /></RequireAdmin>}
          />
          <Route
            path="users"
            element={
              <RequireAdmin>
                <UserManagementPage />
              </RequireAdmin>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
