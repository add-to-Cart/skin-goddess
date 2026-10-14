import { Navigate, useLocation } from 'react-router-dom'
import authService from '@/services/authService'

/**
 * RequireAuth — wraps protected routes.
 * If the user is not authenticated, redirects to /login,
 * preserving the attempted URL so we can redirect back after login.
 */
export default function RequireAuth({ children }) {
  const location = useLocation()

  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
