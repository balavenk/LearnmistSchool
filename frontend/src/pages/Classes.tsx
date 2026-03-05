import React, { useState, useMemo, useCallback } from 'react';
import { DataTable } from '../components/DataTable';
import { PaginationControls } from '../components/PaginationControls';
import type { ColumnDef } from '@tanstack/react-table';
import { Search, Plus, X, GraduationCap, Users, User } from 'lucide-react';
import toast from 'react-hot-toast';

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
    const [itemsPerPage, setItemsPerPage] = useState(8);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal Form State
    const [newClassName, setNewClassName] = useState('');
    const [newGrade, setNewGrade] = useState('');
    const [newSection, setNewSection] = useState('');
    const [newTeacher, setNewTeacher] = useState('');

    // Handlers
    const toggleClassStatus = useCallback((id: number) => {
        setClasses(prev => prev.map(cls =>
            cls.id === id
                ? { ...cls, status: cls.status === 'Active' ? 'Inactive' : 'Active' }
                : cls
        ));
        toast.success('Status updated successfully');
    }, []);

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
        toast.success(`Class ${newClassName} created!`);
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

    // Filter Logic
    const filteredClasses = useMemo(() => {
        return classes.filter(cls =>
            cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cls.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cls.grade.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [classes, searchTerm]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
    const paginatedClasses = useMemo(() => {
        return filteredClasses.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [filteredClasses, currentPage, itemsPerPage]);

    // Column Definitions
    const columns = useMemo<ColumnDef<ClassData>[]>(() => [
        {
            header: 'Class Name',
            accessorKey: 'name',
            cell: ({ row }) => {
                const cls = row.original;
                return (
                    <div className="flex items-center">
                        <div className="h-9 w-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3 text-sm shrink-0 shadow-sm border border-indigo-200">
                            {cls.grade.replace('Grade ', '')}{cls.section}
                        </div>
                        <span className="font-semibold text-slate-900">{cls.name}</span>
                    </div>
                );
            }
        },
        {
            header: 'Grade & Section',
            accessorFn: row => `${row.grade} - ${row.section}`,
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 font-medium">{row.original.grade} - Section {row.original.section}</span>
                </div>
            )
        },
        {
            header: 'Teacher',
            accessorKey: 'teacher',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <span className="text-slate-600">{row.original.teacher}</span>
                </div>
            )
        },
        {
            header: 'Students',
            accessorKey: 'studentsCount',
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1.5 text-slate-600 font-semibold bg-slate-50 px-3 py-1 rounded-full w-fit mx-auto border border-slate-100">
                    <Users className="w-3.5 h-3.5" />
                    {row.original.studentsCount}
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: ({ row }) => {
                const isActive = row.original.status === 'Active';
                return (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        {row.original.status}
                    </span>
                );
            }
        },
        {
            header: 'Actions',
            id: 'actions',
            cell: ({ row }) => {
                const isActive = row.original.status === 'Active';
                return (
                    <div className="flex justify-end">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleClassStatus(row.original.id);
                            }}
                            className={`text-sm font-bold px-4 py-1.5 rounded-lg transition-all ${isActive
                                ? 'text-red-600 hover:bg-red-50 hover:shadow-sm'
                                : 'text-green-600 hover:bg-green-50 hover:shadow-sm'
                                }`}
                        >
                            {isActive ? 'Deactivate' : 'Activate'}
                        </button>
                    </div>
                );
            }
        }
    ], [toggleClassStatus]);

    const mobileCardRender = useCallback((cls: ClassData) => (
        <div className="space-y-4">
            <div className="flex justify-between items-start">
                <div className="flex items-center">
                    <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3 text-sm border border-indigo-200 shadow-sm">
                        {cls.grade.replace('Grade ', '')}{cls.section}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">{cls.name}</h3>
                        <p className="text-xs text-slate-500 font-medium">{cls.grade} • Section {cls.section}</p>
                    </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cls.status === 'Active'
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                    }`}>
                    {cls.status}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Teacher</p>
                    <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-500" />
                        <span className="text-sm font-bold text-slate-700">{cls.teacher}</span>
                    </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Students</p>
                    <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-slate-500" />
                        <span className="text-sm font-bold text-slate-700">{cls.studentsCount}</span>
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <button
                    onClick={() => toggleClassStatus(cls.id)}
                    className={`w-full py-2.5 rounded-xl text-sm font-black transition-all border-2 ${cls.status === 'Active'
                        ? 'border-red-100 text-red-600 bg-red-50/50 hover:bg-red-50'
                        : 'border-green-100 text-green-600 bg-green-50/50 hover:bg-green-50'
                        }`}
                >
                    {cls.status === 'Active' ? 'DEACTIVATE CLASS' : 'ACTIVATE CLASS'}
                </button>
            </div>
        </div>
    ), [toggleClassStatus]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Classes Management</h1>
                    <p className="text-slate-500 font-medium flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-indigo-500" />
                        Oversee and organize all academic classes and sections.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6 py-3 rounded-xl shadow-lg shadow-indigo-100 font-bold transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Add New Class
                </button>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full max-w-md group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search classes, grades, or teachers..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
                    />
                </div>
                <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-2 shrink-0">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-bold text-indigo-900">
                        {filteredClasses.length} Total Classes
                    </span>
                </div>
            </div>

            {/* DataTable */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <DataTable
                    data={paginatedClasses}
                    columns={columns}
                    mobileCardRender={mobileCardRender}
                    emptyMessage="No classes found matching your criteria."
                />

                {filteredClasses.length > 0 && (
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredClasses.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={(val) => {
                            setItemsPerPage(val);
                            setCurrentPage(1);
                        }}
                    />
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Modal Header Accent */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>

                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">Create New Class</h2>
                                    <p className="text-sm text-slate-500 font-medium">Set up a new academic division</p>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateClass} className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Class Name</label>
                                    <div className="relative group">
                                        <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                                        <input
                                            type="text"
                                            value={newClassName}
                                            onChange={(e) => setNewClassName(e.target.value)}
                                            required
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-semibold text-slate-700 transition-all"
                                            placeholder="e.g. Science 10-A"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Grade</label>
                                        <input
                                            type="text"
                                            value={newGrade}
                                            onChange={(e) => setNewGrade(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-semibold text-slate-700 transition-all"
                                            placeholder="Grade 10"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Section</label>
                                        <input
                                            type="text"
                                            value={newSection}
                                            onChange={(e) => setNewSection(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-semibold text-slate-700 transition-all"
                                            placeholder="A"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Assigned Teacher</label>
                                    <div className="relative group">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                                        <input
                                            type="text"
                                            value={newTeacher}
                                            onChange={(e) => setNewTeacher(e.target.value)}
                                            required
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-semibold text-slate-700 transition-all"
                                            placeholder="Search teachers..."
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="flex-1 px-4 py-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 font-bold transition-all border border-slate-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-black shadow-lg shadow-indigo-100 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        Create Class
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Classes;
