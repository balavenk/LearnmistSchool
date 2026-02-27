import React, { useState, useEffect, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import toast from 'react-hot-toast';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { DataTable } from '../../components/DataTable';
import api from '../../api/axios';
import axios from 'axios';

// ─── Constants ────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 8;
const DEFAULT_MAX_TEACHERS = 100;
const DEFAULT_MAX_STUDENTS = 1000;
const DEFAULT_MAX_CLASSES = 50;

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface SchoolAdmin {
    id?: number;
    username: string;
    email?: string;
    name?: string;
    status: 'Active' | 'Inactive';
    password?: string;
}

interface School {
    id: number;
    name: string;
    address?: string;
    admins?: SchoolAdmin[];
    students?: number;
    teachers?: number;
    active: boolean;
    country_id?: number;
    curriculum_id?: number;
    school_type_id?: number;
}

interface MasterItem {
    id: number;
    name: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
const Schools: React.FC = () => {
    // ── Core Data State ──────────────────────────────────────────────────────
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);

    // ── Search & Pagination ──────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const deferredSearchTerm = useDeferredValue(searchTerm);

    // ── Modal State ───────────────────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);

    // ── Form State ────────────────────────────────────────────────────────────
    const [newSchoolName, setNewSchoolName] = useState('');
    const [newSchoolAddress, setNewSchoolAddress] = useState('');
    const [newSchoolAdmins, setNewSchoolAdmins] = useState<SchoolAdmin[]>([]);
    const [tempAdminUsername, setTempAdminUsername] = useState('');
    const [tempAdminPassword, setTempAdminPassword] = useState('');

    // ── Master Data ───────────────────────────────────────────────────────────
    const [countries, setCountries] = useState<MasterItem[]>([]);
    const [curriculums, setCurriculums] = useState<MasterItem[]>([]);
    const [schoolTypes, setSchoolTypes] = useState<MasterItem[]>([]);

    // ── Cascading Selection ───────────────────────────────────────────────────
    const [selectedCountryId, setSelectedCountryId] = useState<number | ''>('');
    const [selectedCurriculumId, setSelectedCurriculumId] = useState<number | ''>('');
    const [selectedSchoolTypeId, setSelectedSchoolTypeId] = useState<number | ''>('');

    // Ref to hold pending edit values for cascading selects (avoids effect timing issues)
    const editPopulationRef = useRef<{ curriculum: number; type: number } | null>(null);

    // ── Fetch Schools ─────────────────────────────────────────────────────────
    const fetchSchools = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const response = await api.get('/super-admin/schools/', { signal });
            const data = response.data.map((s: any) => ({
                ...s,
                students: s.student_count || 0,
                teachers: s.teacher_count || 0,
                admins: [],
            }));
            setSchools(data);
        } catch (error: any) {
            if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
            console.error('Failed to fetch schools', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Initial Data Fetch ────────────────────────────────────────────────────
    useEffect(() => {
        const abortController = new AbortController();
        let isMounted = true;

        const fetchInitialData = async () => {
            try {
                await fetchSchools(abortController.signal);
                if (!isMounted) return;
                const res = await api.get('/super-admin/master/countries', {
                    signal: abortController.signal,
                });
                if (isMounted) setCountries(res.data);
            } catch (error: any) {
                if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
                if (isMounted) console.error('Failed to fetch initial data', error);
            }
        };

        fetchInitialData();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, [fetchSchools]);

    // ── Cascading Country → Curriculum / School Type ──────────────────────────
    useEffect(() => {
        if (!selectedCountryId) {
            setCurriculums([]);
            setSchoolTypes([]);
            return;
        }

        const abortController = new AbortController();
        let isMounted = true;

        // Only reset dependent selections when the country changes normally (not during edit population)
        if (!editPopulationRef.current) {
            setSelectedCurriculumId('');
            setSelectedSchoolTypeId('');
        }

        const fetchCascadingData = async () => {
            try {
                const [currRes, typeRes] = await Promise.all([
                    api.get(`/super-admin/master/curriculums?country_id=${selectedCountryId}`, {
                        signal: abortController.signal,
                    }),
                    api.get(`/super-admin/master/school-types?country_id=${selectedCountryId}`, {
                        signal: abortController.signal,
                    }),
                ]);

                if (!isMounted) return;

                setCurriculums(currRes.data);
                setSchoolTypes(typeRes.data);

                // Populate pending edit values after options have loaded
                if (editPopulationRef.current) {
                    setSelectedCurriculumId(editPopulationRef.current.curriculum);
                    setSelectedSchoolTypeId(editPopulationRef.current.type);
                    editPopulationRef.current = null;
                }
            } catch (error: any) {
                if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
                if (isMounted) console.error('Failed to fetch cascading data', error);
            }
        };

        fetchCascadingData();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, [selectedCountryId]);

    // ── Derived / Filtered State ──────────────────────────────────────────────
    const filteredSchools = useMemo(() => {
        if (!deferredSearchTerm.trim()) return schools;
        const search = deferredSearchTerm.toLowerCase();
        return schools.filter((school) => school.name.toLowerCase().includes(search));
    }, [schools, deferredSearchTerm]);

    // Plain derived boolean — no need for useMemo
    const isFilterLoading = searchTerm !== deferredSearchTerm;

    const totalPages = Math.ceil(filteredSchools.length / ITEMS_PER_PAGE);

    const paginatedSchools = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredSchools.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredSchools, currentPage]);

    // ── Modal Helpers ─────────────────────────────────────────────────────────
    const resetForm = useCallback(() => {
        setNewSchoolName('');
        setNewSchoolAddress('');
        setNewSchoolAdmins([]);
        setTempAdminUsername('');
        setTempAdminPassword('');
        setEditMode(false);
        setSelectedSchoolId(null);
        setSelectedCountryId('');
        setSelectedCurriculumId('');
        setSelectedSchoolTypeId('');
        editPopulationRef.current = null;
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        resetForm();
    }, [resetForm]);

    const handleOpenAddModal = useCallback(() => {
        resetForm();
        setIsModalOpen(true);
    }, [resetForm]);

    // ── Admin Grid Handlers (functional updaters — no stale closure) ──────────
    const handleAddAdminToGrid = useCallback(() => {
        if (!tempAdminUsername || !tempAdminPassword) return;
        const newAdmin: SchoolAdmin = {
            id: Date.now(),
            username: tempAdminUsername,
            password: tempAdminPassword,
            status: 'Active',
        };
        setNewSchoolAdmins((prev) => [...prev, newAdmin]);
        setTempAdminUsername('');
        setTempAdminPassword('');
    }, [tempAdminUsername, tempAdminPassword]);

    const toggleNewAdminStatus = useCallback((adminId: number) => {
        setNewSchoolAdmins((prev) =>
            prev.map((admin) =>
                admin.id === adminId
                    ? { ...admin, status: admin.status === 'Active' ? 'Inactive' : 'Active' }
                    : admin
            )
        );
    }, []);

    // ── Save School ───────────────────────────────────────────────────────────
    const handleSaveSchool = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();

            const schoolPayload = {
                name: newSchoolName,
                address: newSchoolAddress,
                max_teachers: DEFAULT_MAX_TEACHERS,
                max_students: DEFAULT_MAX_STUDENTS,
                max_classes: DEFAULT_MAX_CLASSES,
                country_id: Number(selectedCountryId),
                curriculum_id: Number(selectedCurriculumId),
                school_type_id: Number(selectedSchoolTypeId),
            };

            try {
                if (editMode && selectedSchoolId) {
                    await api.put(`/super-admin/schools/${selectedSchoolId}`, schoolPayload);
                    toast.success('School updated successfully!');
                } else {
                    const schoolRes = await api.post('/super-admin/schools/', schoolPayload);
                    const createdSchool = schoolRes.data;

                    // Create all admins concurrently and report partial failures
                    if (newSchoolAdmins.length > 0) {
                        const adminResults = await Promise.allSettled(
                            newSchoolAdmins.map((admin) =>
                                api.post(`/super-admin/schools/${createdSchool.id}/admin`, {
                                    username: admin.username,
                                    password: admin.password,
                                    role: 'SCHOOL_ADMIN',
                                })
                            )
                        );

                        const failed = adminResults.filter((r) => r.status === 'rejected');
                        if (failed.length > 0) {
                            toast(
                                `School created, but ${failed.length} admin(s) failed. Usernames may already be taken.`,
                                { icon: '⚠️', duration: 6000 }
                            );
                        }
                    }

                    toast.success('School created successfully!');
                }

                fetchSchools();
                closeModal();
            } catch (error) {
                console.error('Failed to save school', error);
                toast.error('Failed to save school. Name might be a duplicate.');
            }
        },
        [
            editMode,
            selectedSchoolId,
            newSchoolName,
            newSchoolAddress,
            selectedCountryId,
            selectedCurriculumId,
            selectedSchoolTypeId,
            newSchoolAdmins,
            fetchSchools,
            closeModal,
        ]
    );

    // ── Edit Click ────────────────────────────────────────────────────────────
    const handleEditClick = useCallback(
        (school: School) => {
            resetForm();
            setEditMode(true);
            setSelectedSchoolId(school.id);
            setNewSchoolName(school.name);
            setNewSchoolAddress(school.address || '');

            if (school.country_id !== selectedCountryId) {
                // Country will change → store curriculum/type to set after the cascade effect runs
                editPopulationRef.current = {
                    curriculum: school.curriculum_id ?? 0,
                    type: school.school_type_id ?? 0,
                };
                setSelectedCountryId(school.country_id ?? '');
            } else {
                // Country unchanged → set dependent values directly
                setSelectedCurriculumId(school.curriculum_id ?? '');
                setSelectedSchoolTypeId(school.school_type_id ?? '');
            }

            setIsModalOpen(true);
        },
        [selectedCountryId, resetForm]
    );

    // ── Toggle School Status ──────────────────────────────────────────────────
    // TODO: wire up to backend endpoint when available
    const handleToggleStatus = useCallback(async (school: School) => {
        try {
            await api.patch(`/super-admin/schools/${school.id}`, { active: !school.active });
            fetchSchools();
            toast.success(`School ${school.active ? 'deactivated' : 'activated'} successfully!`);
        } catch {
            toast.error('Failed to update school status.');
        }
    }, [fetchSchools]);

    // ── Search Handler ────────────────────────────────────────────────────────
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    }, []);

    // ── Column Definitions (stable — action cells defined here, NOT in JSX) ───
    const schoolColumns = useMemo<ColumnDef<School>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'School Name',
                cell: ({ row }) => (
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                            {row.original.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900">{row.original.name}</span>
                    </div>
                ),
            },
            {
                accessorKey: 'address',
                header: 'Address',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{row.original.address || 'No address'}</span>
                    </div>
                ),
            },
            {
                id: 'statistics',
                header: 'Statistics',
                cell: ({ row }) => (
                    <div className="flex flex-col gap-1 items-center">
                        <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <span className="font-bold text-blue-700 text-xs">{row.original.students}</span>
                            <span className="text-blue-600 text-xs">Students</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-bold text-purple-700 text-xs">{row.original.teachers}</span>
                            <span className="text-purple-600 text-xs">Teachers</span>
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'active',
                header: 'Status',
                cell: ({ row }) => (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                        row.original.active
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${row.original.active ? 'bg-green-500' : 'bg-red-500'}`} />
                        {row.original.active ? 'Active' : 'Inactive'}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: 'Actions',
                // FIX: action cells defined here inside useMemo — stable references, no re-renders
                cell: ({ row }) => (
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => handleEditClick(row.original)}
                            className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-lg transition-all text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                        </button>
                        <button
                            onClick={() => handleToggleStatus(row.original)}
                            className={`inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-lg transition-all border ${
                                row.original.active
                                    ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'
                                    : 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200'
                            }`}
                        >
                            {row.original.active ? '✕ Deactivate' : '✓ Activate'}
                        </button>
                    </div>
                ),
            },
        ],
        [handleEditClick, handleToggleStatus]
    );

    const adminColumns = useMemo<ColumnDef<SchoolAdmin>[]>(
        () => [
            {
                accessorKey: 'username',
                header: 'Username',
                cell: ({ row }) => <span>{row.original.username}</span>,
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                        row.original.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                        {row.original.status}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: 'Actions',
                // FIX: defined here, not via .map() in JSX
                cell: ({ row }: { row: Row<SchoolAdmin> }) => (
                    <div className="text-right">
                        <button
                            type="button"
                            onClick={() => toggleNewAdminStatus(row.original.id!)}
                            className={`text-xs font-medium hover:underline ${
                                row.original.status === 'Active' ? 'text-red-600' : 'text-green-600'
                            }`}
                        >
                            {row.original.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                    </div>
                ),
            },
        ],
        [toggleNewAdminStatus]
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Schools Management</h1>
                        <p className="text-indigo-100 text-md">
                            Manage all registered schools, addresses, and administrators
                        </p>
                    </div>
                    <button
                        onClick={handleOpenAddModal}
                        className="bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-xl shadow-md font-bold transition-all duration-200 flex items-center gap-2 hover:scale-105"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add New School
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 p-3">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <svg className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search schools by name..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full pl-12 pr-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-xl border-2 border-indigo-100">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-sm font-bold text-indigo-900">{filteredSchools.length}</span>
                        <span className="text-sm text-indigo-600">Schools</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-3 border-b-2 border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">All Schools</h3>
                </div>
                <div className="overflow-x-auto">
                    {/* FIX: pass schoolColumns directly — no .map() here */}
                    <DataTable
                        data={paginatedSchools}
                        columns={schoolColumns}
                        isLoading={loading || isFilterLoading}
                        emptyMessage="No schools found. Try adjusting your search criteria."
                    />
                </div>

                {totalPages > 1 && (
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-5 border-t-2 border-slate-200 flex items-center justify-between">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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

            {/* Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl p-8 my-8 border-2 border-slate-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-3">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">
                                    {editMode ? 'Edit School' : 'Add New School'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-2 transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSaveSchool} className="space-y-6">
                            {/* School Details */}
                            <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="bg-indigo-100 rounded-lg p-2">
                                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">School Details</h3>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">School Name *</label>
                                    <input
                                        type="text"
                                        value={newSchoolName}
                                        onChange={(e) => setNewSchoolName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="e.g. Springfield International High School"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Address *</label>
                                    <textarea
                                        value={newSchoolAddress}
                                        onChange={(e) => setNewSchoolAddress(e.target.value)}
                                        required
                                        rows={3}
                                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all"
                                        placeholder="Enter full address..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Country *</label>
                                        <select
                                            value={selectedCountryId}
                                            onChange={(e) => setSelectedCountryId(Number(e.target.value))}
                                            required
                                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                                        >
                                            <option value="">Select Country...</option>
                                            {countries.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Curriculum *</label>
                                        <select
                                            value={selectedCurriculumId}
                                            onChange={(e) => setSelectedCurriculumId(Number(e.target.value))}
                                            required
                                            disabled={!selectedCountryId}
                                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-100 transition-all bg-white"
                                        >
                                            <option value="">Select Curriculum...</option>
                                            {curriculums.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">School Type *</label>
                                        <select
                                            value={selectedSchoolTypeId}
                                            onChange={(e) => setSelectedSchoolTypeId(Number(e.target.value))}
                                            required
                                            disabled={!selectedCountryId}
                                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-100 transition-all bg-white"
                                        >
                                            <option value="">Select Type...</option>
                                            {schoolTypes.map((t) => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Admin Section — create mode only */}
                            {!editMode && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">
                                        School Admin (Initial User)
                                    </h3>

                                    <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-lg">
                                        <input
                                            type="text"
                                            value={tempAdminUsername}
                                            onChange={(e) => setTempAdminUsername(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-500"
                                            placeholder="Username"
                                        />
                                        <input
                                            type="password"
                                            value={tempAdminPassword}
                                            onChange={(e) => setTempAdminPassword(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-500"
                                            placeholder="Password"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddAdminToGrid}
                                            disabled={!tempAdminUsername || !tempAdminPassword}
                                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        {/* FIX: pass adminColumns directly — no .map() in JSX */}
                                        <DataTable
                                            data={newSchoolAdmins}
                                            columns={adminColumns}
                                            isLoading={false}
                                            emptyMessage="No admins added yet."
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md"
                                >
                                    {editMode ? 'Save Changes' : 'Create School'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schools;
