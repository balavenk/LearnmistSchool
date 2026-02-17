import React, { useState, useEffect, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import api from '../../api/axios';
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

    const ITEMS_PER_PAGE = 8;

    useEffect(() => {
        fetchGrades();
    }, []);

    const fetchGrades = async () => {
        try {
            setLoading(true);
            const res = await api.get('/school-admin/grades/');
            setGrades(res.data);
        } catch (error) {
            console.error("Failed to fetch grades", error);
        } finally {
            setLoading(false);
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
            fetchGrades();
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
            g.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [grades, searchTerm]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Grades</h1>
                    <p className="text-slate-500 text-sm">Manage grade levels and sections.</p>
                </div>
                <button onClick={() => setIsAddGradeModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    + Add Grade
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <input
                    type="text"
                    placeholder="Search grades..."
                    className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
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
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4">Add Grade</h2>
                        <form onSubmit={handleCreateGrade} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Grade Name</label>
                                <input
                                    value={newGradeName}
                                    onChange={e => setNewGradeName(e.target.value)}
                                    placeholder="e.g. Grade 1"
                                    required
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                />
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
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Manage Sections: {selectedGrade.name}</h2>
                            <button onClick={() => setIsSectionsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="space-y-6">
                            {/* Add Section Form */}
                            <form onSubmit={handleAddSection} className="flex gap-2">
                                <input
                                    value={newSectionName}
                                    onChange={e => setNewSectionName(e.target.value)}
                                    placeholder="New Section (e.g. A, B)"
                                    required
                                    className="flex-1 px-4 py-2 border rounded-lg outline-none focus:border-indigo-500 text-sm"
                                />
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap">
                                    + Add Section
                                </button>
                            </form>

                            {/* Sections List */}
                            <div className="max-h-60 overflow-y-auto border rounded-lg divide-y divide-slate-100">
                                {sections.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-sm">No sections yet.</div>
                                ) : (
                                    sections.map(section => (
                                        <div key={section.id} className="flex justify-between items-center p-3 hover:bg-slate-50">
                                            <div>
                                                <div className="font-medium text-slate-800">Section {section.section}</div>
                                                <div className="text-xs text-slate-500">Class: {section.name}</div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteSection(section.id)}
                                                className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded hover:bg-red-50"
                                            >
                                                Delete
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
