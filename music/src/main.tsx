import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import router from './routes/router'
import { PlayerProvider } from './context/PlayerContext'
import { ToastProvider } from './context/ToastContext'
import { LikeProvider } from './context/LikeContext'
import { NotificationProvider } from './context/NotificationContext'
import { OfflineProvider } from './context/OfflineContext'
import './App.css'
import { API_BASE } from './config.tsx';

const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  try {
    const response = await originalFetch(input, init);
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && typeof input === 'string' && !input.includes('/api/auth/refresh')) {
        try {
          const refreshResponse = await originalFetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            if (data.success && data.token) {
              localStorage.setItem('token', data.token);
              if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);

              const newInit = { ...init };
              if (newInit.headers) {
                const headers = new Headers(newInit.headers);
                headers.set('Authorization', `Bearer ${data.token}`);
                newInit.headers = headers;
              } else {
                newInit.headers = { 'Authorization': `Bearer ${data.token}` };
              }
              return originalFetch(input, newInit);
            }
          }

          // Refresh failed
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        } catch (e) {
          console.error('Refresh token error:', e);
        }
      }
    }
    return response;
  } catch (err) {
    console.error('Fetch error:', err);
    throw err; // Re-throw so the caller can catch it
  }
};

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <NotificationProvider>
      <LikeProvider>
        <PlayerProvider>
          <OfflineProvider>
            <RouterProvider router={router}></RouterProvider>
          </OfflineProvider>
        </PlayerProvider>
      </LikeProvider>
    </NotificationProvider>
  </ToastProvider>
)
