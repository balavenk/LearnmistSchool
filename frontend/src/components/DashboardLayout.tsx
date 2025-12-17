import React from 'react';
import Sidebar from './Sidebar';

// Mock function to get role from token (since we are mocking, we can just read from localStorage directly or passing it down)
// For this layout, we'll assume the role is stored in localStorage along with the token for simplicity in this mock phase.
const getRole = () => {
    return localStorage.getItem('role') || 'STUDENT';
};

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const role = getRole();

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <Sidebar role={role} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header (Optional, good for user profile or simple breadcrumbs) */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 justify-between">
                    <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-600">
                            Welcome, {localStorage.getItem('username') || 'User'} ({role.replace('_', ' ')})
                        </span>
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {(localStorage.getItem('username') || 'U')[0].toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
