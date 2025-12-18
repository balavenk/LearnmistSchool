import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
    role: string;
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const isActive = (path: string) => {
        return location.pathname === path ? 'bg-gray-700 border-l-4 border-blue-500' : 'hover:bg-gray-700';
    };

    const MenuItem = ({ to, label, icon }: { to: string, label: string, icon?: string }) => (
        <Link
            to={to}
            className={`flex items-center py-3 px-6 text-gray-300 transition-colors duration-200 ${isActive(to)}`}
        >
            {icon && <span className="mr-3">{icon}</span>}
            <span className="font-medium">{label}</span>
        </Link>
    );

    return (
        <div className="flex flex-col w-64 h-screen bg-gray-900 shadow-xl z-10 transition-all duration-300">
            <div className="flex items-center justify-center h-20 border-b border-gray-800">
                <h1 className="text-2xl font-bold text-white tracking-wider">LEARNMIST</h1>
            </div>

            <div className="flex-grow py-6 overflow-y-auto">
                {role === 'SUPER_ADMIN' && (
                    <>
                        <div className="px-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Administration</div>
                        <MenuItem to="/super-admin" label="Dashboard" icon="📊" />
                        <MenuItem to="/add-school" label="Add School" icon="🏫" />
                    </>
                )}

                {role === 'SCHOOL_ADMIN' && (
                    <>
                        <div className="px-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Management</div>
                        <MenuItem to="/school-admin" label="Dashboard" icon="📊" />
                        <MenuItem to="/teachers" label="Teachers" icon="👩‍🏫" />
                        <MenuItem to="/subjects" label="Subjects" icon="📚" />
                    </>
                )}

                {role === 'TEACHER' && (
                    <>
                        <div className="px-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Classroom</div>
                        <MenuItem to="/teacher" label="Dashboard" icon="📊" />
                        <MenuItem to="/students" label="My Students" icon="🎓" />
                    </>
                )}
                {role === 'STUDENT' && (
                    <>
                        <MenuItem to="/student" label="Dashboard" icon="📊" />
                    </>
                )}
            </div>

            <div className="border-t border-gray-800 p-4">
                <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded transition duration-200 font-medium"
                >
                    <span>🚪 Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
