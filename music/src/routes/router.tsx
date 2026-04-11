import { createBrowserRouter, Navigate } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import Layout from "../layout/layout";
import Dashboard from "../client/dashboard";
import Login from "../client/login";
// import Register from "../client/register";
import NotFound from "../client/notFound";
import AdminDashboard from "../admin/adminPage";
import MySongs from "../client/clientPage";
import type User from "../interface/user";
import { API_BASE } from '../config';
import Playlist from "../client/playlistsPage";

// eslint-disable-next-line react-refresh/only-export-components
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/verify`, { headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  } })
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
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// eslint-disable-next-line react-refresh/only-export-components
const AdminRoute = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/verify`, { headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  } })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid && data.user && data.user.role === "ADMIN") {
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
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return children;
};

const router = createBrowserRouter([
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Layout>
          <Dashboard />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: <Login />,
  },
  // {
  //   path: "/register",
  //   element: <Register />,
  // },
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/admin",
    element: (
      <AdminRoute>
        <Layout>
          <AdminDashboard />
        </Layout>
      </AdminRoute>
    ),
  },
  {
  path: "/my-songs",
  element: (
    <ProtectedRoute>
      <Layout>
        <MySongs />
      </Layout>
    </ProtectedRoute>
  ),
},
  {
  path: "/playlist",
  element: (
    <ProtectedRoute>
      <Layout>
        <Playlist />
      </Layout>
    </ProtectedRoute>
  ),
},
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
