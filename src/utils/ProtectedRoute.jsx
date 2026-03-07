import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import URL from "../utils/URL";

const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkLicense = async () => {
      try {
        const res = await fetch(`${URL}/check-license`, {
          credentials: "include",
        });

        const data = await res.json();

        setIsAuthenticated(data.valid);
      } catch (err) {
        console.error(err);
        setIsAuthenticated(false);
      }
    };

    checkLicense();
  }, []);

  if (isAuthenticated === null) return <div>Loading...</div>;

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
};

export default ProtectedRoute;