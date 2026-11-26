import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <div className="loading-page">Loading your account…</div>;
  const signInPath = location.pathname === '/orders' ? '/track-orders' : '/login';
  return user ? children : <Navigate to={signInPath} state={{ from: location.pathname, routeState: location.state }} replace />;
}
