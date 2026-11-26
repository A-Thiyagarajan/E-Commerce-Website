import { Navigate } from 'react-router-dom'; import { useAuth } from '../context/AuthContext';
export default function AdminRoute({children}){const {user,ready}=useAuth();if(!ready)return <div className="loading-page">Loading…</div>;return user?.role==='admin'?children:<Navigate to={user?'/':'/login'} replace/>}
