import { Navigate, useLocation } from 'react-router-dom'
import authService from '@/services/authService'

/**
 * RequireAdmin — wraps routes that only admins may visit.
 * Staff (or unauthenticated) users are redirected to the dashboard.
 */
export default function RequireAdmin({ children }) {
  const location = useLocation()

  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!authService.isAdmin()) {
    // Staff is logged in but not allowed here — send home silently.
    return <Navigate to="/" replace />
  }

  return children
}
