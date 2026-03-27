import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';

interface Paper {
    id: number;
    title: string;
    grade: string;
    subject: string;
    board: string;
    exam_type: string;
    total_marks: number;
    sections_config: any[];
    created_by_role: string;
    created_at: string;
    status: string;           // 'draft' | 'complete'
    mapping_count: number;    // number of questions mapped so far
}

const QuestionPaperHistory: React.FC = () => {
    const navigate = useNavigate();
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    const fetchPapers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/teacher/papers');
            setPapers(response.data);
        } catch (error: any) {
            console.error("Failed to fetch question papers", error);
            toast.error("Failed to load question papers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPapers();
    }, []);

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this paper?")) return;
        try {
            await api.delete(`/teacher/papers/${id}`);
            toast.success("Paper deleted successfully");
            fetchPapers();
        } catch (error: any) {
            console.error("Failed to delete paper", error);
            toast.error("Failed to delete paper");
        }
    };

    const handleDownload = async (id: number, title: string) => {
        try {
            toast.loading("Generating PDF...", { id: 'pdf_download' });
            const response = await api.post(`/teacher/papers/${id}/export`, {}, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${title || 'Question_Paper'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            toast.success("PDF Downloaded!", { id: 'pdf_download' });
            // Refresh so status updates to complete
            fetchPapers();
        } catch (error: any) {
            console.error("Failed to generate PDF", error);
            toast.error("Failed to generate PDF", { id: 'pdf_download' });
        }
    };

    const totalPages = Math.ceil(papers.length / ITEMS_PER_PAGE);

    const paginatedPapers = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return papers.slice(start, end);
    }, [papers, currentPage]);

    const columns = useMemo<ColumnDef<Paper>[]>(
        () => [
            {
                accessorKey: 'title',
                header: 'Title',
                cell: ({ row }) => (
                    <span className="font-semibold text-slate-900">{row.original.title}</span>
                )
            },
            {
                accessorKey: 'grade',
                header: 'Grade / Subject',
                cell: ({ row }) => (
                    <div>
                        <div className="font-medium text-slate-800">{row.original.grade}</div>
                        <div className="text-xs text-slate-500">{row.original.subject}</div>
                    </div>
                )
            },
            {
                accessorKey: 'exam_type',
                header: 'Exam Type',
                cell: ({ row }) => (
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-lg font-medium">
                        {row.original.exam_type || 'General'}
                    </span>
                )
            },
            {
                accessorKey: 'total_marks',
                header: 'Marks',
                cell: ({ row }) => (
                    <span className="font-medium text-slate-700">{row.original.total_marks}</span>
                )
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const isComplete = row.original.status === 'complete';
                    return (
                        <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-semibold w-fit ${isComplete ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                {isComplete ? 'Complete' : 'Draft'}
                            </span>
                            {!isComplete && (
                                <span className="text-[10px] text-slate-400">{row.original.mapping_count} Qs mapped</span>
                            )}
                        </div>
                    );
                }
            },
            {
                accessorKey: 'created_at',
                header: 'Date',
                cell: ({ row }) => (
                    <span className="text-slate-500 text-sm">
                        {new Date(row.original.created_at).toLocaleDateString()}
                    </span>
                )
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => {
                    const isComplete = row.original.status === 'complete';
                    return (
                        <div className="flex justify-end gap-3 items-center">
                            {/* Always show Edit/Continue */}
                            <button
                                onClick={() => navigate(`/teacher/papers/${row.original.id}/edit`)}
                                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors"
                            >
                                {isComplete ? 'Edit' : 'Continue →'}
                            </button>
                            {/* Download PDF only when complete */}
                            {isComplete && (
                                <button
                                    onClick={() => handleDownload(row.original.id, row.original.title)}
                                    className="text-emerald-600 hover:text-emerald-800 font-medium text-sm transition-colors"
                                >
                                    Download PDF
                                </button>
                            )}
                            <button
                                onClick={() => handleDelete(row.original.id)}
                                className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    );
                }
            }
        ],
        []
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-indigo-900">Question Paper</h1>
                    <p className="text-slate-500">Create and manage CBSE question papers</p>
                </div>
                <button
                    onClick={() => navigate('/teacher/papers/new')}
                    className="inline-flex items-center justify-center px-4 py-2 bg-[#4f46e5] hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Paper
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={paginatedPapers}
                    isLoading={loading}
                    emptyMessage="No papers yet. Click New Paper to get started."
                />
            </div>

            {totalPages > 1 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={papers.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            )}
        </div>
    );
};

export default QuestionPaperHistory;
