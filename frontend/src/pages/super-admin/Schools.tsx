import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';

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
            const response = await api.get('/super-admin/schools/');
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
            const res = await api.get('/super-admin/master/countries');
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
                        api.get(`/super-admin/master/curriculums?country_id=${selectedCountryId}`),
                        api.get(`/super-admin/master/school-types?country_id=${selectedCountryId}`)
                    ]);
                    setCurriculums(currRes.data);
                    setSchoolTypes(typeRes.data);
                } catch (error) {
                    console.error("Failed to fetch cascading data", error);
                }
            };
            fetchData();
        } else {
            setCurriculums([]);
            setSchoolTypes([]);
        }
        // Reset dependent selections when country changes
        setSelectedCurriculumId('');
        setSelectedSchoolTypeId('');
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
        console.log("Toggle status not implemented in backend yet");
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

    const handleCreateSchool = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // 1. Create School
            const schoolRes = await api.post('/super-admin/schools/', {
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
                    await api.post(`/super-admin/schools/${createdSchool.id}/admin`, {
                        username: admin.username,
                        password: admin.password,
                        role: "SCHOOL_ADMIN"
                    });
                } catch (err) {
                    console.error(`Failed to create admin ${admin.username}`, err);
                    alert(`School created, but failed to create admin ${admin.username}. Username might be taken.`);
                }
            }

            // Refresh list
            fetchSchools();
            closeModal();
            alert("School created successfully!");
        } catch (error) {
            console.error("Failed to create school", error);
            alert("Failed to create school. Name might be duplicate.");
        }
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
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Schools Management</h1>
                    <p className="text-slate-500 mt-1">Manage all registered schools, addresses, and administrators.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg shadow-sm font-medium transition-colors flex items-center"
                >
                    <span className="mr-2 text-xl leading-none">+</span> Add New School
                </button>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div className="relative w-full max-w-md">
                    <input
                        type="text"
                        placeholder="Search schools..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                </div>
                <div className="text-sm text-slate-500">
                    Showing <span className="font-semibold">{filteredSchools.length}</span> schools
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                            <th className="px-6 py-4">School Name</th>
                            <th className="px-6 py-4 hidden md:table-cell">Address</th>
                            <th className="px-6 py-4 text-center">Stats</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
                        ) : paginatedSchools.map((school) => (
                            <tr key={school.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3 text-sm shrink-0">
                                            {school.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        {school.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 hidden md:table-cell text-slate-600 text-sm max-w-xs truncate" title={school.address}>
                                    {school.address || "N/A"}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="text-xs text-slate-500">
                                        <span className="font-semibold text-slate-700">{school.students}</span> Students<br />
                                        <span className="font-semibold text-slate-700">{school.teachers}</span> Teachers
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${school.active
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {school.active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => toggleSchoolStatus(school.id)}
                                        className={`text-sm font-medium px-3 py-1 rounded transition-colors ${school.active
                                            ? 'text-red-600 hover:bg-red-50'
                                            : 'text-green-600 hover:bg-green-50'
                                            }`}
                                    >
                                        {school.active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {!loading && paginatedSchools.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    No schools found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-slate-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 my-8 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Add New School</h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleCreateSchool} className="space-y-6">
                            {/* School Details Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">School Details</h3>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
                                    <input
                                        type="text"
                                        value={newSchoolName}
                                        onChange={(e) => setNewSchoolName(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. Springfield International High"
                                    />
                                </div>
                                <div>
                                    <textarea
                                        value={newSchoolAddress}
                                        onChange={(e) => setNewSchoolAddress(e.target.value)}
                                        required
                                        rows={3}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        placeholder="Enter full address..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                                        <select
                                            value={selectedCountryId}
                                            onChange={(e) => setSelectedCountryId(Number(e.target.value))}
                                            required
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="">Select Country...</option>
                                            {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Curriculum</label>
                                        <select
                                            value={selectedCurriculumId}
                                            onChange={(e) => setSelectedCurriculumId(Number(e.target.value))}
                                            required
                                            disabled={!selectedCountryId}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100"
                                        >
                                            <option value="">Select Curriculum...</option>
                                            {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">School Type</label>
                                        <select
                                            value={selectedSchoolTypeId}
                                            onChange={(e) => setSelectedSchoolTypeId(Number(e.target.value))}
                                            required
                                            disabled={!selectedCountryId}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100"
                                        >
                                            <option value="">Select Type...</option>
                                            {schoolTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* School Admins Section */}
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

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">Create School</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schools;
