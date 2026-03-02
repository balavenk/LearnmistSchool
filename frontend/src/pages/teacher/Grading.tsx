import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../components/DataTable';
import api from '../../api/axios';
import { PAGINATION_CONFIG } from '../../config/pagination';
import toast from 'react-hot-toast';

interface ClassOption {
    id: number;
    name: string;
    section: string;
    grade?: { name: string };
}

interface SubjectOption {
    id: number;
    name: string;
}

interface Student {
    id: number;
    name: string;
    grade_id: number;
    class_id: number;
    active: boolean;
}

const TeacherGrading: React.FC = () => {
    const navigate = useNavigate();
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [fetchingStudents, setFetchingStudents] = useState(false);
    const [maxPageSize, setMaxPageSize] = useState(PAGINATION_CONFIG.MAX_PAGE_SIZE);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [classesRes, subjectsRes, settingsRes] = await Promise.all([
                    api.get('/teacher/classes/'),
                    api.get('/teacher/subjects/'),
                    api.get('/teacher/settings')
                ]);
                setClasses(classesRes.data);
                setSubjects(subjectsRes.data);
                if (settingsRes.data.pagination?.max_page_size) {
                    setMaxPageSize(settingsRes.data.pagination.max_page_size);
                }
            } catch (error) {
               toast.error("Failed to load teacher data. Please refresh the page or contact support.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleShowStudents = async () => {
        if (!selectedClassId) {
            setError("Please select a class first.");
            return;
        }
        if (!selectedSubjectId) {
            setError("Please select a subject.");
            return;
        }
        setError('');

        try {
            setFetchingStudents(true);
            const response = await api.get('/teacher/students/', {
                params: {
                    class_id: selectedClassId,
                    page: 1,
                    page_size: maxPageSize  // Get all students for the class using max page size from config
                }
            });
            setStudents(response.data.items || []);
        } catch (error) {
            toast.error("Failed to load students. Please try again.");
            setStudents([]);
        } finally {
            setFetchingStudents(false);
        }
    };

    // Helper functions for avatar rendering
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getAvatarColor = (id: number) => {
        const colors = [
            'bg-gradient-to-br from-blue-500 to-cyan-500',
            'bg-gradient-to-br from-purple-500 to-pink-500',
            'bg-gradient-to-br from-green-500 to-emerald-500',
            'bg-gradient-to-br from-orange-500 to-red-500',
            'bg-gradient-to-br from-indigo-500 to-purple-500',
            'bg-gradient-to-br from-pink-500 to-rose-500'
        ];
        return colors[id % colors.length];
    };

    // Column Definitions for DataTable
    const studentColumns = useMemo<ColumnDef<Student>[]>(() => [
        {
            accessorKey: 'name',
            header: 'Student Info',
            cell: ({ row }) => (
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${getAvatarColor(row.original.id)} flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-110 transition-transform`}>
                        {getInitials(row.original.name)}
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 text-lg">{row.original.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            ID: {row.original.id}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => navigate(`/teacher/grading/${row.original.id}`)}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 transform hover:scale-105"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Grade Assignments
                    </button>
                </div>
            ),
        },
    ], [navigate]);

    return (
        <div className="space-y-8">
            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-700 font-medium">{error}</p>
                        <button 
                            onClick={() => setError('')}
                            className="ml-auto text-red-500 hover:text-red-700"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            
            {/* Enhanced Header */}
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Grading Dashboard</h1>
                <p className="text-slate-600 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Select a class and subject to view students and manage grades
                </p>
            </div>

            {/* Enhanced Class Selection */}
            <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Step 1: Select Class</h2>
                </div>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                        <span className="text-slate-500 font-medium">Loading classes...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {classes.map((cls) => (
                            <div
                                key={cls.id}
                                onClick={() => {
                                    setSelectedClassId(cls.id);
                                    setStudents([]); // Clear previous students
                                    setSelectedSubjectId(''); // Reset subject
                                }}
                                className={`group cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 relative overflow-hidden ${selectedClassId === cls.id
                                        ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 ring-4 ring-indigo-200 shadow-lg transform scale-105'
                                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md hover:scale-102'
                                    }`}
                            >
                                {selectedClassId === cls.id && (
                                    <div className="absolute top-2 right-2">
                                        <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                                <div className="text-xl font-bold text-slate-800 mb-1">{cls.name}</div>
                                <div className="text-sm font-semibold text-indigo-600">Section {cls.section}</div>
                                {cls.grade && <div className="text-xs text-slate-500 mt-2 bg-slate-100 px-2 py-1 rounded-full inline-block">{cls.grade.name}</div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Enhanced Subject Selection */}
            {selectedClassId && (
                <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-slate-200 animate-fade-in-up">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Step 2: Select Subject</h2>
                    </div>
                    <div className="flex gap-4">
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSelectedSubjectId(value === '' ? '' : Number(value));
                            }}
                            className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                        >
                            <option value="">Choose Subject...</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleShowStudents}
                            disabled={!selectedSubjectId || fetchingStudents}
                            className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all duration-200 flex items-center gap-2 ${!selectedSubjectId
                                    ? 'bg-slate-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl transform hover:scale-105'
                                }`}
                        >
                            {fetchingStudents ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    Show Students
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Enhanced Students List */}
            {students.length > 0 && (
                <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden animate-fade-in-up">
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b-2 border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Step 3: Student List</h2>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="font-bold text-indigo-600">{students.length}</span>
                            <span className="text-slate-600 font-medium">Students</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <DataTable
                            data={students}
                            columns={studentColumns}
                            isLoading={fetchingStudents}
                            emptyMessage="No students found. Please select a class and subject."
                        />
                    </div>
                </div>
            )}

            {/* Enhanced Empty State */}
            {!fetchingStudents && students.length === 0 && selectedClassId && selectedSubjectId && (
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-300 py-16 animate-fade-in-up">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4">
                            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Students Found</h3>
                        <p className="text-slate-500">There are no students enrolled in this class yet.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherGrading;
