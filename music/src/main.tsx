import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import router from './routes/router'
import { PlayerProvider } from './context/PlayerContext'
import { ToastProvider } from './context/ToastContext'
import { LikeProvider } from './context/LikeContext'
import './App.css'

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <LikeProvider>
      <PlayerProvider>
        <RouterProvider router={router}></RouterProvider>
      </PlayerProvider>
    </LikeProvider>
  </ToastProvider>
)
