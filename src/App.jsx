import React, { useState } from "react";

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./dashboard";
import Report from "./Report";
import Assessment from "./Assessment";

// A simple Login Component
const Login = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Your specific password from the build
    if (password === "YourSecretPassword123") {
      onLogin();
    } else {
      setError("Incorrect password");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
      <h2>Dashboard Access</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="password" 
          placeholder="Enter Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '10px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Login
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Note: basename is removed as HashRouter handles the path relative to index.html
  return (
   <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/assessment" />} />
        <Route path="/assessment" element={<Assessment />} />
        
        {/* Protected Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? (
              <Dashboard />
            ) : (
              <Login onLogin={() => setIsAuthenticated(true)} />
            )
          } 
        />
        
        <Route path="/report/:id" element={<Report />} />
        <Route path="*" element={<Navigate to="/assessment" />} />
      </Routes>
    </Router>
  );
}

export default App;