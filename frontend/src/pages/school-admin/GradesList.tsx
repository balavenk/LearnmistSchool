import React, { useState, useEffect, useMemo } from 'react';
import { Search, PlusCircle, Users, BookOpen, XCircle, Info } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { isValidInput } from '../../utils/inputValidation';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import axios from 'axios';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';

interface Grade {
    id: number;
    name: string;
    student_count?: number; // Backend might not return this yet, but keeping interface
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

    // Add Grade Modal
    const [isAddGradeModalOpen, setIsAddGradeModalOpen] = useState(false);
    const [newGradeName, setNewGradeName] = useState('');

    // Manage Sections Modal
    const [isSectionsModalOpen, setIsSectionsModalOpen] = useState(false);
    const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
    const [sections, setSections] = useState<ClassSection[]>([]);
    const [newSectionName, setNewSectionName] = useState(''); // e.g. "A"

    const ITEMS_PER_PAGE = 25;
    const navigate = useNavigate();

    useEffect(() => {
        const abortController = new AbortController();
        let isMounted = true;

        const fetchGrades = async () => {
            try {
                setLoading(true);
                const res = await api.get('/school-admin/grades/', { signal: abortController.signal });
                if (isMounted) {
                    setGrades(res.data);
                }
            } catch (error: any) {
                if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
                if (isMounted) {
                    console.error("Failed to fetch grades", error);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchGrades();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, []);

    // Refetch function for use after mutations
    const refetchGrades = async () => {
        try {
            const res = await api.get('/school-admin/grades/');
            setGrades(res.data);
        } catch (error: any) {
            if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
            console.error("Failed to refetch grades", error);
        }
    };

    const fetchSections = async (gradeId: number) => {
        try {
            const res = await api.get(`/school-admin/classes/?grade_id=${gradeId}`);
            setSections(res.data);
        } catch (error) {
            console.error("Failed to fetch sections", error);
        }
    };

    const handleCreateGrade = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/school-admin/grades/', { name: newGradeName });
            refetchGrades();
            setIsAddGradeModalOpen(false);
            setNewGradeName('');
        } catch (error) {
            console.error("Failed to create grade", error);
            toast.error("Failed to create grade");
        }
    };

    const openSectionsModal = (grade: Grade) => {
        setSelectedGrade(grade);
        fetchSections(grade.id);
        setIsSectionsModalOpen(true);
        setNewSectionName('');
    };

    const handleAddSection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGrade) return;
        try {
            // Using existing create_class endpoint. Name is required. 
            // Usually Class Name = "10-A" or similar. 
            // We'll construct a name or ask for it? Request says "Add or remove sections".
            // Let's assume Class Name = "{GradeName}-{Section}"
            const section = newSectionName.trim();
            const className = `${selectedGrade.name}-${section}`;

            await api.post('/school-admin/classes/', {
                name: className,
                section: section,
                grade_id: selectedGrade.id
            });
            fetchSections(selectedGrade.id);
            setNewSectionName('');
        } catch (error) {
            console.error("Failed to add section", error);
            toast.error("Failed to add section");
        }
    };

    const handleDeleteSection = async (classId: number) => {
        // Non-blocking - removed confirm() to prevent navigation blocking
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

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    
    const paginated = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filtered.slice(start, end);
    }, [filtered, currentPage]);

    // DataTable Columns
    const columns = useMemo<ColumnDef<Grade>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Grade Name',
                cell: ({ row }) => (
                    <span className="font-medium text-slate-900">{row.original.name}</span>
                ),
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => openSectionsModal(row.original)}
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-xs px-3 py-1 border border-indigo-200 rounded-full hover:bg-indigo-50"
                        >
                            Manage Sections
                        </button>
                        <button
                            onClick={() => window.location.href = `/school-admin/grades/${row.original.id}/subjects`}
                            className="text-emerald-600 hover:text-emerald-800 font-medium text-xs px-3 py-1 border border-emerald-200 rounded-full hover:bg-emerald-50"
                        >
                            Subjects
                        </button>
                    </div>
                ),
            },
        ],
        []
    );

    // Skeleton loader
    const SkeletonRow = () => (
        <tr>
            <td className="px-6 py-4">
                <div className="animate-pulse h-6 w-32 bg-slate-200 rounded" />
            </td>
            <td className="px-6 py-4 text-right">
                <div className="animate-pulse h-6 w-24 bg-slate-200 rounded" />
            </td>
        </tr>
    );

    // Empty state illustration
    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-slate-300 mb-2" />
            <div className="text-slate-400 text-lg font-semibold mb-1">No grades found.</div>
            <div className="text-slate-400 text-sm">Try adding a new grade or adjusting your search.</div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <BookOpen className="w-8 h-8 text-indigo-600" />
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Grades Management</h1>
                    <p className="text-slate-500 text-sm">Manage grade levels, sections, and subjects for your school.</p>
                </div>
            </div>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Grades</h1>
                    <p className="text-slate-500 text-sm">Manage grade levels and sections.</p>
                </div>
                <button onClick={() => setIsAddGradeModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    + Add Grade
                </button>
            </div>

            {/* Search & Add Grade */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search grades by name..."
                        className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                    {searchTerm && (
                        <button
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                            onClick={() => setSearchTerm('')}
                            title="Clear search"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setIsAddGradeModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 shadow"
                    title="Add new grade"
                >
                    <PlusCircle className="w-5 h-5" />
                    Add Grade
                </button>
            </div>

            {/* DataTable */}
            <DataTable
                columns={columns}
                data={paginated}
                isLoading={loading}
                emptyMessage="No grades found."
            />

            {/* Pagination */}
            {!loading && filtered.length > 0 && totalPages > 1 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filtered.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            )}

            {/* Add Grade Modal */}
            {isAddGradeModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200 relative">
                        <button
                            onClick={() => setIsAddGradeModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                            title="Close"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <PlusCircle className="w-5 h-5 text-indigo-600" /> Add Grade
                        </h2>
                        <form onSubmit={handleCreateGrade} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Grade Name</label>
                                <input
                                    value={newGradeName}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (isValidInput(value)) {
                                            setNewGradeName(value);
                                        }
                                    }}
                                    placeholder="e.g. Grade 1"
                                    required
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                />
                                {!isValidInput(newGradeName) && newGradeName.length > 0 && (
                                    <div className="text-xs text-red-500 mt-1">Special characters are not allowed.</div>
                                )}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setIsAddGradeModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add Grade</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Sections Modal */}
            {isSectionsModalOpen && selectedGrade && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 relative">
                        <button
                            onClick={() => setIsSectionsModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                            title="Close"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2 mb-4">
                            <Info className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-xl font-bold">Manage Sections: {selectedGrade.name}</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Add Section Form */}
                            <form onSubmit={handleAddSection} className="flex gap-2">
                                <input
                                    value={newSectionName}
                                    onChange={e => {
                                        const value = e.target.value;
                                        if (isValidInput(value)) {
                                            setNewSectionName(value);
                                        }
                                    }}
                                    placeholder="New Section (e.g. A, B)"
                                    required
                                    className="flex-1 px-4 py-2 border rounded-lg outline-none focus:border-indigo-500 text-sm"
                                />
                                {!isValidInput(newSectionName) && newSectionName.length > 0 && (
                                    <div className="text-xs text-red-500 mt-1">Special characters are not allowed.</div>
                                )}
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap flex items-center gap-1">
                                    <PlusCircle className="w-4 h-4" /> Add Section
                                </button>
                            </form>

                            {/* Sections List */}
                            <div className="max-h-60 overflow-y-auto border rounded-lg divide-y divide-slate-100">
                                {sections.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-sm flex flex-col items-center">
                                        <Info className="w-6 h-6 mb-2 text-slate-300" />
                                        No sections yet.
                                    </div>
                                ) : (
                                    sections.map(section => (
                                        <div key={section.id} className="flex justify-between items-center p-3 hover:bg-slate-50">
                                            <div>
                                                <div className="font-medium text-slate-800">Section {section.section}</div>
                                                <div className="text-xs text-slate-500">Class: {section.name}</div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteSection(section.id)}
                                                className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 flex items-center gap-1"
                                                title="Delete section"
                                            >
                                                <XCircle className="w-4 h-4" /> Delete
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GradesList;
