import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls'
import api from '../../api/axios';
import PAGINATION_CONFIG from '../../config/pagination';

/**
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Settings/Grades/Classes fetched ONCE on mount (not on every page/filter change)
 * 2. fetchData memoized with useCallback to prevent recreations
 * 3. Backend filtering (grade_id, class_id) instead of client-side filtering
 * 4. useEffect with proper dependencies to prevent infinite loops
 * 5. settingsLoaded flag prevents race conditions
 * 
 * NOTE: In development, React.StrictMode causes useEffect to run twice.
 * This is intentional for detecting side effects. Production builds run once.
 */

interface Student {
    id: number;
    name: string;
    grade_id: number;
    class_id: number | null;
    assigned_count?: number;
    completed_count?: number;
    graded_count?: number;
    pending_count?: number;
}

interface PaginatedStudents {
    items: Student[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

interface Grade {
    id: number;
    name: string;
}

interface ClassData {
    id: number;
    name: string;
    section: string;
    grade_id: number;
}

const Students: React.FC = () => {
    console.log('🔄 COMPONENT RENDER - Students.tsx rendering');
    const [students, setStudents] = useState<Student[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const isCorporate = localStorage.getItem('schoolType') === 'Corporate';

    const [filters, setFilters] = useState({
        name: '',
        grade_id: '',
        class_id: ''
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState<number>(PAGINATION_CONFIG.STUDENTS_PER_PAGE);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [settingsLoaded, setSettingsLoaded] = useState(false); // ✅ Track settings load

    // ✅ Store unfiltered stats for header display (won't change with filters)
    const [unfilteredTotalCount, setUnfilteredTotalCount] = useState(0);
    const [unfilteredGradeStats, setUnfilteredGradeStats] = useState<{ grade: string, count: number }[]>([]);

    // Form State
    const [newName, setNewName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [selectedGradeId, setSelectedGradeId] = useState<number | ''>('');
    const [selectedClassId, setSelectedClassId] = useState<number | ''>('');

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
        if (!usernameManuallyEdited && newName) {
            setNewUsername(generateUsername(newName));
        }
        if (!newName) {
            setNewUsername('');
            setUsernameManuallyEdited(false);
        }
    }, [newName, usernameManuallyEdited]);

    // Check username uniqueness against already-loaded students
    // Note: Teacher may not have all students loaded, but this helps prevent obvious duplicates in their current view
    const usernameIsTaken = newUsername.length > 0 &&
        students.some(s => (s as any).username?.toLowerCase() === newUsername.toLowerCase());

    // Helpers
    const getGradeName = (id: number) => grades.find(g => g.id === id)?.name || 'Unknown';
    const getClassName = (id: number | null) => {
        if (!id) return 'Unassigned';
        const cls = classes.find(c => c.id === id);
        return cls ? `${cls.name} (${cls.section})` : 'Unknown';
    };

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

    const getGradeColor = (gradeName: string) => {
        const gradeColors: Record<string, string> = {
            'Grade 9': 'bg-blue-100 text-blue-700 border-blue-200',
            'Grade 10': 'bg-purple-100 text-purple-700 border-purple-200',
            'Grade 11': 'bg-green-100 text-green-700 border-green-200',
            'Grade 12': 'bg-orange-100 text-orange-700 border-orange-200'
        };
        return gradeColors[gradeName] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    // Column Definitions for DataTable
    const studentColumns = useMemo<ColumnDef<Student>[]>(() => [
        {
            accessorKey: 'name',
            header: isCorporate ? 'Employee' : 'Student',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${getAvatarColor(row.original.id)} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                        {getInitials(row.original.name)}
                    </div>
                    <div>
                        <div className="font-semibold text-slate-900">{row.original.name}</div>
                        <div className="text-xs text-slate-500">ID: {row.original.id}</div>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'grade_id',
            header: isCorporate ? 'Location' : 'Grade',
            cell: ({ row }) => (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border ${getGradeColor(getGradeName(row.original.grade_id))}`}>
                    {getGradeName(row.original.grade_id)}
                </span>
            ),
        },
        {
            accessorKey: 'class_id',
            header: isCorporate ? 'Department / Section' : 'Class / Section',
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {getClassName(row.original.class_id)}
                </span>
            ),
        },
        {
            accessorKey: 'assigned_count',
            header: () => <div className="text-center">Assigned</div>,
            cell: ({ row }) => <div className="text-center font-bold text-slate-700">{row.original.assigned_count || 0}</div>,
        },
        {
            accessorKey: 'completed_count',
            header: () => <div className="text-center">Completed</div>,
            cell: ({ row }) => <div className="text-center font-bold text-emerald-600">{row.original.completed_count || 0}</div>,
        },
        {
            accessorKey: 'graded_count',
            header: () => <div className="text-center">Graded</div>,
            cell: ({ row }) => <div className="text-center font-bold text-purple-600">{row.original.graded_count || 0}</div>,
        },
        {
            accessorKey: 'pending_count',
            header: () => <div className="text-center">Pending</div>,
            cell: ({ row }) => <div className="text-center font-bold text-amber-600">{row.original.pending_count || 0}</div>,
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => navigate(`/teacher/grading/${row.original.id}`)}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        View Work
                    </button>
                </div>
            ),
        },
    ], [navigate, grades, classes]);

    const mobileCardRender = useCallback((student: Student) => (
        <div key={student.id} className="space-y-4">
            <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-2xl ${getAvatarColor(student.id)} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                    {getInitials(student.name)}
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{student.name}</h3>
                    <div className="text-xs text-slate-500 font-medium">Student ID: {student.id}</div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 font-medium">{isCorporate ? 'Location' : 'Grade'}</span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getGradeColor(getGradeName(student.grade_id))}`}>
                        {getGradeName(student.grade_id)}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 font-medium">{isCorporate ? 'Department' : 'Class'}</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                        {getClassName(student.class_id)}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <div className="text-xl font-black text-slate-700">{student.assigned_count || 0}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Assigned</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                    <div className="text-xl font-black text-emerald-600">{student.completed_count || 0}</div>
                    <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Completed</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
                    <div className="text-xl font-black text-purple-600">{student.graded_count || 0}</div>
                    <div className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">Graded</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                    <div className="text-xl font-black text-amber-600">{student.pending_count || 0}</div>
                    <div className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Pending</div>
                </div>
            </div>

            <button
                onClick={() => navigate(`/teacher/grading/${student.id}`)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View Assignments
            </button>
        </div>
    ), [navigate, grades, classes]);

    // No filtering needed - backend handles it
    const processedStudents = useMemo(() => {
        console.log('🔄 processedStudents useMemo - using backend-filtered data', {
            studentCount: students.length,
            searchQuery
        });
        const startTime = performance.now();
        let result = [...students];

        // Only apply search query (not sent to backend)
        if (searchQuery) {
            result = result.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        const endTime = performance.now();
        console.log(`✅ processedStudents completed in ${(endTime - startTime).toFixed(2)} ms, result count: `, result.length);
        return result;
    }, [students, searchQuery]);


    // Derived state for class dropdown in add student form (filter by selected grade)
    const availableClasses = useMemo(() => {
        if (!selectedGradeId) return [];
        return classes.filter(c => c.grade_id === Number(selectedGradeId));
    }, [selectedGradeId, classes]);

    // Derived state for class filter dropdown (filter by grade filter)
    const filteredClassesForFilter = useMemo(() => {
        console.log('🔄 filteredClassesForFilter useMemo RECALCULATING', {
            grade_filter: filters.grade_id,
            totalClasses: classes.length
        });
        if (!filters.grade_id) return classes;
        const filtered = classes.filter(c => c.grade_id === Number(filters.grade_id));
        console.log('✅ filteredClassesForFilter result:', filtered.length, 'classes');
        return filtered;
    }, [filters.grade_id, classes]);

    // ✅ Clear class filter when grade filter changes to incompatible class
    useEffect(() => {
        console.log("🔍 useEffect: Grade/class filter compatibility check", {
            grade_id: filters.grade_id,
            class_id: filters.class_id
        });
        if (filters.grade_id && filters.class_id && classes.length > 0) {
            const selectedClass = classes.find(c => c.id === Number(filters.class_id));
            if (selectedClass && selectedClass.grade_id !== Number(filters.grade_id)) {
                console.log('⚠️ Clearing incompatible class filter');
                setFilters(prev => ({ ...prev, class_id: '' }));
            }
        }
    }, [filters.grade_id, filters.class_id]); // ✅ Removed 'classes' to prevent unnecessary re-runs

    // ✅ Memoized fetchData with useCallback to prevent recreation on every render
    const fetchData = useCallback(async (page: number = 1, size: number = pageSize) => {
        console.log('🌐 fetchData called for page:', page, 'with filters:', filters);
        try {
            setLoading(true);

            // Build query params with filters
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: size.toString()
            });

            // Add filters to query params
            if (filters.grade_id) {
                params.append('grade_id', filters.grade_id);
            }
            if (filters.class_id) {
                params.append('class_id', filters.class_id);
            }

            console.log('📤 API call with params:', params.toString());

            // Fetch students with filters
            const studentsRes = await api.get<PaginatedStudents>(`/teacher/students/?${params.toString()}`);

            // Update students from paginated response
            console.log('✅ fetchData response:', {
                itemsCount: studentsRes.data.items.length,
                totalPages: studentsRes.data.total_pages,
                currentPage: studentsRes.data.page,
                totalCount: studentsRes.data.total
            });
            setStudents(studentsRes.data.items);
            setTotalPages(studentsRes.data.total_pages);
            setTotalCount(studentsRes.data.total);
            setCurrentPage(studentsRes.data.page);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    }, [filters.grade_id, filters.class_id, pageSize]); // ✅ Only recreate when these change

    // ✅ Fetch settings, grades, classes, and unfiltered stats ONCE on mount
    useEffect(() => {
        console.log('🚀 Component mounted - fetching initial data (settings, grades, classes, stats)');
        const fetchInitialData = async () => {
            try {
                // ✅ Parallel fetch all initial data
                const [settingsRes, gradesRes, classesRes] = await Promise.all([
                    api.get('/teacher/settings'),
                    api.get('/teacher/grades/'),
                    api.get('/teacher/classes/')
                ]);

                console.log('✅ Initial data loaded:', {
                    pageSize: settingsRes.data.pagination?.default_page_size,
                    gradesCount: gradesRes.data.length,
                    classesCount: classesRes.data.length
                });

                // Update state ONCE
                if (settingsRes.data.pagination?.default_page_size) {
                    setPageSize(settingsRes.data.pagination.default_page_size);
                }
                setGrades(gradesRes.data);
                setClasses(classesRes.data);

                // ✅ Fetch unfiltered student stats for header cards
                const statsRes = await api.get<PaginatedStudents>(`/teacher/students/?page=1&page_size=${PAGINATION_CONFIG.DEFAULT_PAGE_SIZE}`); // Get configured number of students for stats
                const allStudents = statsRes.data.items;
                const totalStudentsCount = statsRes.data.total;

                // Calculate grade breakdown from all students
                const gradeStats = gradesRes.data.map((grade: Grade) => ({
                    grade: grade.name,
                    count: allStudents.filter(s => s.grade_id === grade.id).length
                }));

                console.log('✅ Unfiltered stats calculated:', {
                    totalStudents: totalStudentsCount,
                    gradeStats
                });

                setUnfilteredTotalCount(totalStudentsCount);
                setUnfilteredGradeStats(gradeStats);
                setSettingsLoaded(true);
            } catch (error) {
                console.error("Failed to fetch initial data", error);
                setSettingsLoaded(true); // Mark as loaded even on error to prevent blocking
            }
        };
        fetchInitialData();
    }, []); // ✅ Empty array - runs ONCE on mount

    // ✅ Fetch students when page or filters change (only after settings loaded)
    useEffect(() => {
        if (!settingsLoaded) {
            console.log('⏳ Waiting for settings to load before fetching students...');
            return;
        }
        console.log('🔄 useEffect: Fetching students', { currentPage, grade_id: filters.grade_id, class_id: filters.class_id });
        fetchData(currentPage, pageSize);
    }, [currentPage, filters.grade_id, filters.class_id, settingsLoaded, fetchData, pageSize]); // ✅ Proper dependencies

    // Missing handlers
    const closeModal = () => {
        setIsModalOpen(false);
        setNewName('');
        setNewUsername('');
        setNewPassword('');
        setNewEmail('');
        setSelectedGradeId('');
        setSelectedClassId('');
        setUsernameManuallyEdited(false);
    };

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (usernameIsTaken) {
            toast.error("Username is already taken. Please choose a different one.");
            return;
        }
        try {
            await api.post('/teacher/students/', {
                name: newName,
                username: newUsername || null,
                password: newPassword || null,
                email: newEmail || null,
                grade_id: Number(selectedGradeId),
                class_id: selectedClassId ? Number(selectedClassId) : null
            });
            await fetchData(1); // Refresh and go to first page
            closeModal();
            toast.success("Student added successfully");
        } catch (error: any) {
            console.error("Failed to create student", error);
            const detail = error?.response?.data?.detail;
            toast.error(detail || "Failed to create student");
        }
    };

    const clearAllFilters = () => {
        console.log('🧹 clearAllFilters called');
        setFilters({
            name: '',
            grade_id: '',
            class_id: ''
        });
        setSearchQuery('');
        // useEffect will handle page reset if needed
        if (currentPage !== 1) {
            console.log('📄 Resetting page to 1');
            setCurrentPage(1);
        }
    };

    const hasActiveFilters = filters.name || filters.grade_id || filters.class_id;

    return (
        <div className="space-y-6">
            {/* Enhanced Header with Statistics */}
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">{isCorporate ? 'Employee Roster' : 'Student Roster'}</h1>
                        <p className="text-slate-600 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            Manage your {isCorporate ? 'employees' : 'students'} and track their progress
                        </p>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex flex-wrap gap-3">
                        <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-indigo-100">
                            <div className="text-2xl font-bold text-indigo-600">{unfilteredTotalCount}</div>
                            <div className="text-xs text-slate-500 font-medium">{isCorporate ? 'Total Employees' : 'Total Students'}</div>
                        </div>
                        {unfilteredGradeStats.slice(0, 2).map(stat => (
                            <div key={stat.grade} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-purple-100">
                                <div className="text-2xl font-bold text-purple-600">{stat.count}</div>
                                <div className="text-xs text-slate-500 font-medium">{stat.grade}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Search and View Controls */}
                <div className="mt-6 flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search students by name..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (currentPage !== 1) {
                                    setCurrentPage(1);
                                }
                            }}
                            className="w-full pl-12 pr-4 py-3 border-2 border-white bg-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    if (currentPage !== 1) {
                                        setCurrentPage(1);
                                    }
                                }}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* View Toggle */}
                    <div className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-indigo-100">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px - 4 py - 2 rounded - lg font - semibold text - sm transition - all flex items - center gap - 2 ${viewMode === 'table'
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-50'
                                } `}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Table
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`px - 4 py - 2 rounded - lg font - semibold text - sm transition - all flex items - center gap - 2 ${viewMode === 'cards'
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-50'
                                } `}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            Cards
                        </button>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl font-semibold transition-all duration-200 flex items-center gap-2 transform hover:scale-105"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {isCorporate ? 'Add Employee' : 'Add Student'}
                    </button>
                </div>

                {/* Active Filters */}
                {hasActiveFilters && (
                    <div className="mt-4 flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-semibold text-slate-600">Active Filters:</span>
                        {filters.grade_id && (
                            <span className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg text-xs font-medium shadow-sm">
                                {isCorporate ? 'Location' : 'Grade'}: {getGradeName(Number(filters.grade_id))}
                                <button onClick={() => {
                                    console.log('🧹 Clear grade filter clicked');
                                    setFilters(prev => ({ ...prev, grade_id: '' }));
                                    // useEffect will refetch data automatically
                                }} className="hover:text-indigo-900">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </span>
                        )}
                        {filters.class_id && (
                            <span className="inline-flex items-center gap-1 bg-white border border-purple-200 text-purple-700 px-3 py-1 rounded-lg text-xs font-medium shadow-sm">
                                {isCorporate ? 'Department' : 'Class'}: {getClassName(Number(filters.class_id))}
                                <button onClick={() => {
                                    console.log('🧹 Clear class filter clicked');
                                    setFilters(prev => ({ ...prev, class_id: '' }));
                                    // useEffect will refetch data automatically
                                }} className="hover:text-purple-900">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </span>
                        )}
                        <button
                            onClick={clearAllFilters}
                            className="text-xs text-slate-600 hover:text-indigo-600 font-medium underline"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            {isCorporate ? 'Filter by Location' : 'Filter by Grade'}
                        </label>
                        <select
                            value={filters.grade_id}
                            onChange={(e) => {
                                console.log('🎯 GRADE DROPDOWN CLICKED - onChange fired', {
                                    newValue: e.target.value,
                                    previousValue: filters.grade_id,
                                    currentPage
                                });
                                console.time('⏱️ Grade filter update duration');
                                setFilters(prev => ({ ...prev, grade_id: e.target.value }));
                                // Reset page to 1 only if not already on page 1
                                if (currentPage !== 1) {
                                    console.log('📄 Resetting page to 1');
                                    setCurrentPage(1);
                                }
                                console.timeEnd('⏱️ Grade filter update duration');
                            }}
                            className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        >
                            <option value="">All</option>
                            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {isCorporate ? 'Filter by Department' : 'Filter by Class'}
                        </label>
                        <select
                            value={filters.class_id}
                            onChange={(e) => {
                                console.log('🎯 CLASS DROPDOWN CLICKED - onChange fired', {
                                    newValue: e.target.value,
                                    previousValue: filters.class_id,
                                    currentPage
                                });
                                console.time('⏱️ Class filter update duration');
                                setFilters(prev => ({ ...prev, class_id: e.target.value }));
                                // Reset page to 1 only if not already on page 1
                                if (currentPage !== 1) {
                                    console.log('📄 Resetting page to 1');
                                    setCurrentPage(1);
                                }
                                console.timeEnd('⏱️ Class filter update duration');
                            }}
                            className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                        >
                            <option value="">All</option>
                            {filteredClassesForFilter.map(c => <option key={c.id} value={c.id}>{c.name} ({c.section})</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        {hasActiveFilters && (
                            <button
                                onClick={clearAllFilters}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Table or Card View */}
            {viewMode === 'table' ? (
                <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden">
                    <DataTable
                        data={processedStudents}
                        columns={studentColumns}
                        isLoading={loading}
                        emptyMessage={
                            hasActiveFilters
                                ? 'No students found. Try adjusting your filters.'
                                : 'No students found. Add your first student to get started.'
                        }
                        mobileCardRender={mobileCardRender}
                    />

                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={hasActiveFilters ? processedStudents.length : totalCount}
                        itemsPerPage={pageSize}
                        onPageChange={setCurrentPage}
                        isLoading={loading}
                    />
                </div>
            ) : (
                /* Card View */
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                            <span className="text-slate-500 font-medium">Loading students...</span>
                        </div>
                    ) : processedStudents.map((student) => (
                        <div key={student.id} className="group bg-white rounded-2xl shadow-md border-2 border-slate-200 hover:border-indigo-300 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                            <div className="flex items-start gap-4 mb-4">
                                <div className={`w - 16 h - 16 rounded - 2xl ${getAvatarColor(student.id)} flex items - center justify - center text - white font - bold text - xl shadow - lg group - hover: scale - 110 transition - transform`}>
                                    {getInitials(student.name)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{student.name}</h3>
                                    <div className="text-xs text-slate-500 font-medium">Student ID: {student.id}</div>
                                </div>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                        {isCorporate ? 'Location' : 'Grade'}
                                    </span>
                                    <span className={`px - 3 py - 1 rounded - lg text - xs font - bold border ${getGradeColor(getGradeName(student.grade_id))} `}>
                                        {getGradeName(student.grade_id)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        {isCorporate ? 'Department' : 'Class'}
                                    </span>
                                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                                        {getClassName(student.class_id)}
                                    </span>
                                </div>
                            </div>

                            {/* Analytics Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-5">
                                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100 hover:border-slate-300 transition-colors">
                                    <div className="text-xl font-black text-slate-700">{student.assigned_count || 0}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Assigned</div>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100 hover:border-emerald-300 transition-colors">
                                    <div className="text-xl font-black text-emerald-600">{student.completed_count || 0}</div>
                                    <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Completed</div>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100 hover:border-purple-300 transition-colors">
                                    <div className="text-xl font-black text-purple-600">{student.graded_count || 0}</div>
                                    <div className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">Graded</div>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(`/ teacher / grading / ${student.id} `)}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                View Assignments
                            </button>
                        </div>
                    ))}
                    {processedStudents.length === 0 && !loading && (
                        <div className="col-span-full py-16">
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4">
                                    <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">No students found</h3>
                                <p className="text-slate-500 mb-6">
                                    {hasActiveFilters ? 'Try adjusting your filters' : 'Add your first student to get started'}
                                </p>
                                {!hasActiveFilters && (
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl font-semibold transition-all duration-200 inline-flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add First Student
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Enhanced Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-8 my-8 relative overflow-hidden transform animate-slideUp">
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-100 to-cyan-100 rounded-full blur-3xl opacity-50 -ml-20 -mb-20"></div>

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2.5 rounded-xl shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Add New Student</h2>
                            </div>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateStudent} className="space-y-5 relative z-10">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Student Name
                                </label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Enter student's full name"
                                />
                            </div>

                            {/* Username Field */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Username
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={newUsername}
                                        onChange={(e) => {
                                            setUsernameManuallyEdited(true);
                                            setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                                        }}
                                        className={`w-full px-4 py-3 border-2 rounded-xl outline-none font-mono text-sm pr-24 transition-all ${usernameIsTaken
                                                ? 'border-red-400 focus:border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500'
                                                : newUsername
                                                    ? 'border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-500'
                                                    : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500'
                                            }`}
                                        placeholder="auto-generated"
                                    />
                                    {newUsername && (
                                        <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold ${usernameIsTaken ? 'text-red-500' : 'text-green-500'
                                            }`}>
                                            {usernameIsTaken ? '✗ Taken' : '✓ Available'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1.5 ml-1">
                                    Auto-generated from name. Only letters & numbers.
                                </p>
                            </div>

                            {/* Password Field */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Password <span className="text-slate-400 text-xs font-normal">(default: password123)</span>
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Leave blank to use default"
                                    autoComplete="new-password"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Email <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                                </label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="student@example.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                        Grade
                                    </label>
                                    <select
                                        value={selectedGradeId}
                                        onChange={(e) => {
                                            setSelectedGradeId(Number(e.target.value));
                                            setSelectedClassId(''); // Reset class when grade changes
                                        }}
                                        required
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        <option value="">Select Grade</option>
                                        {grades.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        Class
                                    </label>
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(Number(e.target.value))}
                                        disabled={!selectedGradeId}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed transition-all"
                                    >
                                        <option value="">Select Class</option>
                                        {availableClasses.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.section})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-6 border-t-2 border-slate-100 mt-6">
                                <button type="button" onClick={closeModal} className="flex-1 px-6 py-3 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold transition-all flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Student
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Students;
