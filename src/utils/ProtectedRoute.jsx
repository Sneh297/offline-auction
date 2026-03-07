import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    // Check if the license cookie exists
    const license = document.cookie
      .split("; ")
      .find(row => row.startsWith("license="))
      ?.split("=")[1];

    setIsAuthenticated(!!license);
  }, []);

  // Show loading while checking cookie
  if (isAuthenticated === null) return <div>Loading...</div>;

  if (!isAuthenticated) return <Navigate to="/" replace />;

  // Use <Outlet /> to render nested protected routes
  return <Outlet />;
};

export default ProtectedRoute;