import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import router from './routes/router'
import { PlayerProvider } from './context/PlayerContext'
import { ToastProvider } from './context/ToastContext'
import { LikeProvider } from './context/LikeContext'
import { NotificationProvider } from './context/NotificationContext'
import './App.css'

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <NotificationProvider>
      <LikeProvider>
        <PlayerProvider>
          <RouterProvider router={router}></RouterProvider>
        </PlayerProvider>
      </LikeProvider>
    </NotificationProvider>
  </ToastProvider>
)
