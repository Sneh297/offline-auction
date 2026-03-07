import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import URL from "../utils/URL";

function AddLicense() {
  const [license, setLicense] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    // Check if the license cookie exists
    const licenseCookie = document.cookie
      .split("; ")
      .find(row => row.startsWith("license="))
      ?.split("=")[1];

    setIsAuthenticated(!!licenseCookie);

    // Redirect after setting state
    if (licenseCookie) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  // Show loading while checking cookie
  if (isAuthenticated === null) return <div>Loading...</div>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${URL}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ license }),
      });

      const data = await res.json();

      if (data.valid === false) {
        setError("Invalid license");
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError("Server error");
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h2>Enter Your License</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={license}
          onChange={(e) => setLicense(e.target.value)}
          placeholder="Enter license"
          required
        />
        <button type="submit">Verify</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default AddLicense;