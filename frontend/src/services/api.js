import axios from 'axios';
// Use the current origin by default. Vite proxies /api to the local backend in
// development, and production deployments can set VITE_API_URL explicitly.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
api.interceptors.request.use((config) => { const token = localStorage.getItem('shopstack-token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
export const errorText = (error) => error.response?.data?.message || 'Unable to connect to the server. Please try again later.';
export default api;
