import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

interface TokenPayload {
    role: string;
    sub: string;
    exp: number;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [role, setRole] = useState<string>('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const decoded = jwtDecode<TokenPayload>(token);
            // Basic expiry check
            if (decoded.exp * 1000 < Date.now()) {
                localStorage.removeItem('token');
                navigate('/login');
                return;
            }
            setRole(decoded.role);
        } catch (error) {
            localStorage.removeItem('token');
            navigate('/login');
        }
    }, [navigate]);

    if (!role) return null; // Or a loading spinner

    return (
        <div className="flex h-screen bg-gray-100 font-sans antialiased text-gray-900">
            <Sidebar role={role} />
            <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* Top Header / Breadcrumb Area could go here if requested */}
                <header className="flex items-center justify-between p-6 bg-white shadow-sm z-0">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Welcome, <span className="text-blue-600 capitalize">{role.replace('_', ' ').toLowerCase()}</span>
                    </h2>
                    <div className="flex items-center space-x-4">
                        {/* Profile placeholder */}
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
                            {role.charAt(0)}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                    <div className="container mx-auto max-w-7xl animate-fade-in-up">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
