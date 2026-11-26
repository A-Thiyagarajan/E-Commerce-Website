import axios from 'axios';
const deployedApi = 'https://ecommerce-backend-sicp.onrender.com/api';
// Local Vite uses its /api proxy. Production defaults to the supplied Render
// backend; deployments can override the endpoint with VITE_API_URL.
const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : deployedApi);
const api = axios.create({ baseURL: apiBaseUrl });
api.interceptors.request.use((config) => { const token = localStorage.getItem('shopstack-token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
export const errorText = (error) => error.response?.data?.message || 'Unable to connect to the server. Please try again later.';
export default api;
