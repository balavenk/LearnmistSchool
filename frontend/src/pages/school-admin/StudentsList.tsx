import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import axios from 'axios';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';

interface Student {
    id: number;
    name: string;
    email?: string;
    grade_id?: number;
    class_id?: number | null;
    active: boolean;
    username?: string;
}

const StudentsList: React.FC = () => {
    const isCorporate = localStorage.getItem('schoolType') === 'Corporate';
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [grades, setGrades] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);

    // Edit Modal State
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editGradeId, setEditGradeId] = useState<number | string>('');
    const [editClassId, setEditClassId] = useState<number | string>('');
    const [editActive, setEditActive] = useState(true);
    const [editUsername, setEditUsername] = useState('');
    const [editPassword, setEditPassword] = useState('');

    const ITEMS_PER_PAGE = 10;

    // Debounce search term to avoid excessive filtering
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const abortController = new AbortController();
        let isMounted = true;

        const fetchAllData = async () => {
            try {
                setLoading(true);
                // Fetch all data in parallel to ensure everything is ready before rendering
                const [studentsRes, gradesRes, classesRes] = await Promise.all([
                    api.get('/school-admin/students/', { signal: abortController.signal }),
                    api.get('/school-admin/grades/', { signal: abortController.signal }),
                    api.get('/school-admin/classes/', { signal: abortController.signal })
                ]);

                if (isMounted) {
                    setStudents(studentsRes.data);
                    setGrades(gradesRes.data);
                    setClasses(classesRes.data);
                }
            } catch (error: any) {
                if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
                if (isMounted) console.error("Failed to fetch data", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchAllData();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, []);

    // Refetch function for use after mutations
    const refetchStudents = async () => {
        try {
            const res = await api.get('/school-admin/students/');
            setStudents(res.data);
        } catch (error: any) {
            if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
            console.error("Failed to refetch students", error);
        }
    };

    const openEditModal = useCallback((student: Student) => {
        setSelectedStudent(student);
        setEditName(student.name);
        setEditEmail(student.email || '');
        setEditGradeId(student.grade_id || '');
        setEditClassId(student.class_id || '');
        setEditActive(student.active);
        setEditUsername(student.username || '');
        setEditPassword(''); // Reset password field
        setIsModalOpen(true);
    }, []);

    const handleDeleteStudent = async (studentId: number) => {
        if (!window.confirm("Are you sure you want to permanently delete this student? This action cannot be undone.")) return;

        try {
            await api.delete(`/school-admin/students/${studentId}`);
            setStudents(prev => prev.filter(s => s.id !== studentId));
            toast.success(isCorporate ? "Employee deleted successfully" : "Student deleted successfully");
        } catch (error) {
            console.error("Failed to delete student", error);
            toast.error("Failed to delete student.");
        }
    };

    const toggleStudentStatus = async (student: Student) => {
        try {
            const newStatus = !student.active;
            await api.patch(`/school-admin/students/${student.id}/status`, {
                active: newStatus
            });
            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, active: newStatus } : s));
            toast.success(`Student ${newStatus ? 'activated' : 'deactivated'} successfully`);
        } catch (error) {
            console.error("Failed to toggle status", error);
            toast.error("Failed to update status.");
        }
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;
        try {
            await api.put(`/school-admin/students/${selectedStudent.id}`, {
                name: editName,
                email: editEmail || null,
                grade_id: editGradeId ? Number(editGradeId) : null,
                class_id: editClassId ? Number(editClassId) : null,
                active: editActive,
                username: editUsername || null,
                password: editPassword || null
            });
            refetchStudents();
            setIsModalOpen(false);
            toast.success(isCorporate ? "Employee updated successfully" : "Student updated successfully");
        } catch (error) {
            console.error("Failed to update student", error);
            toast.error("Failed to update student.");
        }
    };

    // Create efficient lookup maps
    const gradeMap = useMemo(() => {
        const map = new Map<number, string>();
        grades.forEach(g => map.set(g.id, g.name));
        return map;
    }, [grades]);

    const classMap = useMemo(() => {
        const map = new Map<number, { name: string; section: string }>();
        classes.forEach(c => map.set(c.id, { name: c.name, section: c.section }));
        return map;
    }, [classes]);

    const filtered = useMemo(() => {
        if (!debouncedSearchTerm) return students;
        const search = debouncedSearchTerm.toLowerCase();
        return students.filter(s => s?.name?.toLowerCase()?.includes(search));
    }, [students, debouncedSearchTerm]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

    const paginated = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filtered.slice(start, end);
    }, [filtered, currentPage]);

    const columns = useMemo<ColumnDef<Student>[]>(
        () => [
            {
                header: 'Name',
                accessorKey: 'name',
                cell: (info) => (
                    <span className="font-medium text-slate-900">{info.getValue() as string}</span>
                ),
            },
            {
                header: 'Username',
                accessorKey: 'username',
                cell: (info) => (
                    <span className="text-slate-600 font-mono text-xs">
                        {(info.getValue() as string) || '-'}
                    </span>
                ),
            },
            {
                header: 'Active',
                accessorKey: 'active',
                cell: (info) => {
                    const student = info.row.original;
                    const active = student.active;
                    return (
                        <button
                            onClick={() => toggleStudentStatus(student)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                                }`}
                        >
                            {active ? 'Active' : 'Inactive'}
                        </button>
                    );
                },
            },
            {
                header: 'Grade',
                accessorKey: 'grade_id',
                cell: (info) => {
                    const gradeId = info.getValue() as number | undefined;
                    if (!gradeId) return <span className="text-slate-600">-</span>;
                    const gradeName = gradeMap.get(gradeId) || String(gradeId);
                    return <span className="text-slate-600">{gradeName}</span>;
                },
            },
            {
                header: 'Class',
                accessorKey: 'class_id',
                cell: (info) => {
                    const classId = info.getValue() as number | null | undefined;
                    if (!classId) return <span className="text-slate-600">Unassigned</span>;
                    const classData = classMap.get(classId);
                    const className = classData ? `${classData.name} (${classData.section})` : String(classId);
                    return <span className="text-slate-600">{className}</span>;
                },
            },
            {
                header: 'Actions',
                id: 'actions',
                cell: (info) => {
                    const student = info.row.original;
                    return (
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => openEditModal(student)}
                                className="text-indigo-600 hover:text-indigo-800 font-medium text-xs px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => toggleStudentStatus(student)}
                                className={`${student.active ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'} font-medium text-xs px-3 py-1 rounded-md transition-colors`}
                            >
                                {student.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                                onClick={() => handleDeleteStudent(student.id)}
                                className="text-red-600 hover:text-red-800 font-medium text-xs px-3 py-1 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    );
                },
            },
        ],
        [gradeMap, classMap, openEditModal]
    );

    // Add Student State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentUsername, setNewStudentUsername] = useState('');
    const [newStudentPassword, setNewStudentPassword] = useState('');
    const [newStudentConfirmPassword, setNewStudentConfirmPassword] = useState('');
    const [newStudentEmail, setNewStudentEmail] = useState('');
    const [newStudentGradeId, setNewStudentGradeId] = useState<number | ''>('');
    const [newStudentClassId, setNewStudentClassId] = useState<number | ''>('');

    // Auto-generate username from name
    const generateUsername = (name: string): string => {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return `${parts[0]}${parts[parts.length - 1][0]}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        }
        return parts[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    // When name changes, auto-fill username (only if user hasn't manually edited it)
    const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
    useEffect(() => {
        if (!usernameManuallyEdited && newStudentName) {
            setNewStudentUsername(generateUsername(newStudentName));
        }
        if (!newStudentName) {
            setNewStudentUsername('');
            setUsernameManuallyEdited(false);
        }
    }, [newStudentName, usernameManuallyEdited]);

    // Check username uniqueness against already-loaded students
    const usernameIsTaken = newStudentUsername.length > 0 &&
        students.some(s => s.username?.toLowerCase() === newStudentUsername.toLowerCase());

    // Memoize filtered classes for modals to avoid inline filtering on every render
    const filteredClassesForNewStudent = useMemo(() => {
        if (!newStudentGradeId) return [];
        return classes.filter(c => c.grade_id === Number(newStudentGradeId));
    }, [classes, newStudentGradeId]);

    const filteredClassesForEdit = useMemo(() => {
        if (!editGradeId) return [];
        return classes.filter(c => c.grade_id === Number(editGradeId));
    }, [classes, editGradeId]);

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setNewStudentName('');
        setNewStudentUsername('');
        setNewStudentPassword('');
        setNewStudentConfirmPassword('');
        setNewStudentEmail('');
        setNewStudentGradeId('');
        setNewStudentClassId('');
        setUsernameManuallyEdited(false);
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newStudentPassword !== newStudentConfirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }
        if (usernameIsTaken) {
            toast.error("Username is already taken. Please choose a different one.");
            return;
        }
        try {
            await api.post('/school-admin/students/', {
                name: newStudentName,
                username: newStudentUsername || null,
                password: newStudentPassword || null,
                email: newStudentEmail || null,
                grade_id: Number(newStudentGradeId),
                class_id: newStudentClassId ? Number(newStudentClassId) : null
            });
            refetchStudents();
            closeAddModal();
            toast.success(isCorporate ? "Employee created successfully!" : "Student created successfully!");
        } catch (error: any) {
            const detail = error?.response?.data?.detail;
            toast.error(detail || (isCorporate ? "Failed to create employee." : "Failed to create student."));
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100 flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">{isCorporate ? 'Employees' : 'Students'}</h1>
                    <p className="text-slate-500 text-sm">{isCorporate ? 'Manage employee enrollment.' : 'Manage student enrollment.'}</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm flex items-center gap-2"
                >
                    <span>+</span> {isCorporate ? 'Add Employee' : 'Add Student'}
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <input
                    type="text"
                    placeholder={isCorporate ? 'Search employees...' : 'Search students...'}
                    className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>

            <DataTable
                data={paginated}
                columns={columns}
                isLoading={loading}
                emptyMessage={isCorporate ? 'No employees found.' : 'No students found.'}
            />

            {totalPages > 1 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filtered.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                    isLoading={loading}
                />
            )}

            {/* Add Student Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{isCorporate ? 'Add New Employee' : 'Add New Student'}</h2>
                            <button onClick={closeAddModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleAddStudent} className="space-y-4">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newStudentName}
                                    onChange={(e) => setNewStudentName(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                    placeholder="e.g. John Doe"
                                />
                            </div>

                            {/* Username */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={newStudentUsername}
                                        onChange={(e) => {
                                            setUsernameManuallyEdited(true);
                                            setNewStudentUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                                        }}
                                        className={`w-full px-4 py-2 border rounded-lg outline-none font-mono text-sm pr-24 ${usernameIsTaken
                                                ? 'border-red-400 focus:border-red-500 bg-red-50'
                                                : newStudentUsername
                                                    ? 'border-green-400 focus:border-green-500'
                                                    : 'focus:border-indigo-500'
                                            }`}
                                        placeholder="auto-generated"
                                    />
                                    {newStudentUsername && (
                                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${usernameIsTaken ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                            {usernameIsTaken ? '✗ Taken' : '✓ Available'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    Auto-generated from name. Only letters and numbers allowed.
                                </p>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Password <span className="text-slate-400 font-normal">(default: password123)</span>
                                </label>
                                <input
                                    type="password"
                                    value={newStudentPassword}
                                    onChange={(e) => setNewStudentPassword(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                    placeholder="Leave blank to use default"
                                    autoComplete="new-password"
                                />
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={newStudentConfirmPassword}
                                    onChange={(e) => setNewStudentConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                    placeholder="Re-enter password"
                                    autoComplete="new-password"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(Optional)</span></label>
                                <input
                                    type="email"
                                    value={newStudentEmail}
                                    onChange={(e) => setNewStudentEmail(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                    placeholder="student@example.com"
                                />
                            </div>

                            {/* Grade */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{isCorporate ? 'Location' : 'Grade'}</label>
                                <select
                                    required
                                    value={newStudentGradeId}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : '';
                                        setNewStudentGradeId(val);
                                        setNewStudentClassId('');
                                    }}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                >
                                    <option value="">{isCorporate ? 'Select Location' : 'Select Grade'}</option>
                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>

                            {/* Class */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{isCorporate ? 'Department' : 'Class'} <span className="text-slate-400 font-normal">(Optional)</span></label>
                                <select
                                    value={newStudentClassId}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : '';
                                        setNewStudentClassId(val);
                                    }}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500 disabled:bg-slate-100"
                                    disabled={!newStudentGradeId}
                                >
                                    <option value="">{isCorporate ? 'Select Department' : 'Select Class'}</option>
                                    {filteredClassesForNewStudent.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.section})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                                <button type="button" onClick={closeAddModal} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 font-medium">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={usernameIsTaken}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCorporate ? 'Create Employee' : 'Create Student'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {isModalOpen && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{isCorporate ? 'Edit Employee' : 'Edit Student'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleUpdateStudent} className="space-y-4">
                            <div className="text-xs text-slate-500 mb-2 font-mono bg-slate-50 p-2 rounded">
                                Username: {selectedStudent.username}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                    placeholder="student@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    value={editUsername}
                                    onChange={(e) => setEditUsername(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500 font-mono text-sm"
                                    placeholder="Username"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reset Password <span className="text-slate-400 font-normal">(Leave blank to keep current)</span></label>
                                <input
                                    type="password"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                    placeholder="Enter new password"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{isCorporate ? 'Location' : 'Grade'}</label>
                                <select
                                    required
                                    value={editGradeId}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : '';
                                        setEditGradeId(val);
                                        setEditClassId(''); // Reset class if grade changes
                                    }}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                >
                                    <option value="">{isCorporate ? 'Select Location' : 'Select Grade'}</option>
                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{isCorporate ? 'Department' : 'Class'}</label>
                                <select
                                    value={editClassId}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : '';
                                        setEditClassId(val);
                                    }}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500 disabled:bg-slate-100"
                                    disabled={!editGradeId}
                                >
                                    <option value="">Unassigned</option>
                                    {filteredClassesForEdit.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.section})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="block text-sm font-medium text-slate-700">Status:</label>
                                <button
                                    type="button"
                                    onClick={() => setEditActive(!editActive)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${editActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                >
                                    {editActive ? 'Active' : 'Inactive'}
                                </button>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentsList;
