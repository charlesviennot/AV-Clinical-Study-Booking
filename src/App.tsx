import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UserPortal from './pages/UserPortal';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserPortal />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}
