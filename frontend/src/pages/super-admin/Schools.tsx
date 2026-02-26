import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

interface SchoolAdmin {
    id?: number;
    username: string; // Changed from name to username for API
    email?: string;
    name?: string; // Optional for UI display if needed
    status: 'Active' | 'Inactive';
    password?: string; // For creation
}

interface School {
    id: number;
    name: string;
    address?: string;
    admins?: SchoolAdmin[]; // Frontend only property for now, API doesn't return admins in school object yet
    students?: number;
    teachers?: number;
    active: boolean; // Changed from status string to boolean
    // joinedDate: string; // Not in API
}

const Schools: React.FC = () => {
    // State
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal Form State
    const [newSchoolName, setNewSchoolName] = useState('');
    const [newSchoolAddress, setNewSchoolAddress] = useState('');
    const [newSchoolAdmins, setNewSchoolAdmins] = useState<SchoolAdmin[]>([]);

    // Temp Admin State for Modal
    const [tempAdminUsername, setTempAdminUsername] = useState('');
    const [tempAdminPassword, setTempAdminPassword] = useState('');

    const [editMode, setEditMode] = useState(false);
    const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
    const editPopulationRef = useRef<{ curriculum: number; type: number } | null>(null);

    // Master Data State
    const [countries, setCountries] = useState<{ id: number, name: string }[]>([]);
    const [curriculums, setCurriculums] = useState<{ id: number, name: string }[]>([]);
    const [schoolTypes, setSchoolTypes] = useState<{ id: number, name: string }[]>([]);

    // Form Selection State
    const [selectedCountryId, setSelectedCountryId] = useState<number | ''>('');
    const [selectedCurriculumId, setSelectedCurriculumId] = useState<number | ''>('');
    const [selectedSchoolTypeId, setSelectedSchoolTypeId] = useState<number | ''>('');

    // Pagination Config
    const ITEMS_PER_PAGE = 8;

    // Fetch Schools
    const fetchSchools = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/super-admin/schools/');
            const data = response.data.map((s: any) => ({
                ...s,
                students: s.student_count || 0,
                teachers: s.teacher_count || 0,
                admins: [],  // Placeholder
                status: s.active ? 'Active' : 'Inactive'
            }));
            setSchools(data);
        } catch (error) {
            console.error("Failed to fetch schools", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCountries = async () => {
        try {
            const res = await api.get('/api/super-admin/master/countries');
            setCountries(res.data);
        } catch (error) {
            console.error("Failed to fetch countries", error);
        }
    };

    useEffect(() => {
        fetchSchools();
        fetchCountries();
    }, []);

    // Cascading Logic
    useEffect(() => {
        if (selectedCountryId) {
            // Fetch Curriculums and School Types for selected country
            const fetchData = async () => {
                try {
                    const [currRes, typeRes] = await Promise.all([
                        api.get(`/api/super-admin/master/curriculums?country_id=${selectedCountryId}`),
                        api.get(`/api/super-admin/master/school-types?country_id=${selectedCountryId}`)
                    ]);
                    setCurriculums(currRes.data);
                    setSchoolTypes(typeRes.data);

                    // Check if we have pending edit values to populate
                    if (editPopulationRef.current) {
                        setSelectedCurriculumId(editPopulationRef.current.curriculum);
                        setSelectedSchoolTypeId(editPopulationRef.current.type);
                        editPopulationRef.current = null; // Clear after populating
                    }
                } catch (error) {
                    console.error("Failed to fetch cascading data", error);
                }
            };
            fetchData();
        } else {
            setCurriculums([]);
            setSchoolTypes([]);
        }

        // Reset dependent selections when country changes, UNLESS we are populating from edit
        // However, since fetchData is async, we can clear here synchronously.
        // If it's an edit population, the async callback above will restore the correct values.
        // If it's a manual change (editPopulationRef.current is null), this clear is correct.
        if (!editPopulationRef.current) {
            setSelectedCurriculumId('');
            setSelectedSchoolTypeId('');
        }
    }, [selectedCountryId]);

    // Filter Logic
    const filteredSchools = useMemo(() => {
        return schools.filter(school =>
            school.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [schools, searchTerm]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredSchools.length / ITEMS_PER_PAGE);
    const paginatedSchools = filteredSchools.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Handlers
    const toggleSchoolStatus = (id: number) => {
        // Implement API call to toggle status if endpoint exists
        console.log("Toggle status not implemented in backend yet", id);
    };

    // Modal Handlers
    const handleAddAdminToGrid = () => {
        if (!tempAdminUsername || !tempAdminPassword) return;
        const newAdmin: SchoolAdmin = {
            id: Date.now(), // Temp ID
            username: tempAdminUsername,
            password: tempAdminPassword, // Store password to send to API
            status: 'Active'
        };
        setNewSchoolAdmins([...newSchoolAdmins, newAdmin]);
        setTempAdminUsername('');
        setTempAdminPassword('');
    };

    const toggleNewAdminStatus = (adminId: number) => {
        // Just local state
        setNewSchoolAdmins(newSchoolAdmins.map(admin =>
            admin.id === adminId
                ? { ...admin, status: admin.status === 'Active' ? 'Inactive' : 'Active' }
                : admin
        ));
    };

    const handleSaveSchool = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editMode && selectedSchoolId) {
                // Update School
                await api.put(`/api/super-admin/schools/${selectedSchoolId}`, {
                    name: newSchoolName,
                    address: newSchoolAddress,
                    max_teachers: 100,
                    max_students: 1000,
                    max_classes: 50,
                    country_id: Number(selectedCountryId),
                    curriculum_id: Number(selectedCurriculumId),
                    school_type_id: Number(selectedSchoolTypeId)
                });
                toast.success("School updated successfully!");
            } else {
                // 1. Create School
                const schoolRes = await api.post('/api/super-admin/schools/', {
                    name: newSchoolName,
                    address: newSchoolAddress,
                    max_teachers: 100, // Defaults
                    max_students: 1000,
                    max_classes: 50,
                    country_id: Number(selectedCountryId),
                    curriculum_id: Number(selectedCurriculumId),
                    school_type_id: Number(selectedSchoolTypeId)
                });
                const createdSchool = schoolRes.data;

                // 2. Create Admins
                for (const admin of newSchoolAdmins) {
                    try {
                        await api.post(`/api/super-admin/schools/${createdSchool.id}/admin`, {
                            username: admin.username,
                            password: admin.password,
                            role: "SCHOOL_ADMIN"
                        });
                    } catch (err) {
                        console.error(`Failed to create admin ${admin.username}`, err);
                        toast.error(`School created, but failed to create admin ${admin.username}. Username might be taken.`);
                    }
                }
                toast.success("School created successfully!");
            }

            // Refresh list
            fetchSchools();
            closeModal();
        } catch (error) {
            console.error("Failed to save school", error);
            toast.error("Failed to save school. Name might be duplicate.");
        }
    };

    const handleEditClick = (school: any) => {
        setEditMode(true);
        setSelectedSchoolId(school.id);
        setNewSchoolName(school.name);
        setNewSchoolAddress(school.address || '');

        // Handle cascading population
        if (school.country_id !== selectedCountryId) {
            // Country changing: effect will run. Set pending values in ref.
            editPopulationRef.current = { curriculum: school.curriculum_id, type: school.school_type_id };
            setSelectedCountryId(school.country_id);
        } else {
            // Country not changing: effect won't run. Set values directly.
            // Also populate options if list is empty? (Should satisfy if country was already selected)
            // Just set IDs.
            editPopulationRef.current = null;
            setSelectedCurriculumId(school.curriculum_id);
            setSelectedSchoolTypeId(school.school_type_id);
        }

        // Admins are not fetched in grid, so we can't edit them here easily without fetching details.
        // For now, allow editing school details only.
        setNewSchoolAdmins([]);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewSchoolName('');
        setNewSchoolAddress('');
        setNewSchoolAdmins([]);
        setTempAdminUsername('');
        setTempAdminPassword('');
        setSearchTerm('');
        setCurrentPage(1);
        setEditMode(false);
        setSelectedSchoolId(null);
        setSelectedCountryId('');
        setSelectedCurriculumId('');
        setSelectedSchoolTypeId('');
    };

    return (
        <div className="space-y-6">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Schools Management</h1>
                        <p className="text-indigo-100 text-md">Manage all registered schools, addresses, and administrators</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-xl shadow-md font-bold transition-all duration-200 flex items-center gap-2 hover:scale-105"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add New School
                    </button>
                </div>
            </div>

            {/* Search & Filter Controls */}
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
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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

            {/* Enhanced Table */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-3 border-b-2 border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">All Schools</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b-2 border-slate-200">
                                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-600 tracking-wider">School Name</th>
                                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-600 tracking-wider hidden md:table-cell">Address</th>
                                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-600 tracking-wider text-center">Statistics</th>
                                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-600 tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-600 tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="text-center py-12 text-slate-400"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div></td></tr>
                            ) : paginatedSchools.map((school) => (
                                <tr key={school.id} className="hover:bg-indigo-50 transition-colors duration-150">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                                                {school.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-900">{school.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 hidden md:table-cell text-slate-600 text-sm max-w-xs" title={school.address}>
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="truncate">{school.address || "No address"}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1 items-center">
                                            <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                                <span className="font-bold text-blue-700 text-xs">{school.students}</span>
                                                <span className="text-blue-600 text-xs">Students</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100">
                                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span className="font-bold text-purple-700 text-xs">{school.teachers}</span>
                                                <span className="text-purple-600 text-xs">Teachers</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${school.active
                                            ? 'bg-green-100 text-green-700 border border-green-200'
                                            : 'bg-red-100 text-red-700 border border-red-200'
                                            }`}>
                                            <span className={`w-2 h-2 rounded-full ${school.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            {school.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEditClick(school)}
                                                className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-lg transition-all text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => toggleSchoolStatus(school.id)}
                                                className={`inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-lg transition-all border ${school.active
                                                    ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'
                                                    : 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200'
                                                    }`}
                                            >
                                                {school.active ? '✕' : '✓'}
                                                {school.active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {!loading && paginatedSchools.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-500 font-medium text-lg">No schools found</p>
                                            <p className="text-slate-400 text-sm mt-1">Try adjusting your search criteria</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Enhanced Pagination */}
                {totalPages > 1 && (
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-5 border-t-2 border-slate-200 flex items-center justify-between">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

            {/* Enhanced Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl p-8 my-8 border-2 border-slate-200 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-3">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">{editMode ? 'Edit School' : 'Add New School'}</h2>
                            </div>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-2 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSaveSchool} className="space-y-6">
                            {/* School Details Section */}
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
                                            {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                                            {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                                            {schoolTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* School Admins Section - Only for Creation */}
                            {!editMode && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">School Admin (Initial User)</h3>

                                    {/* Add Admin Form */}
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

                                    {/* Admins Grid */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-100 text-slate-600 font-semibold">
                                                <tr>
                                                    <th className="px-4 py-2">Username</th>
                                                    <th className="px-4 py-2">Status</th>
                                                    <th className="px-4 py-2 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {newSchoolAdmins.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                                                            No admins added yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    newSchoolAdmins.map((admin) => (
                                                        <tr key={admin.id}>
                                                            <td className="px-4 py-2">{admin.username}</td>
                                                            <td className="px-4 py-2">
                                                                <span className={`px-2 py-0.5 rounded-full text-xs ${admin.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {admin.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleNewAdminStatus(admin.id!)}
                                                                    className={`text-xs font-medium hover:underline ${admin.status === 'Active' ? 'text-red-600' : 'text-green-600'}`}
                                                                >
                                                                    {admin.status === 'Active' ? 'Deactivate' : 'Activate'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">{editMode ? 'Save Changes' : 'Create School'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schools;
