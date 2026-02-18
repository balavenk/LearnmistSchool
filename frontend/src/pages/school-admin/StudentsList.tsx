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
        setIsModalOpen(true);
    }, []);

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;
        try {
            await api.put(`/school-admin/students/${selectedStudent.id}`, {
                name: editName,
                email: editEmail || null,
                grade_id: editGradeId ? Number(editGradeId) : null,
                class_id: editClassId ? Number(editClassId) : null,
                active: editActive
            });
            refetchStudents();
            setIsModalOpen(false);
            toast.success("Student updated successfully");
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
                    const active = info.getValue() as boolean;
                    return (
                        <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                        >
                            {active ? 'Active' : 'Inactive'}
                        </span>
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
                        <div className="text-right">
                            <button
                                onClick={() => openEditModal(student)}
                                className="text-indigo-600 hover:text-indigo-800 font-medium text-xs px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                            >
                                Edit
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
    const [newStudentEmail, setNewStudentEmail] = useState('');
    const [newStudentGradeId, setNewStudentGradeId] = useState<number | ''>('');
    const [newStudentClassId, setNewStudentClassId] = useState<number | ''>('');

    // Memoize filtered classes for modals to avoid inline filtering on every render
    const filteredClassesForNewStudent = useMemo(() => {
        if (!newStudentGradeId) return [];
        return classes.filter(c => c.grade_id === Number(newStudentGradeId));
    }, [classes, newStudentGradeId]);

    const filteredClassesForEdit = useMemo(() => {
        if (!editGradeId) return [];
        return classes.filter(c => c.grade_id === Number(editGradeId));
    }, [classes, editGradeId]);

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/school-admin/students/', {
                name: newStudentName,
                email: newStudentEmail || null,
                grade_id: Number(newStudentGradeId),
                class_id: newStudentClassId ? Number(newStudentClassId) : null
            });
            refetchStudents();
            setIsAddModalOpen(false);
            setNewStudentName('');
            setNewStudentEmail('');
            setNewStudentGradeId('');
            setNewStudentClassId('');
            toast.success("Student created successfully!");
        } catch (error) {
            console.error("Failed to create student", error);
            toast.error("Failed to create student.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Students</h1>
                    <p className="text-slate-500 text-sm">Manage student enrollment.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm flex items-center gap-2"
                >
                    <span>+</span> Add Student
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <input
                    type="text"
                    placeholder="Search students..."
                    className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>

            <DataTable
                data={paginated}
                columns={columns}
                isLoading={loading}
                emptyMessage="No students found."
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
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Add New Student</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleAddStudent} className="space-y-4">
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
                                <p className="text-xs text-slate-400 mt-1">Username will be auto-generated (e.g. johnd)</p>
                            </div>

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

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
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
                                    <option value="">Select Grade</option>
                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Class (Optional)</label>
                                <select
                                    value={newStudentClassId}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : '';
                                        setNewStudentClassId(val);
                                    }}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500 disabled:bg-slate-100"
                                    disabled={!newStudentGradeId}
                                >
                                    <option value="">Select Class</option>
                                    {filteredClassesForNewStudent.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.section})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">Create Student</button>
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
                            <h2 className="text-xl font-bold">Edit Student</h2>
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
                                <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
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
                                    <option value="">Select Grade</option>
                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
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
