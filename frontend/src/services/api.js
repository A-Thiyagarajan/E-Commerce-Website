import axios from 'axios';
const deployedApi = 'https://ecommerce-backend-sicp.onrender.com/api';
// Local Vite uses its /api proxy. Production defaults to the supplied Render
// backend; deployments can override the endpoint with VITE_API_URL.
const configuredApiUrl = import.meta.env.VITE_API_URL;
const normalizeApiBase = (value) => {
  const base = String(value || '').trim().replace(/\/+$/, '');
  if (!base) return import.meta.env.DEV ? '/api' : deployedApi;
  // Accept either a backend origin or an already-prefixed API URL. This keeps
  // endpoint paths such as /products from losing or duplicating `/api`.
  return `${base.replace(/(?:\/api)+$/i, '')}/api`;
};
const apiBaseUrl = normalizeApiBase(configuredApiUrl);
const api = axios.create({ baseURL: apiBaseUrl });
api.interceptors.request.use((config) => { const token = localStorage.getItem('shopstack-token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
export const errorText = (error) => error.response?.data?.message || 'Unable to connect to the server. Please try again later.';
export default api;
