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
                                    {activeTab !== 'STUDENT' && <th className="px-6 py-3">Email</th>}
                                    <th className="px-6 py-3">Status</th>
                                    {/* {activeTab === 'TEACHER' && <th className="px-6 py-3">Subject</th>} */}
                                    {/* {activeTab === 'STUDENT' && <th className="px-6 py-3">Grade</th>} */}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
                                ) : paginatedList.length > 0 ? (
                                    paginatedList.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 font-medium text-slate-900">
                                                {item.username || item.name} {/* Handle both User and Student models */}
                                            </td>
                                            {activeTab !== 'STUDENT' && (
                                                <td className="px-6 py-3 text-slate-500">{item.email}</td>
                                            )}
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${(item.active !== false) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {(item.active !== false) ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            {/* Add extra columns if data available */}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
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
        </div>
    );
};

export default UserManagement;
