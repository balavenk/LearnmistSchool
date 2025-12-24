import React, { useState, useMemo } from 'react';

// Mock Data Types
interface ClassData {
    id: number;
    name: string;
    grade: string;
    section: string;
    teacher: string;
    studentsCount: number;
    status: 'Active' | 'Inactive';
}

// Initial Mock Data
const INITIAL_CLASSES: ClassData[] = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `Class ${10 - (i % 10)} - ${String.fromCharCode(65 + (i % 3))}`,
    grade: `Grade ${10 - (i % 10)}`,
    section: String.fromCharCode(65 + (i % 3)),
    teacher: `Teacher ${String.fromCharCode(65 + (i % 26))}${i}`,
    studentsCount: Math.floor(Math.random() * 30) + 15,
    status: Math.random() > 0.1 ? 'Active' : 'Inactive',
}));

const Classes: React.FC = () => {
    // State
    const [classes, setClasses] = useState<ClassData[]>(INITIAL_CLASSES);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal Form State
    const [newClassName, setNewClassName] = useState('');
    const [newGrade, setNewGrade] = useState('');
    const [newSection, setNewSection] = useState('');
    const [newTeacher, setNewTeacher] = useState('');

    // Pagination Config
    const ITEMS_PER_PAGE = 8;

    // Filter Logic
    const filteredClasses = useMemo(() => {
        return classes.filter(cls =>
            cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cls.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cls.grade.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [classes, searchTerm]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredClasses.length / ITEMS_PER_PAGE);
    const paginatedClasses = filteredClasses.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Handlers
    const toggleClassStatus = (id: number) => {
        setClasses(classes.map(cls =>
            cls.id === id
                ? { ...cls, status: cls.status === 'Active' ? 'Inactive' : 'Active' }
                : cls
        ));
    };

    const handleCreateClass = (e: React.FormEvent) => {
        e.preventDefault();
        const newClass: ClassData = {
            id: classes.length + 1,
            name: newClassName,
            grade: newGrade,
            section: newSection,
            teacher: newTeacher,
            studentsCount: 0,
            status: 'Active'
        };
        setClasses([newClass, ...classes]);
        closeModal();
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewClassName('');
        setNewGrade('');
        setNewSection('');
        setNewTeacher('');
        setSearchTerm('');
        setCurrentPage(1);
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
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                            <th className="px-6 py-4">Class Name</th>
                            <th className="px-6 py-4">Grade & Section</th>
                            <th className="px-6 py-4">Teacher</th>
                            <th className="px-6 py-4 text-center">Students</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedClasses.map((cls) => (
                            <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3 text-sm shrink-0">
                                            {cls.grade.replace('Grade ', '')}{cls.section}
                                        </div>
                                        {cls.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {cls.grade} - Section {cls.section}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {cls.teacher}
                                </td>
                                <td className="px-6 py-4 text-center text-slate-600">
                                    {cls.studentsCount}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls.status === 'Active'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {cls.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => toggleClassStatus(cls.id)}
                                        className={`text-sm font-medium px-3 py-1 rounded transition-colors ${cls.status === 'Active'
                                            ? 'text-red-600 hover:bg-red-50'
                                            : 'text-green-600 hover:bg-green-50'
                                            }`}
                                    >
                                        {cls.status === 'Active' ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {paginatedClasses.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No classes found matching your search.
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
                                    placeholder="e.g. Class 10-A"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                                    <input
                                        type="text"
                                        value={newGrade}
                                        onChange={(e) => setNewGrade(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. Grade 10"
                                    />
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
                                <label className="block text-sm font-medium text-slate-700 mb-1">Teacher</label>
                                <input
                                    type="text"
                                    value={newTeacher}
                                    onChange={(e) => setNewTeacher(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Mr. Smith"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">Create Class</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Classes;
