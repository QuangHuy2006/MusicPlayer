import { createBrowserRouter, Navigate } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import Layout from "../layout/layout";
import Dashboard from "../client/dashboard";
import Login from "../client/login";
import NotFound from "../client/notFound";
import AdminDashboard from "../admin/adminPage";
import MySongs from "../client/clientPage";
import type User from "../interface/user";
import { API_BASE } from '../config';
import Playlist from "../client/playlistsPage";
import LikedSongs from "../client/likedSongs";
import HistoryPage from "../client/historyPage";

// eslint-disable-next-line react-refresh/only-export-components
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid && data.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          setUser(null);
          localStorage.removeItem("user");
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen bg-slate-950">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// eslint-disable-next-line react-refresh/only-export-components
const AdminRoute = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<"LOADING" | "NOT_LOGGED_IN" | "NO_PERMISSION" | "ADMIN">("LOADING");
  console.log(loading);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid && data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          if (data.user.role === "ADMIN") {
            setAuthStatus("ADMIN");
          } else {
            setAuthStatus("NO_PERMISSION");
          }
        } else {
          setAuthStatus("NOT_LOGGED_IN");
          localStorage.removeItem("user");
        }
      })
      .catch(() => setAuthStatus("NOT_LOGGED_IN"))
      .finally(() => setLoading(false));
  }, []);

  if (authStatus === "LOADING")
    return (
      <div className="flex justify-center items-center h-full bg-slate-950">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  if (authStatus === "NOT_LOGGED_IN") return <Navigate to="/login" replace />;
  if (authStatus === "NO_PERMISSION") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-[fade-in_0.5s_ease-out]">
        <div className="w-24 h-24 mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">Truy cập bị từ chối</h1>
        <p className="text-lg text-slate-400">Tài khoản của bạn không đủ quyền để truy cập vào trang quản trị.</p>
      </div>
    );
  }
  return <>{children}</>;
};

const AppLayout = () => {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
};

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "my-songs",
        element: <MySongs />,
      },
      {
        path: "playlist",
        element: <Playlist />,
      },
      {
        path: "liked-songs",
        element: <LikedSongs />,
      },
      {
        path: "history",
        element: <HistoryPage />,
      },
      {
        path: "admin",
        element: (
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        ),
      },
      {
        path: "",
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
