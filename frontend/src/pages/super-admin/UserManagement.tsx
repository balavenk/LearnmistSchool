import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';

// --- Types ---
type UserRole = 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT';

interface School {
    id: number;
    name: string;
}

interface User {
    id: number;
    username: string; // Map to name for display if needed, or use username
    email: string;
    role: string;
    active: boolean;
    last_login?: string;
    // Helper fields for display
    name?: string;
    status?: string;
    subject?: string;
}

interface Student {
    id: number;
    name: string;
    active: boolean;
    // grade_id? class_id?
    grade_id: number;
    username?: string;
    user_id?: number; // Linked user ID
    last_login?: string;
}

const UserManagement: React.FC = () => {
    // --- State ---
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<UserRole>('SCHOOL_ADMIN');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Data State
    const [users, setUsers] = useState<User[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);

    // --- Constants ---
    const ITEMS_PER_PAGE = 10;

    // --- Fetch Schools ---
    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const res = await api.get('/super-admin/schools/');
                setSchools(res.data);
            } catch (err) {
                console.error("Failed to fetch schools", err);
            }
        };
        fetchSchools();
    }, []);

    // --- Fetch Users/Students when School or Tab changes ---
    useEffect(() => {
        if (!selectedSchoolId) {
            setUsers([]);
            setStudents([]);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                if (activeTab === 'STUDENT') {
                    const res = await api.get(`/super-admin/schools/${selectedSchoolId}/students`);
                    setStudents(res.data);
                } else {
                    const res = await api.get(`/super-admin/schools/${selectedSchoolId}/users`, {
                        params: { role: activeTab }
                    });
                    setUsers(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedSchoolId, activeTab]);

    // --- Derived State ---
    const filteredList = useMemo(() => {
        let list: any[] = activeTab === 'STUDENT' ? students : users;

        return list.filter(item => {
            const searchLower = searchTerm.toLowerCase();
            const name = (item.name || item.username || '').toLowerCase();
            const email = (item.email || '').toLowerCase();
            return name.includes(searchLower) || email.includes(searchLower);
        });
    }, [users, students, activeTab, searchTerm]);

    const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);
    const paginatedList = filteredList.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // --- Handlers ---
    const handleTabChange = (tab: UserRole) => {
        setActiveTab(tab);
        setCurrentPage(1); // Reset page on tab change
        setSearchTerm(''); // Reset search
    };

    const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSchoolId(Number(e.target.value));
        setCurrentPage(1);
        setSearchTerm('');
    };

    // --- Action Handlers ---
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [selectedUserForReset, setSelectedUserForReset] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState('');

    const handleDeactivate = async (userId: number, currentStatus: boolean) => {
        if (!userId) {
            alert("No user linked to this record.");
            return;
        }
        if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) return;

        try {
            const endpoint = currentStatus
                ? `/super-admin/users/${userId}/deactivate`
                : `/super-admin/users/${userId}/activate`;

            await api.post(endpoint);

            // Update local state
            // Update local state

            // Note: Student objects have 'id' (student id) and optionally 'user_id' (login id).
            // User objects have 'id' (user id).
            // If activeTab is STUDENT, we iterate students. If user clicked deactivate, we must targeting the LOGIN user_id.

            if (activeTab === 'STUDENT') {
                setStudents(prev => prev.map(s => {
                    // Start by assuming s.id is student id. But we passed userId which is the login ID?
                    // Wait, we should pass the LOGIN ID to the API. 
                    // For Students, login ID is not s.id. We need s.user_id if available?
                    // Student interface update needed?
                    // Let's assume we pass the Correct ID to this function.
                    // But updating the list requires matching.
                    // If we passed the User ID, we find student with user_id == userId.
                    // But Student schema in frontend doesn't show user_id explicitly yet? 
                    // Check Schema: Student has user_id FK.
                    // Frontend Interface needs to include user_id.
                    return s; // Placeholder, reload data might be easier
                }));
                // Trigger reload
                const res = await api.get(`/super-admin/schools/${selectedSchoolId}/students`);
                setStudents(res.data);
            } else {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !currentStatus } : u));
            }

        } catch (error) {
            console.error("Action failed", error);
            alert("Failed to update status.");
        }
    };

    const handleResetClick = (userId: number) => {
        if (!userId) {
            alert("No user login linked.");
            return;
        }
        setSelectedUserForReset(userId);
        setNewPassword('');
        setResetModalOpen(true);
    };

    const handleSavePassword = async () => {
        if (!selectedUserForReset || !newPassword) return;
        try {
            await api.post(`/super-admin/users/${selectedUserForReset}/reset-password`, { password: newPassword });
            alert("Password reset successfully.");
            setResetModalOpen(false);
            setNewPassword('');
            setSelectedUserForReset(null);
        } catch (error) {
            console.error("Reset failed", error);
            alert("Failed to reset password.");
        }
    };

    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-4 text-white shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">User Management</h1>
                        <p className="text-indigo-100 text-md">Manage school admins, teachers, and students across all schools</p>
                    </div>

                    <div className="w-full md:w-80">
                        <label className="block text-sm font-bold text-indigo-100 mb-2">Select School</label>
                        <select
                            className="w-full px-4 py-2 border-2 border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:border-white outline-none bg-white/10 backdrop-blur-sm font-medium text-white placeholder-indigo-200"
                            value={selectedSchoolId || ''}
                            onChange={handleSchoolChange}
                        >
                            <option value="" disabled className="text-slate-900">-- Choose a School --</option>
                            {schools.map(school => (
                                <option key={school.id} value={school.id} className="text-slate-900">{school.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {selectedSchoolId ? (
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden">
                    {/* Enhanced Tabs */}
                    <div className="flex border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                        <button
                            onClick={() => handleTabChange('SCHOOL_ADMIN')}
                            className={`flex-1 py-3 text-sm font-bold text-center border-b-4 transition-all duration-200 ${activeTab === 'SCHOOL_ADMIN'
                                ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                School Admins
                            </div>
                        </button>
                        <button
                            onClick={() => handleTabChange('TEACHER')}
                            className={`flex-1 py-3 text-sm font-bold text-center border-b-4 transition-all duration-200 ${activeTab === 'TEACHER'
                                ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Teachers
                            </div>
                        </button>
                        <button
                            onClick={() => handleTabChange('STUDENT')}
                            className={`flex-1 py-3 text-sm font-bold text-center border-b-4 transition-all duration-200 ${activeTab === 'STUDENT'
                                ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                Students
                            </div>
                        </button>
                    </div>

                    {/* Enhanced Toolbar (Search) */}
                    <div className="p-2 border-b-2 border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-50 to-slate-100">
                        <div className="relative w-full sm:w-96">
                            <svg className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder={`Search ${activeTab === 'SCHOOL_ADMIN' ? 'admins' : activeTab === 'TEACHER' ? 'teachers' : 'students'} by name or email...`}
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-12 pr-4 py-2 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-indigo-100 px-4 py-2 rounded-xl border-2 border-indigo-200">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-sm font-bold text-indigo-900">{filteredList.length}</span>
                            <span className="text-sm text-indigo-600">Total</span>
                        </div>
                    </div>

                    {/* Enhanced Table */}
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b-2 border-slate-200 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Username</th>
                                    {activeTab !== 'STUDENT' && <th className="px-6 py-4 text-xs uppercase tracking-wider">Email</th>}
                                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Last Login</th>
                                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-16 text-center"><div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div></td></tr>
                                ) : paginatedList.length > 0 ? (
                                    paginatedList.map((item) => (
                                        <tr key={item.id} className="hover:bg-indigo-50 transition-colors duration-150">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl p-2.5 font-bold text-sm shadow-md">
                                                        {(item.name || item.username || 'U').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-slate-900">{item.name || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {item.username}
                                            </td>
                                            {activeTab !== 'STUDENT' && (
                                                <td className="px-6 py-4 text-slate-600">{item.email}</td>
                                            )}
                                            <td className="px-6 py-4 text-slate-500">
                                                {item.last_login ? new Date(item.last_login).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : <span className="text-xs text-slate-400 italic">Never logged in</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${(item.active !== false) ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                                                    }`}>
                                                    <span className={`w-2 h-2 rounded-full ${(item.active !== false) ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                    {(item.active !== false) ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2 text-sm font-bold">
                                                    {/* ID Resolution: item.id is UserID for admins/teachers. For Student, item.user_id is the login ID. */}
                                                    {(() => {
                                                        const loginId = activeTab === 'STUDENT' ? (item as any).user_id : item.id;
                                                        if (!loginId) return <span className="text-slate-400 text-xs italic">No Login</span>;

                                                        return (
                                                            <>
                                                                <button
                                                                    onClick={() => handleDeactivate(loginId, item.active !== false)}
                                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border ${item.active !== false ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200' : 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200'}`}
                                                                >
                                                                    {item.active !== false ? '⏸' : '▶'}
                                                                    {item.active !== false ? 'Deactivate' : 'Activate'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleResetClick(loginId)}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                                    </svg>
                                                                    Reset
                                                                </button>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            {/* Add extra columns if data available */}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-4">
                                                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-slate-500 font-medium text-lg">No {activeTab.toLowerCase().replace('_', ' ')}s found</p>
                                                <p className="text-slate-400 text-sm mt-1">Try adjusting your search criteria</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Enhanced Pagination */}
                    {totalPages > 1 && (
                        <div className="p-2 border-t-2 border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-100 shrink-0">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-slate-300 rounded-xl text-sm font-bold bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Previous
                            </button>
                            <div className="flex items-center gap-2 bg-indigo-100 px-4 py-2 rounded-xl border-2 border-indigo-200">
                                <span className="text-sm font-bold text-indigo-900">Page {currentPage}</span>
                                <span className="text-sm text-indigo-600">of</span>
                                <span className="text-sm font-bold text-indigo-900">{totalPages}</span>
                            </div>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-slate-300 rounded-xl text-sm font-bold bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
                            >
                                Next
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl">
                    <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-slate-100 mb-6">
                        <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-700 mb-2">No School Selected</h3>
                    <p className="text-slate-500 text-lg">Please select a school from the dropdown above to manage users</p>
                </div>
            )}
            {/* Enhanced Reset Password Modal */}
            {resetModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-slate-200">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-slate-200">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-3">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Reset Password</h3>
                        </div>
                        <p className="text-slate-500 mb-5 text-sm">Enter a new password for the selected user. Make sure it's secure and memorable.</p>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">New Password *</label>
                            <input
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div className="flex gap-4 pt-4 border-t-2 border-slate-200">
                            <button
                                onClick={() => setResetModalOpen(false)}
                                className="flex-1 px-6 py-3 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-all hover:shadow-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePassword}
                                disabled={!newPassword}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save Password
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
