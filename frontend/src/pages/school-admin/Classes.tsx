import React, { useState, useEffect, useMemo, useCallback, useTransition, useDeferredValue } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';
import api from '../../api/axios';
import { isValidInput } from '../../utils/inputValidation';
import axios from 'axios';

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
    const [, startTransition] = useTransition();
    
    // Use deferred value for expensive filtering - React 18 feature
    const deferredSearchTerm = useDeferredValue(searchTerm);

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

    // Debug: Log when modal state changes
    useEffect(() => {
        console.log('Create Class Modal state:', isModalOpen);
    }, [isModalOpen]);

    useEffect(() => {
        console.log('Assign Teacher Modal state:', isAssignModalOpen);
    }, [isAssignModalOpen]);

    // Fetch Data
    useEffect(() => {
        const abortController = new AbortController();
        let isMounted = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                const [classesRes, gradesRes, teachersRes] = await Promise.all([
                    api.get('/school-admin/classes/', { signal: abortController.signal }),
                    api.get('/school-admin/grades/', { signal: abortController.signal }),
                    api.get('/school-admin/teachers/', { signal: abortController.signal })
                ]);
                
                if (isMounted) {
                    setClasses(classesRes.data);
                    setGrades(gradesRes.data);
                    setTeachers(teachersRes.data);
                }
            } catch (error: any) {
                // Silently ignore canceled requests (navigation away from page)
                if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') {
                    return;
                }
                if (isMounted) {
                    console.error("Failed to fetch class data", error);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, []);

    // Create efficient lookup maps - O(1) instead of O(n)
    const gradeMap = useMemo(() => {
        const map = new Map<number, string>();
        grades.forEach(g => map.set(g.id, g.name));
        return map;
    }, [grades]);

    const teacherMap = useMemo(() => {
        const map = new Map<number, string>();
        teachers.forEach(t => map.set(t.id, t.username));
        return map;
    }, [teachers]);

    // Helper Lookups - Using maps for O(1) performance
    const getGradeName = useCallback((id: number) => {
        return gradeMap.get(id) || 'Unknown Grade';
    }, [gradeMap]);
    
    const getTeacherName = useCallback((id?: number | null) => {
        if (!id) return 'Unassigned';
        return teacherMap.get(id) || 'Unknown Teacher';
    }, [teacherMap]);

    // Handler - defined before columns
    const openAssignModal = useCallback((classId: number, currentTeacherId?: number | null) => {
        console.log('Assign Teacher button clicked for class:', classId);
        setAssignClassId(classId);
        setAssignTeacherId(currentTeacherId || '');
        setIsAssignModalOpen(true);
    }, []);

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
    ], [getGradeName, getTeacherName, openAssignModal]);

    // Filter Logic - Optimized to avoid repeated function calls
    const filteredClasses = useMemo(() => {
        if (!deferredSearchTerm.trim()) return classes;
        
        const search = deferredSearchTerm.toLowerCase();
        return classes.filter(cls => {
            if (!cls) return false;
            
            // Check class name
            if (cls.name?.toLowerCase()?.includes(search)) return true;
            
            // Check teacher name using map
            const teacherName = cls.class_teacher_id ? 
                (teacherMap.get(cls.class_teacher_id) || '').toLowerCase() : 'unassigned';
            if (teacherName.includes(search)) return true;
            
            // Check grade name using map
            const gradeName = (gradeMap.get(cls.grade_id) || '').toLowerCase();
            if (gradeName.includes(search)) return true;
            
            return false;
        });
    }, [classes, deferredSearchTerm, teacherMap, gradeMap]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredClasses.length / ITEMS_PER_PAGE);
    
    const paginatedClasses = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredClasses.slice(start, end);
    }, [filteredClasses, currentPage]);

    // Memoize filter loading state to prevent unnecessary re-renders
    const isFilterLoading = useMemo(() => searchTerm !== deferredSearchTerm, [searchTerm, deferredSearchTerm]);

    // Refetch function for handlers
    const refetchData = useCallback(async () => {
        try {
            const [classesRes, gradesRes, teachersRes] = await Promise.all([
                api.get('/school-admin/classes/'),
                api.get('/school-admin/grades/'),
                api.get('/school-admin/teachers/')
            ]);
            setClasses(classesRes.data);
            setGrades(gradesRes.data);
            setTeachers(teachersRes.data);
        } catch (error) {
            console.error("Failed to refetch class data", error);
        }
    }, []);


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

    // Memoized search handler to prevent unnecessary re-renders
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        // Reset page in a transition to keep UI responsive
        startTransition(() => {
            setCurrentPage(1);
        });
    }, []);

    // Memoized clear handler for better performance
    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        startTransition(() => {
            setCurrentPage(1);
        });
    }, []);

    // Memoized modal handlers to prevent performance issues
    const handleOpenModal = useCallback(() => {
        console.log('Add New Class button clicked');
        setIsModalOpen(true);
    }, []);

    // Handlers
    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGradeId) {
            toast.error("Please select a grade");
            return;
        }
        try {
            await api.post('/school-admin/classes/', {
                name: newClassName,
                section: newSection,
                grade_id: Number(selectedGradeId),
                class_teacher_id: selectedTeacherId ? Number(selectedTeacherId) : null
            });
            await refetchData();
            closeModal();
            toast.success("Class created successfully!");
        } catch (error: any) {
            console.error("Failed to create class", error);
            const errorMsg = error?.response?.data?.detail || "Failed to create class.";
            toast.error(errorMsg);
        }
    };

    const handleAssignTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignClassId || !assignTeacherId) {
            toast.error("Please select a teacher");
            return;
        }
        try {
            // PUT /classes/{class_id}/teacher/{teacher_id}
            await api.put(`/school-admin/classes/${assignClassId}/teacher/${assignTeacherId}`);
            await refetchData();
            closeAssignModal();
            toast.success("Teacher assigned successfully!");
        } catch (error: any) {
            console.error("Failed to assign teacher", error);
            const errorMsg = error?.response?.data?.detail || "Failed to assign teacher.";
            toast.error(errorMsg);
        }
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
                    onClick={handleOpenModal}
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
                        onChange={handleSearchChange}
                        className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                    {searchTerm && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="Clear search"
                        >
                            ✕
                        </button>
                    )}
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
                    isLoading={loading || isFilterLoading}
                    emptyMessage="No classes found matching your search."
                />

                {/* Pagination */}
                {totalPages > 1 && (
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredClasses.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        isLoading={isFilterLoading}
                    />
                )}
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div 
                        className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Add New Class</h2>
                            <button 
                                type="button"
                                onClick={closeModal} 
                                className="text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateClass} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label>
                                <input
                                    type="text"
                                    value={newClassName}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (isValidInput(value)) {
                                            setNewClassName(value);
                                        }
                                    }}
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. 10-A"
                                />
                                {/* Optionally show a warning */}
                                {!isValidInput(newClassName) && newClassName.length > 0 && (
                                    <div className="text-xs text-red-500 mt-1">Special characters are not allowed.</div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                                    <select
                                        value={selectedGradeId}
                                        onChange={(e) => {
                                            const val = e.target.value ? Number(e.target.value) : '';
                                            setSelectedGradeId(val);
                                        }}
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
                                         onChange={(e) => {
                                            const value = e.target.value;
                                            if (isValidInput(value)) {
                                                setNewSection(value);
                                            }
                                         }}
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. A"
                                    />
                                      {/* Optionally show a warning */}
                                    {!isValidInput(newSection) && newSection.length > 0 && (
                                        <div className="text-xs text-red-500 mt-1">Special characters are not allowed.</div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Class Teacher (Optional)</label>
                                <select
                                    value={selectedTeacherId}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : '';
                                        setSelectedTeacherId(val);
                                    }}
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
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeAssignModal();
                    }}
                >
                    <div 
                        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Assign Teacher</h2>
                            <button 
                                type="button"
                                onClick={closeAssignModal} 
                                className="text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleAssignTeacher} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Teacher</label>
                                <select
                                    value={assignTeacherId}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : '';
                                        setAssignTeacherId(val);
                                    }}
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
