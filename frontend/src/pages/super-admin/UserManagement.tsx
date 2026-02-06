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
            {/* Header & School Selector */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                        <p className="text-slate-500 text-sm mt-1">Select a school to manage its users.</p>
                    </div>

                    <div className="w-full md:w-72">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1">Select School</label>
                        <select
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50 font-medium text-slate-700"
                            value={selectedSchoolId || ''}
                            onChange={handleSchoolChange}
                        >
                            <option value="" disabled>-- Choose a School --</option>
                            {schools.map(school => (
                                <option key={school.id} value={school.id}>{school.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {selectedSchoolId ? (
                <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-200">
                        <button
                            onClick={() => handleTabChange('SCHOOL_ADMIN')}
                            className={`flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'SCHOOL_ADMIN'
                                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            School Admins
                        </button>
                        <button
                            onClick={() => handleTabChange('TEACHER')}
                            className={`flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'TEACHER'
                                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            Teachers
                        </button>
                        <button
                            onClick={() => handleTabChange('STUDENT')}
                            className={`flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'STUDENT'
                                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            Students
                        </button>
                    </div>

                    {/* Toolbar (Search) */}
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                        <div className="relative w-full max-w-sm">
                            <input
                                type="text"
                                placeholder={`Search ${activeTab === 'SCHOOL_ADMIN' ? 'admins' : activeTab === 'TEACHER' ? 'teachers' : 'students'}...`}
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                            />
                            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                        </div>
                        <div className="text-sm text-slate-500">
                            Total: <span className="font-semibold text-slate-900">{filteredList.length}</span>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Username</th>
                                    {activeTab !== 'STUDENT' && <th className="px-6 py-3">Email</th>}
                                    <th className="px-6 py-3">Last Login</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Actions</th>
                                    {/* {activeTab === 'TEACHER' && <th className="px-6 py-3">Subject</th>} */}
                                    {/* {activeTab === 'STUDENT' && <th className="px-6 py-3">Grade</th>} */}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
                                ) : paginatedList.length > 0 ? (
                                    paginatedList.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 font-medium text-slate-900">
                                                {/* For Students, we have name. For Users, we might not. */}
                                                {item.name || '-'}
                                            </td>
                                            <td className="px-6 py-3 text-slate-500">
                                                {item.username}
                                            </td>
                                            {activeTab !== 'STUDENT' && (
                                                <td className="px-6 py-3 text-slate-500">{item.email}</td>
                                            )}
                                            <td className="px-6 py-3 text-slate-500">
                                                {item.last_login ? new Date(item.last_login).toLocaleString() : <span className="text-xs text-slate-300">Never</span>}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${(item.active !== false) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {(item.active !== false) ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex gap-4 text-sm font-medium">
                                                    {/* ID Resolution: item.id is UserID for admins/teachers. For Student, item.user_id is the login ID. */}
                                                    {(() => {
                                                        const loginId = activeTab === 'STUDENT' ? (item as any).user_id : item.id;
                                                        if (!loginId) return <span className="text-slate-400">No Login</span>;

                                                        return (
                                                            <>
                                                                <button
                                                                    onClick={() => handleDeactivate(loginId, item.active !== false)}
                                                                    className={`${item.active !== false ? 'text-amber-600 hover:text-amber-900' : 'text-green-600 hover:text-green-900'}`}
                                                                >
                                                                    {item.active !== false ? 'Deactivate' : 'Activate'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleResetClick(loginId)}
                                                                    className="text-indigo-600 hover:text-indigo-900"
                                                                >
                                                                    Reset Password
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
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                            No {activeTab.toLowerCase().replace('_', ' ')}s found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <span className="text-sm text-slate-500">
                                Page {currentPage} of {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border border-slate-300 rounded bg-white text-sm disabled:opacity-50 hover:bg-slate-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 border border-slate-300 rounded bg-white text-sm disabled:opacity-50 hover:bg-slate-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                    <div className="text-6xl mb-4 opacity-20">🏫</div>
                    <h3 className="text-xl font-semibold text-slate-700">No School Selected</h3>
                    <p className="text-slate-500">Please select a school from the dropdown above to manage users.</p>
                </div>
            )}
            {/* Reset Password Modal */}
            {resetModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Reset Password</h3>
                        <p className="text-slate-500 mb-4 text-sm">Enter a new password for the selected user.</p>

                        <input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New Password"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-6 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setResetModalOpen(false)}
                                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePassword}
                                disabled={!newPassword}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
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
