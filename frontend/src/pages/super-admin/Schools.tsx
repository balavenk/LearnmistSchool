import React, { useState, useMemo } from 'react';

// Mock Data Types
interface SchoolAdmin {
    id: number;
    name: string;
    email: string;
    status: 'Active' | 'Inactive';
}

interface School {
    id: number;
    name: string;
    address: string;
    admins: SchoolAdmin[];
    students: number;
    teachers: number;
    status: 'Active' | 'Inactive';
    joinedDate: string;
}

// Initial Mock Data (20 items for pagination testing)
const INITIAL_SCHOOLS: School[] = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `Learnmist School ${String.fromCharCode(65 + (i % 26))}-${i + 100}`,
    address: `${Math.floor(Math.random() * 999)} Education Ave, Knowledge City, Country ${String.fromCharCode(65 + (i % 5))}`,
    admins: [
        { id: 1, name: `Admin User ${i + 1}`, email: `admin${i + 1}@school.com`, status: 'Active' }
    ],
    students: Math.floor(Math.random() * 1000) + 100,
    teachers: Math.floor(Math.random() * 50) + 10,
    status: Math.random() > 0.1 ? 'Active' : 'Inactive',
    joinedDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString().split('T')[0]
}));

const Schools: React.FC = () => {
    // State
    const [schools, setSchools] = useState<School[]>(INITIAL_SCHOOLS);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal Form State
    const [newSchoolName, setNewSchoolName] = useState('');
    const [newSchoolAddress, setNewSchoolAddress] = useState('');
    const [newSchoolAdmins, setNewSchoolAdmins] = useState<SchoolAdmin[]>([]);

    // Temp Admin State for Modal
    const [tempAdminName, setTempAdminName] = useState('');
    const [tempAdminEmail, setTempAdminEmail] = useState('');

    // Pagination Config
    const ITEMS_PER_PAGE = 8;

    // Filter Logic
    const filteredSchools = useMemo(() => {
        return schools.filter(school =>
            school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            school.admins.some(admin => admin.name.toLowerCase().includes(searchTerm.toLowerCase()))
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
        setSchools(schools.map(school =>
            school.id === id
                ? { ...school, status: school.status === 'Active' ? 'Inactive' : 'Active' }
                : school
        ));
    };

    // Modal Handlers
    const handleAddAdminToGrid = () => {
        if (!tempAdminName || !tempAdminEmail) return;
        const newAdmin: SchoolAdmin = {
            id: Date.now(),
            name: tempAdminName,
            email: tempAdminEmail,
            status: 'Active'
        };
        setNewSchoolAdmins([...newSchoolAdmins, newAdmin]);
        setTempAdminName('');
        setTempAdminEmail('');
    };

    const toggleNewAdminStatus = (adminId: number) => {
        setNewSchoolAdmins(newSchoolAdmins.map(admin =>
            admin.id === adminId
                ? { ...admin, status: admin.status === 'Active' ? 'Inactive' : 'Active' }
                : admin
        ));
    };

    const handleCreateSchool = (e: React.FormEvent) => {
        e.preventDefault();

        const newSchool: School = {
            id: schools.length + 1,
            name: newSchoolName,
            address: newSchoolAddress,
            admins: newSchoolAdmins,
            students: 0,
            teachers: 0,
            status: 'Active',
            joinedDate: new Date().toISOString().split('T')[0]
        };

        setSchools([newSchool, ...schools]);
        closeModal();
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewSchoolName('');
        setNewSchoolAddress('');
        setNewSchoolAdmins([]);
        setTempAdminName('');
        setTempAdminEmail('');
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
                        placeholder="Search schools or admins..."
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
                            <th className="px-6 py-4 hidden lg:table-cell">Admins</th>
                            <th className="px-6 py-4 text-center">Stats</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedSchools.map((school) => (
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
                                    {school.address}
                                </td>
                                <td className="px-6 py-4 hidden lg:table-cell text-slate-600">
                                    <div className="flex flex-col gap-1">
                                        {school.admins.slice(0, 2).map((admin, idx) => (
                                            <span key={idx} className="text-xs bg-slate-100 px-2 py-1 rounded inline-block w-fit">
                                                {admin.name} ({admin.status})
                                            </span>
                                        ))}
                                        {school.admins.length > 2 && <span className="text-xs text-slate-400">+{school.admins.length - 2} more</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="text-xs text-slate-500">
                                        <span className="font-semibold text-slate-700">{school.students}</span> Students<br />
                                        <span className="font-semibold text-slate-700">{school.teachers}</span> Teachers
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${school.status === 'Active'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                        {school.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => toggleSchoolStatus(school.id)}
                                        className={`text-sm font-medium px-3 py-1 rounded transition-colors ${school.status === 'Active'
                                                ? 'text-red-600 hover:bg-red-50'
                                                : 'text-green-600 hover:bg-green-50'
                                            }`}
                                    >
                                        {school.status === 'Active' ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {paginatedSchools.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Address (International)</label>
                                    <textarea
                                        value={newSchoolAddress}
                                        onChange={(e) => setNewSchoolAddress(e.target.value)}
                                        required
                                        rows={3}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        placeholder="Enter full address..."
                                    />
                                </div>
                            </div>

                            {/* School Admins Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">School Administrators</h3>

                                {/* Add Admin Form */}
                                <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-lg">
                                    <input
                                        type="text"
                                        value={tempAdminName}
                                        onChange={(e) => setTempAdminName(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-500"
                                        placeholder="Admin Name"
                                    />
                                    <input
                                        type="email"
                                        value={tempAdminEmail}
                                        onChange={(e) => setTempAdminEmail(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-500"
                                        placeholder="Admin Email"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddAdminToGrid}
                                        disabled={!tempAdminName || !tempAdminEmail}
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
                                                <th className="px-4 py-2">Name</th>
                                                <th className="px-4 py-2">Email</th>
                                                <th className="px-4 py-2">Status</th>
                                                <th className="px-4 py-2 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {newSchoolAdmins.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                                                        No admins added yet. Please add at least one.
                                                    </td>
                                                </tr>
                                            ) : (
                                                newSchoolAdmins.map((admin) => (
                                                    <tr key={admin.id}>
                                                        <td className="px-4 py-2">{admin.name}</td>
                                                        <td className="px-4 py-2 text-slate-500">{admin.email}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs ${admin.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {admin.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleNewAdminStatus(admin.id)}
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
