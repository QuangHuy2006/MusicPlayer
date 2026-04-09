import { createBrowserRouter, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "../layout/layout";
import Dashboard from "../client/dashboard";
import Login from "../client/login";
// import Register from "../client/register";
import NotFound from "../client/notFound";
import AdminDashboard from "../admin/adminPage";
import MySongs from "../client/clientPage";

// Component bảo vệ route yêu cầu đăng nhập
const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/verify", { credentials: "include" })
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

// Component bảo vệ route admin (yêu cầu role admin)
const AdminRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/verify", { credentials: "include" })
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
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
