import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

useEffect(() => {
  const checkLicense = async () => {
    try {
      const res = await fetch(`${URL}/check-license`, {
        credentials: "include",
      });

      const data = await res.json();

      if (data.valid) {
        navigate("/dashboard", { replace: true });
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error(err);
      setIsAuthenticated(false);
    }
  };

  checkLicense();
}, [navigate]);

  // Show loading while checking cookie
  if (isAuthenticated === null) return <div>Loading...</div>;

  if (!isAuthenticated) return <Navigate to="/" replace />;

  // Use <Outlet /> to render nested protected routes
  return <Outlet />;
};

export default ProtectedRoute;