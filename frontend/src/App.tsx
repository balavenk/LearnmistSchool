import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SchoolAdminDashboard from './pages/SchoolAdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AddSchool from './pages/AddSchool';

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes wrapped in Dashboard Layout */}
                <Route path="/super-admin" element={<DashboardLayout><SuperAdminDashboard /></DashboardLayout>} />
                <Route path="/add-school" element={<DashboardLayout><AddSchool /></DashboardLayout>} />

                <Route path="/school-admin" element={<DashboardLayout><SchoolAdminDashboard /></DashboardLayout>} />
                <Route path="/teacher" element={<DashboardLayout><TeacherDashboard /></DashboardLayout>} />
                <Route path="/student" element={<DashboardLayout><StudentDashboard /></DashboardLayout>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
};

export default App;
