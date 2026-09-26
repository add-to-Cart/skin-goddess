import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

import RequireAuth       from './components/shared/RequireAuth'
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
import InventoryPage     from './pages/inventory/InventoryPage'
import ExpensesPage      from './pages/expenses/ExpensesPage'
import EmployeesPage     from './pages/employees/EmployeesPage'
import AttendancePage    from './pages/attendance/AttendancePage'
import SalaryPage        from './pages/salary/SalaryPage'
import ReportsPage       from './pages/reports/ReportsPage'

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
          <Route path="services"         element={<ServicesPage />} />
          <Route path="procedures"       element={<ProceduresPage />} />
          <Route path="follow-ups"       element={<FollowUpsPage />} />
          <Route path="sales"            element={<SalesPage />} />
          <Route path="sales/:id"        element={<SaleDetailPage />} />
          <Route path="inventory"        element={<InventoryPage />} />
          <Route path="expenses"         element={<ExpensesPage />} />
          <Route path="employees"        element={<EmployeesPage />} />
          <Route path="attendance"       element={<AttendancePage />} />
          <Route path="salary"           element={<SalaryPage />} />
          <Route path="reports"          element={<ReportsPage />} />
          <Route path="*"                element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
