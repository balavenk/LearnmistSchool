import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

// Icons (using simple text or SVGs later, for now text is fine or we can use a library if available. 
// Since we don't have lucide-react or similar installed yet, I'll use simple text/emoji or basic svgs)

interface SidebarProps {
    role: string;
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center px-6 py-3 text-sm font-medium transition-colors duration-200 ${isActive
            ? 'bg-indigo-900/50 text-white border-r-4 border-indigo-400'
            : 'text-gray-400 hover:bg-slate-800 hover:text-white'
        }`;

    return (
        <div className="flex flex-col w-64 h-screen bg-slate-900 text-white border-r border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-center h-20 border-b border-slate-800">
                <h1 className="text-xl font-bold tracking-wider text-indigo-400">LEARNMIST</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto mt-6">
                <ul className="space-y-1">
                    {/* SUPER ADMIN LINKS */}
                    {role === 'SUPER_ADMIN' && (
                        <>
                            <li>
                                <NavLink to="/super-admin" end className={linkClass}>
                                    Dashboard
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/schools" className={linkClass}>
                                    Schools
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/user-management" className={linkClass}>
                                    User Management
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/settings" className={linkClass}>
                                    Settings
                                </NavLink>
                            </li>
                        </>
                    )}

                    {/* SCHOOL ADMIN LINKS */}
                    {role === 'SCHOOL_ADMIN' && (
                        <>
                            <li>
                                <NavLink to="/school-admin" end className={linkClass}>
                                    Dashboard
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/school-admin/grades" className={linkClass}>
                                    Grades
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/school-admin/subjects" className={linkClass}>
                                    Subjects
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/school-admin/teachers" className={linkClass}>
                                    Teachers
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/school-admin/students" className={linkClass}>
                                    Students
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/classes" className={linkClass}>
                                    Classes
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/school-admin/question-bank" className={linkClass}>
                                    Question Bank
                                </NavLink>
                            </li>
                        </>
                    )}

                    {/* TEACHER LINKS */}
                    {role === 'TEACHER' && (
                        <>
                            <li>
                                <NavLink to="/teacher" end className={linkClass}>
                                    Dashboard
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/my-classes" className={linkClass}>
                                    My Classes
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/assignments" className={linkClass}>
                                    Assignments
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/grading" className={linkClass}>
                                    Grading
                                </NavLink>
                            </li>
                        </>
                    )}

                    {/* STUDENT LINKS */}
                    {role === 'STUDENT' && (
                        <>
                            <li>
                                <NavLink to="/student" end className={linkClass}>
                                    Dashboard
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/my-grades" className={linkClass}>
                                    My Grades
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/schedule" className={linkClass}>
                                    Schedule
                                </NavLink>
                            </li>
                        </>
                    )}
                </ul>
            </nav>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
