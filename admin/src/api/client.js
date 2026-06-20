import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('culinova_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !location.pathname.includes('/login')) {
      localStorage.removeItem('culinova_token');
      localStorage.removeItem('culinova_user');
      location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
