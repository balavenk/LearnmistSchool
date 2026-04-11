import React, { useState, useEffect, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import axios from 'axios';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';
import { isValidInput } from '../../utils/inputValidation';

interface ExamType {
    id: number;
    name: string;
    created_at: string;
}

const ExamTypesList: React.FC = () => {
    const [examTypes, setExamTypes] = useState<ExamType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');

    const ITEMS_PER_PAGE = 8;

    useEffect(() => {
        const abortController = new AbortController();
        let isMounted = true;

        const fetchExamTypes = async () => {
            try {
                setLoading(true);
                const response = await api.get('/school-admin/exam-types/', { signal: abortController.signal });
                if (isMounted) {
                    setExamTypes(response.data);
                }
            } catch (error: any) {
                if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
                if (isMounted) {
                    console.error("Failed to fetch exam types", error);
                    toast.error("Failed to load exam types");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchExamTypes();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, []);

    const refetchExamTypes = async () => {
        try {
            const response = await api.get('/school-admin/exam-types/');
            setExamTypes(response.data);
        } catch (error: any) {
            console.error("Failed to refetch exam types", error);
        }
    };

    const filtered = useMemo(() => {
        return examTypes.filter(e =>
            e?.name?.toLowerCase()?.includes(searchTerm.toLowerCase())
        );
    }, [examTypes, searchTerm]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

    const paginated = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filtered.slice(start, end);
    }, [filtered, currentPage]);

    const columns = useMemo<ColumnDef<ExamType>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Exam Type Name',
                cell: ({ row }) => (
                    <span className="font-medium text-slate-900">{row.original.name}</span>
                ),
            },
            {
                accessorKey: 'created_at',
                header: 'Created At',
                cell: ({ row }) => (
                    <span className="text-slate-500">
                        {new Date(row.original.created_at).toLocaleDateString()}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex justify-end gap-3 items-center">
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
            await api.post('/school-admin/exam-types/', {
                name: newName
            });
            refetchExamTypes();
            setIsModalOpen(false);
            setNewName('');
            toast.success("Exam type created successfully");
        } catch (error) {
            console.error("Failed to create exam type", error);
            toast.error("Failed to create exam type.");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/school-admin/exam-types/${id}`);
            toast.success('Exam type deleted successfully');
            refetchExamTypes();
        } catch (error: any) {
            console.error("Delete failed", error);
            toast.error(error.response?.data?.detail || "Failed to delete exam type");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100 flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">Exam Types</h1>
                    <p className="text-slate-500 text-sm">Manage school-specific exam types (e.g. Unit Test, Mid Term, Term I).</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    + Add Exam Type
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <input
                    type="text"
                    placeholder="Search exam types..."
                    className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => {
                        const value = e.target.value;
                        if(isValidInput(value) || value === '') {
                            setSearchTerm(value);
                            setCurrentPage(1);
                        }
                    }}
                />
            </div>

            <DataTable
                columns={columns}
                data={paginated}
                isLoading={loading}
                emptyMessage="No exam types found. Add your first exam type to get started."
            />

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
                        <h2 className="text-xl font-bold mb-4">Add Exam Type</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input
                                value={newName}
                                onChange={e => {
                                    if(isValidInput(e.target.value) || e.target.value === '') {
                                        setNewName(e.target.value);
                                    }
                                }}
                                placeholder="Exam Type Name (e.g. Term I)"
                                required
                                className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                            />
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                                <button type="submit" disabled={!newName.trim()} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Add</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamTypesList;
