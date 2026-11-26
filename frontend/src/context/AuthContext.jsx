import { createContext, useContext, useEffect, useState } from 'react'; import api from '../services/api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user,setUser]=useState(null),[ready,setReady]=useState(false);
  useEffect(()=>{ if(localStorage.getItem('shopstack-token')) api.get('/auth/profile').then(r=>setUser(r.data.user)).catch(()=>localStorage.removeItem('shopstack-token')).finally(()=>setReady(true)); else setReady(true); },[]);
  const login=async(credentials)=>{const {data}=await api.post('/auth/login',credentials);localStorage.setItem('shopstack-token',data.token);setUser(data.user);return data.user;};
  const register=async(details)=>{const {data}=await api.post('/auth/register',details);localStorage.setItem('shopstack-token',data.token);setUser(data.user);return data.user;};
  const updateProfile=async(details)=>{const {data}=await api.put('/auth/profile',details);setUser(data.user);return data.user;};
  const logout=()=>{localStorage.removeItem('shopstack-token');setUser(null);};
  return <AuthContext.Provider value={{user,ready,login,register,updateProfile,logout}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
