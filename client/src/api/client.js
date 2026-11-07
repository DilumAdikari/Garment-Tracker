import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 on any non-login call means the session expired: clear it and go to login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const isLogin = error.config?.url?.includes('/auth/login');
    if (status === 401 && !isLogin) {
      localStorage.removeItem('gt_token');
      localStorage.removeItem('gt_user');
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

/** Turns an axios error into a readable message for toasts. */
export const errorMessage = (err) =>
  err.response?.data?.message || err.message || 'Something went wrong';

/** Downloads a file from an authenticated endpoint (token is sent via header). */
export async function downloadFile(url, params, filename) {
  const res = await api.get(url, { params, responseType: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(res.data);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default api;
