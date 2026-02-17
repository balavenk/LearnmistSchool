import React, { useState, useEffect, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';

interface Subject {
    id: number;
    name: string;
    code: string;
    status: 'Active' | 'Inactive';
}

// Removed mock data

const SubjectsList: React.FC = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');

    const ITEMS_PER_PAGE = 8;

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const response = await api.get('/school-admin/subjects/');
            // Backend returns {id, name, code, school_id}.
            // Map to frontend interface
            const data = response.data.map((s: any) => ({
                id: s.id,
                name: s.name,
                code: s.code || 'N/A',
                status: 'Active'     // Default for now as backend doesn't have status for Subject
            }));
            setSubjects(data);
        } catch (error) {
            console.error("Failed to fetch subjects", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
    }, []);

    const filtered = useMemo(() => {
        return subjects.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [subjects, searchTerm]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // DataTable Columns
    const columns = useMemo<ColumnDef<Subject>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Subject Name',
                cell: ({ row }) => (
                    <span className="font-medium text-slate-900">{row.original.name}</span>
                ),
            },
            {
                accessorKey: 'code',
                header: 'Code',
                cell: ({ row }) => (
                    <span className="text-slate-500">{row.original.code}</span>
                ),
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.original.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                        {row.original.status}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex justify-end gap-3 items-center">
                        <button
                            onClick={() => toggleStatus(row.original.id)}
                            className={`text-xs font-medium ${
                                row.original.status === 'Active' ? 'text-red-600' : 'text-green-600'
                            }`}
                        >
                            {row.original.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                            onClick={() => handleDelete(row.original.id)}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                            Delete
                        </button>
                    </div>
                ),
            },
        ],
        []
    );

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/school-admin/subjects/', {
                name: newName,
                code: newCode
            });
            // If success, refresh list
            fetchSubjects();
            setIsModalOpen(false);
            setNewName(''); setNewCode('');
        } catch (error) {
            console.error("Failed to create subject", error);
            toast.error("Failed to create subject. Might be duplicate.");
        }
    };

    const handleDelete = async (id: number) => {
        // Non-blocking - removed confirm() to prevent navigation blocking
        try {
            await api.delete(`/school-admin/subjects/${id}`);
            toast.success('Subject deleted successfully');
            fetchSubjects();
        } catch (error: any) {
            console.error("Delete failed", error);
            toast.error(error.response?.data?.detail || "Failed to delete subject");
        }
    };

    const toggleStatus = (id: number) => {
        setSubjects(subjects.map(s => s.id === id ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' } : s));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Subjects</h1>
                    <p className="text-slate-500 text-sm">Manage curriculum subjects.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    + Add Subject
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <input
                    type="text"
                    placeholder="Search subjects..."
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
                emptyMessage="No subjects found."
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Add Subject</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Subject Name (e.g. Math)" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Code (e.g. MATH101)" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg">Add</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectsList;
