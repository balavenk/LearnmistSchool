import React, { useState, useEffect, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';
import api from '../../api/axios';

// Interfaces matching Backend Schemas
interface ClassData {
    id: number;
    name: string;
    section: string;
    grade_id: number;
    class_teacher_id?: number | null;
    school_id: number;
}

interface Grade {
    id: number;
    name: string;
}

interface Teacher {
    id: number;
    username: string;
    email: string;
}

const Classes: React.FC = () => {
    // State
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Create Class Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [newSection, setNewSection] = useState('');
    const [selectedGradeId, setSelectedGradeId] = useState<number | ''>('');
    const [selectedTeacherId, setSelectedTeacherId] = useState<number | ''>('');

    // Assign Teacher Modal State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignClassId, setAssignClassId] = useState<number | null>(null);
    const [assignTeacherId, setAssignTeacherId] = useState<number | ''>('');

    const ITEMS_PER_PAGE = 8;

    // Fetch Data
    const fetchData = async () => {
        try {
            setLoading(true);
            const [classesRes, gradesRes, teachersRes] = await Promise.all([
                api.get('/school-admin/classes/'),
                api.get('/school-admin/grades/'),
                api.get('/school-admin/teachers/')
            ]);
            setClasses(classesRes.data);
            setGrades(gradesRes.data);
            setTeachers(teachersRes.data);
        } catch (error) {
            console.error("Failed to fetch class data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Helper Lookups
    const getGradeName = (id: number) => grades.find(g => g.id === id)?.name || 'Unknown Grade';
    const getTeacherName = (id?: number | null) => {
        if (!id) return 'Unassigned';
        return teachers.find(t => t.id === id)?.username || 'Unknown Teacher';
    };

    // Column Definitions
    const classColumns = useMemo<ColumnDef<ClassData>[]>(() => [
        {
            accessorKey: 'name',
            header: 'Class Name',
            cell: ({ row }) => (
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3 text-sm shrink-0">
                        {row.original.section}
                    </div>
                    <span className="font-medium text-slate-900">{row.original.name}</span>
                </div>
            ),
        },
        {
            id: 'grade_section',
            header: 'Grade & Section',
            cell: ({ row }) => (
                <span className="text-slate-600">
                    {getGradeName(row.original.grade_id)} - Section {row.original.section}
                </span>
            ),
        },
        {
            accessorKey: 'class_teacher_id',
            header: 'Teacher',
            cell: ({ row }) => (
                <span className="text-slate-600">{getTeacherName(row.original.class_teacher_id)}</span>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="text-right">
                    <button
                        onClick={() => openAssignModal(row.original.id, row.original.class_teacher_id)}
                        className="text-sm font-medium px-3 py-1 rounded text-indigo-600 hover:bg-indigo-50"
                    >
                        Assign Teacher
                    </button>
                </div>
            ),
        },
    ], [grades, teachers]);

    // Filter Logic
    const filteredClasses = useMemo(() => {
        return classes.filter(cls =>
            cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getTeacherName(cls.class_teacher_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
            getGradeName(cls.grade_id).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [classes, searchTerm, grades, teachers]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredClasses.length / ITEMS_PER_PAGE);
    const paginatedClasses = filteredClasses.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Handlers
    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/school-admin/classes/', {
                name: newClassName,
                section: newSection,
                grade_id: Number(selectedGradeId),
                class_teacher_id: selectedTeacherId ? Number(selectedTeacherId) : null
            });
            fetchData();
            closeModal();
            toast.success("Class created successfully!");
        } catch (error) {
            console.error("Failed to create class", error);
            toast.error("Failed to create class.");
        }
    };

    const handleAssignTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignClassId || !assignTeacherId) return;
        try {
            // PUT /classes/{class_id}/teacher/{teacher_id}
            await api.put(`/school-admin/classes/${assignClassId}/teacher/${assignTeacherId}`);
            fetchData();
            closeAssignModal();
            toast.success("Teacher assigned successfully!");
        } catch (error) {
            console.error("Failed to assign teacher", error);
            toast.error("Failed to assign teacher.");
        }
    };

    const openAssignModal = (classId: number, currentTeacherId?: number | null) => {
        setAssignClassId(classId);
        setAssignTeacherId(currentTeacherId || '');
        setIsAssignModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewClassName('');
        setNewSection('');
        setSelectedGradeId('');
        setSelectedTeacherId('');
    };

    const closeAssignModal = () => {
        setIsAssignModalOpen(false);
        setAssignClassId(null);
        setAssignTeacherId('');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Classes Management</h1>
                    <p className="text-slate-500 mt-1">Manage all classes, sections, and assigned teachers.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg shadow-sm font-medium transition-colors flex items-center"
                >
                    <span className="mr-2 text-xl leading-none">+</span> Add New Class
                </button>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div className="relative w-full max-w-md">
                    <input
                        type="text"
                        placeholder="Search classes or teachers..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                </div>
                <div className="text-sm text-slate-500">
                    Showing <span className="font-semibold">{filteredClasses.length}</span> classes
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <DataTable
                    data={paginatedClasses}
                    columns={classColumns}
                    isLoading={loading}
                    emptyMessage="No classes found matching your search."
                />

                {/* Pagination */}
                {totalPages > 1 && (
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredClasses.length}
                        pageSize={ITEMS_PER_PAGE}
                    />
                )}
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 my-8 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Add New Class</h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleCreateClass} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label>
                                <input
                                    type="text"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. 10-A"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                                    <select
                                        value={selectedGradeId}
                                        onChange={(e) => setSelectedGradeId(Number(e.target.value))}
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Select Grade</option>
                                        {grades.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                                    <input
                                        type="text"
                                        value={newSection}
                                        onChange={(e) => setNewSection(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. A"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Class Teacher (Optional)</label>
                                <select
                                    value={selectedTeacherId}
                                    onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">Unassigned</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.username}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">Create Class</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Teacher Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Assign Teacher</h2>
                            <button onClick={closeAssignModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleAssignTeacher} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Teacher</label>
                                <select
                                    value={assignTeacherId}
                                    onChange={(e) => setAssignTeacherId(Number(e.target.value))}
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">Select Teacher</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.username}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button type="button" onClick={closeAssignModal} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">Assign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Classes;
