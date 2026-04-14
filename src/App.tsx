import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BookingForm from './pages/BookingForm';
import Success from './pages/Success';
import ManageBooking from './pages/ManageBooking';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BookingForm />} />
        <Route path="/edit/:id" element={<BookingForm />} />
        <Route path="/success/:id" element={<Success />} />
        <Route path="/manage/:id" element={<ManageBooking />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}
