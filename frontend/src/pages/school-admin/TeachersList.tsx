import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import axios from 'axios';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';

interface Teacher {
    id: number;
    username: string;
    full_name: string;
    email: string;
    status: 'Active' | 'Inactive';
    assigned_grades: string[];
}

const TeachersList: React.FC = () => {
    const isCorporate = localStorage.getItem('schoolType') === 'Corporate';
    const navigate = useNavigate();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Use deferred value for expensive filtering - React 18 feature
    const deferredSearchTerm = useDeferredValue(searchTerm);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newFullName, setNewFullName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newConfirmPassword, setNewConfirmPassword] = useState('');
    // const [newSubject, setNewSubject] = useState(''); // Kept for UI but not sent to API yet

    // Assign Grade Modal State (Placeholder implementation)
    // const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);

    const ITEMS_PER_PAGE = 5;

    // Debug: Log when modal state changes
    useEffect(() => {
        console.log('Add Teacher Modal state:', isCreateModalOpen);
    }, [isCreateModalOpen]);

    useEffect(() => {
        const abortController = new AbortController();
        let isMounted = true;

        const fetchTeachers = async () => {
            try {
                setLoading(true);
                const response = await api.get('/school-admin/teachers/', { signal: abortController.signal });
                if (isMounted) {
                    const data = response.data.map((t: any) => ({
                        id: t.id,
                        username: t.username,
                        full_name: t.full_name || "",
                        email: t.email || "",
                        status: t.active ? 'Active' : 'Inactive',
                        assigned_grades: t.assigned_grades || []
                    }));
                    setTeachers(data);
                }
            } catch (error: any) {
                if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
                if (isMounted) console.error("Failed to fetch teachers", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchTeachers();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, []);

    // Refetch function for use after mutations
    const refetchTeachers = async () => {
        try {
            const response = await api.get('/school-admin/teachers/');
            const data = response.data.map((t: any) => ({
                id: t.id,
                username: t.username,
                full_name: t.full_name || "",
                email: t.email || "",
                status: t.active ? 'Active' : 'Inactive',
                assigned_grades: t.assigned_grades || []
            }));
            setTeachers(data);
        } catch (error: any) {
            if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
            console.error("Failed to refetch teachers", error);
        }
    };

    const filtered = useMemo(() => {
        return teachers.filter(t =>
            t.username.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
            t.full_name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
            t.email.toLowerCase().includes(deferredSearchTerm.toLowerCase())
        );
    }, [teachers, deferredSearchTerm]);

    // Memoize filter loading state to prevent unnecessary re-renders
    const isFilterLoading = useMemo(() => searchTerm !== deferredSearchTerm, [searchTerm, deferredSearchTerm]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

    const paginated = useMemo(() => {
        return filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [filtered, currentPage]);

    // Memoized modal handler to prevent performance issues
    const handleOpenModal = useCallback(() => {
        console.log('Add Teacher button clicked');
        setIsCreateModalOpen(true);
    }, []);

    // Toggle Status Handler - memoized to prevent column recreation
    const toggleStatus = useCallback(async (id: number, currentStatus: string) => {
        try {
            const newActive = currentStatus !== 'Active';
            await api.patch(`/school-admin/teachers/${id}/status`, { active: newActive });
            toast.success(`Teacher ${newActive ? 'activated' : 'deactivated'} successfully`);
            refetchTeachers();
        } catch (error) {
            console.error("Failed to update teacher status", error);
            toast.error("Failed to update teacher status");
        }
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== newConfirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        try {
            await api.post('/school-admin/teachers/', {
                username: newUsername.trim().replace(/\s+/g, ''),
                full_name: newFullName.trim(),
                email: newEmail.trim(),
                password: newPassword, // Custom password
                role: 'TEACHER'
            });
            refetchTeachers();
            setIsCreateModalOpen(false);
            setNewUsername(''); setNewFullName(''); setNewEmail(''); setNewPassword(''); setNewConfirmPassword(''); // setNewSubject('');
            toast.success(isCorporate ? "Manager created successfully" : "Teacher created successfully");
        } catch (error: any) {
            console.error("Failed to create teacher", error);
            const detail = error.response?.data?.detail;
            const message = typeof detail === 'string' ? detail : "Failed to create teacher. Username/Email might be duplicate.";
            toast.error(message);
        }
    };

    const columns: ColumnDef<Teacher>[] = useMemo(
        () => [
            {
                header: 'Username',
                accessorKey: 'username',
                cell: (info) => (
                    <span className="font-medium text-slate-900">{info.getValue() as string}</span>
                ),
            },
            {
                header: 'Full Name',
                accessorKey: 'full_name',
                cell: (info) => (
                    <span className="text-slate-700">{info.getValue() as string || <span className="text-slate-300 italic">Not provided</span>}</span>
                ),
            },
            {
                header: 'Email',
                accessorKey: 'email',
                cell: (info) => (
                    <span className="text-slate-500">{info.getValue() as string}</span>
                ),
            },
            {
                header: 'Grade',
                accessorKey: 'assigned_grades',
                cell: (info) => {
                    const grades = info.getValue() as string[] || [];
                    return grades.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {grades.map((grade, idx) => (
                                <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium border border-indigo-100">
                                    {grade}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="text-slate-400 italic text-xs">No Grade Assigned</span>
                    );
                },
            },
            {
                header: 'Status',
                accessorKey: 'status',
                cell: (info) => {
                    const status = info.getValue() as string;
                    return (
                        <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}
                        >
                            {status}
                        </span>
                    );
                },
            },
            {
                header: 'Actions',
                id: 'actions',
                cell: (info) => {
                    const teacher = info.row.original;
                    return (
                        <div className="text-right space-x-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStatus(teacher.id, teacher.status);
                                }}
                                className={`text-xs font-medium ${teacher.status === 'Active' ? 'text-red-600' : 'text-green-600'
                                    }`}
                            >
                                {teacher.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/school-admin/teachers/${teacher.id}/classes`);
                                }}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                            >
                                Change class
                            </button>
                        </div>
                    );
                },
            },
        ],
        [navigate, toggleStatus]
    );

    const mobileCardRender = useCallback((teacher: Teacher) => (
        <div className="space-y-2">
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100 flex justify-between items-start mb-6">
                <div>
                    <h4 className="font-bold text-slate-900">{teacher.username}</h4>
                    {teacher.full_name && <p className="text-sm font-medium text-slate-700">{teacher.full_name}</p>}
                    <p className="text-sm text-slate-500">{teacher.email}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${teacher.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {teacher.status}
                </span>
            </div>
            <div className="flex flex-wrap gap-1">
                {teacher.assigned_grades.map((grade, idx) => (
                    <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium border border-indigo-100">
                        {grade}
                    </span>
                ))}
            </div>
            <div className="flex gap-4 pt-2 border-t border-slate-100">
                <button
                    onClick={() => toggleStatus(teacher.id, teacher.status)}
                    className={`text-xs font-medium ${teacher.status === 'Active' ? 'text-red-600' : 'text-green-600'}`}
                >
                    {teacher.status === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                    onClick={() => navigate(`/school-admin/teachers/${teacher.id}/classes`)}
                    className="text-xs font-medium text-indigo-600"
                >
                    Change class
                </button>
            </div>
        </div>
    ), [navigate, toggleStatus]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">{isCorporate ? 'Managers' : 'Teachers'}</h1>
                    <p className="text-slate-500 text-sm">{isCorporate ? 'Manage managers staff.' : 'Manage teaching staff.'}</p>
                </div>
                <button onClick={handleOpenModal} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    + {isCorporate ? 'Add Manager' : 'Add Teacher'}
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative">
                    <input
                        type="text"
                        placeholder={isCorporate ? 'Search managers...' : 'Search teachers...'}
                        className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                    {isFilterLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <DataTable
                    data={paginated}
                    columns={columns}
                    isLoading={loading}
                    emptyMessage={isCorporate ? 'No managers found.' : 'No teachers found.'}
                    mobileCardRender={mobileCardRender}
                />
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filtered.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                    isLoading={loading}
                />
            </div>

            {/* Create Teacher Modal */}
            {isCreateModalOpen && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsCreateModalOpen(false);
                    }}
                >
                    <div
                        className="bg-white rounded-xl shadow-lg w-full max-w-md p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{isCorporate ? 'Add Manager' : 'Add Teacher'}</h2>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input value={newFullName} onChange={e => setNewFullName(e.target.value)} placeholder="Full Name" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Username" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" type="email" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password" type="password" required minLength={6} className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <input value={newConfirmPassword} onChange={e => setNewConfirmPassword(e.target.value)} placeholder="Confirm Password" type="password" required minLength={6} className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeachersList;
