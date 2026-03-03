import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, PlusCircle, Users, BookOpen, XCircle, Info } from 'lucide-react';
import axios from 'axios';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { isValidInput } from '../../utils/inputValidation';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';

interface Grade {
    id: number;
    name: string;
    student_count?: number;
}

interface ClassSection {
    id: number;
    name: string;
    section: string;
    grade_id: number;
}

const GradesList: React.FC = () => {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;
    const navigate = useNavigate();

    // Add Grade Modal
    const [isAddGradeModalOpen, setIsAddGradeModalOpen] = useState(false);
    const [newGradeName, setNewGradeName] = useState('');

    // Manage Sections Modal
    const [isSectionsModalOpen, setIsSectionsModalOpen] = useState(false);
    const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
    const [sections, setSections] = useState<ClassSection[]>([]);
    const [newSectionName, setNewSectionName] = useState('');

    const fetchGrades = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const res = await api.get('/school-admin/grades/', { signal });
            setGrades(res.data);
        } catch (error: any) {
            if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
            console.error("Failed to fetch grades", error);
            toast.error("Failed to load grades");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const abortController = new AbortController();
        fetchGrades(abortController.signal);
        return () => abortController.abort();
    }, [fetchGrades]);

    const fetchSections = useCallback(async (gradeId: number) => {
        try {
            const res = await api.get(`/school-admin/classes/?grade_id=${gradeId}`);
            setSections(res.data);
        } catch (error) {
            console.error("Failed to fetch sections", error);
            toast.error("Failed to load sections");
        }
    }, []);

    const handleCreateGrade = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/school-admin/grades/', { name: newGradeName });
            fetchGrades();
            setIsAddGradeModalOpen(false);
            setNewGradeName('');
            toast.success("Grade created successfully");
        } catch (error) {
            console.error("Failed to create grade", error);
            toast.error("Failed to create grade");
        }
    };

    const openSectionsModal = useCallback((grade: Grade) => {
        setSelectedGrade(grade);
        fetchSections(grade.id);
        setIsSectionsModalOpen(true);
        setNewSectionName('');
    }, [fetchSections]);

    const handleAddSection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGrade) return;
        try {
            const section = newSectionName.trim();
            const className = `${selectedGrade.name}-${section}`;

            await api.post('/school-admin/classes/', {
                name: className,
                section: section,
                grade_id: selectedGrade.id
            });
            fetchSections(selectedGrade.id);
            setNewSectionName('');
            toast.success("Section added successfully");
        } catch (error) {
            console.error("Failed to add section", error);
            toast.error("Failed to add section");
        }
    };

    const handleDeleteSection = async (classId: number) => {
        try {
            await api.delete(`/school-admin/classes/${classId}`);
            toast.success('Section deleted successfully');
            if (selectedGrade) fetchSections(selectedGrade.id);
        } catch (error) {
            console.error("Failed to delete section", error);
            toast.error("Failed to delete section. It may have students or assignments assigned.");
        }
    };

    const filtered = useMemo(() => {
        return grades.filter(g =>
            g?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false
        );
    }, [grades, searchTerm]);

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filtered.slice(start, end);
    }, [filtered, currentPage]);

    const columns = useMemo<ColumnDef<Grade>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Grade Name',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{row.original.name}</span>
                        <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold" title="Grade ID">ID: {row.original.id}</span>
                    </div>
                ),
            },
            {
                accessorKey: 'student_count',
                header: 'Students',
                cell: ({ row }) => (
                    <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 w-fit border border-emerald-100">
                        <Users className="w-3.5 h-3.5" />
                        {row.original.student_count ?? '--'}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: () => <div className="text-right">Actions</div>,
                cell: ({ row }) => (
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => openSectionsModal(row.original)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold text-xs px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50 flex items-center gap-1.5 transition-colors shadow-sm"
                            title="Manage sections"
                        >
                            <Info className="w-3.5 h-3.5" />
                            Sections
                        </button>
                        <button
                            onClick={() => navigate(`/school-admin/grades/${row.original.id}/subjects`)}
                            className="text-emerald-600 hover:text-emerald-800 font-bold text-xs px-3 py-1.5 border border-emerald-200 rounded-lg hover:bg-emerald-50 flex items-center gap-1.5 transition-colors shadow-sm"
                            title="View subjects"
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            Subjects
                        </button>
                    </div>
                ),
            },
        ],
        [navigate, openSectionsModal]
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-2xl shadow-lg ring-4 ring-indigo-50">
                        <BookOpen className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Grades Management</h1>
                        <p className="text-slate-500 font-medium text-sm">Organize grade levels, sections, and subjects.</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsAddGradeModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl font-bold transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                    <PlusCircle className="w-5 h-5" />
                    Add Grade
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Quick search grades..."
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium text-slate-700"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                    {searchTerm && (
                        <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-200/50 p-1 rounded-full transition-colors"
                            onClick={() => setSearchTerm('')}
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden min-h-[400px]">
                <DataTable
                    data={paginatedItems}
                    columns={columns}
                    isLoading={loading}
                    emptyMessage={searchTerm ? `No grades matching "${searchTerm}"` : "No grades found. Add your first grade level!"}
                />

                <PaginationControls
                    currentPage={currentPage}
                    totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                    totalItems={filtered.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                    isLoading={loading}
                />
            </div>

            {/* Add Grade Modal */}
            {isAddGradeModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />
                        <button
                            onClick={() => setIsAddGradeModalOpen(false)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <XCircle className="w-7 h-7" />
                        </button>
                        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            Add Grade
                        </h2>
                        <form onSubmit={handleCreateGrade} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Grade Name</label>
                                <input
                                    value={newGradeName}
                                    onChange={(e) => isValidInput(e.target.value) && setNewGradeName(e.target.value)}
                                    placeholder="e.g. Grade 10"
                                    required
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold text-slate-700"
                                />
                                {!isValidInput(newGradeName) && newGradeName.length > 0 && (
                                    <div className="text-[10px] text-rose-500 font-bold mt-2 ml-1 uppercase tracking-tighter">Special characters are not allowed</div>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsAddGradeModalOpen(false)} className="flex-1 px-4 py-4 border-2 border-slate-100 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Sections Modal */}
            {isSectionsModalOpen && selectedGrade && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-600" />
                        <button
                            onClick={() => setIsSectionsModalOpen(false)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <XCircle className="w-7 h-7" />
                        </button>

                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-slate-800 mb-1">Sections</h2>
                            <p className="text-slate-500 font-medium">Managing sections for <span className="text-indigo-600 font-bold">{selectedGrade.name}</span></p>
                        </div>

                        <div className="space-y-8 flex-1 overflow-hidden flex flex-col">
                            {/* Add Section Form */}
                            <form onSubmit={handleAddSection} className="flex gap-3 shrink-0">
                                <div className="flex-1 relative">
                                    <input
                                        value={newSectionName}
                                        onChange={e => isValidInput(e.target.value) && setNewSectionName(e.target.value)}
                                        placeholder="Section (A, B...)"
                                        required
                                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold text-slate-700"
                                    />
                                </div>
                                <button type="submit" className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap">
                                    Add
                                </button>
                            </form>

                            {/* Sections List */}
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {sections.length === 0 ? (
                                    <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                        <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                                        <div className="text-slate-400 font-bold mb-1">No sections yet</div>
                                        <p className="text-xs text-slate-400">Add a new section to get started</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sections.map(section => (
                                            <div key={section.id} className="group flex justify-between items-center p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black">
                                                        {section.section}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{section.name}</div>
                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {section.id}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteSection(section.id)}
                                                    className="bg-rose-50 text-rose-600 p-2 rounded-xl border border-rose-100 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-100 active:scale-90"
                                                    title="Delete section"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default GradesList;
