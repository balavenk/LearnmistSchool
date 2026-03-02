import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import UploadMaterialModal from '../../components/UploadMaterialModal';
import api from '../../api/axios';
import axios from 'axios';
import { DataTable } from '../../components/DataTable';

interface PdfFile {
    id: number;
    original_filename: string;
    uploaded_at: string;
    file_size: number;
    mime_type: string;
    file_status: string;
    subject_name: string;
    description?: string;
}

interface PaginatedResponse {
    items: PdfFile[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

const QuestionBankDetails: React.FC = () => {
    const { gradeId } = useParams<{ gradeId: string }>();
    const navigate = useNavigate();
    const [pdfs, setPdfs] = useState<PdfFile[]>([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;

    // Sorting state for DataTable
    const [sorting, setSorting] = useState<SortingState>([{
        id: 'uploaded_at',
        desc: true
    }]);

    useEffect(() => {
        const abortController = new AbortController();
        let isMounted = true;

        const fetchMaterials = async (page: number = 1) => {
            setLoading(true);
            try {
                const response = await api.get<PaginatedResponse>(
                    `/upload/training-material/${gradeId}?page=${page}&page_size=${pageSize}`,
                    { signal: abortController.signal }
                );
                if (isMounted) {
                    setPdfs(response.data.items);
                    setTotalPages(response.data.total_pages);
                    setTotalCount(response.data.total);
                    setCurrentPage(response.data.page);
                }
            } catch (error: any) {
                if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
                if (isMounted) console.error("Failed to load materials", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (gradeId) {
            fetchMaterials(currentPage);
        }

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, [gradeId, currentPage]);

    // Refetch function for use after mutations
    const refetchMaterials = async (page: number = currentPage) => {
        try {
            const response = await api.get<PaginatedResponse>(
                `/upload/training-material/${gradeId}?page=${page}&page_size=${pageSize}`
            );
            setPdfs(response.data.items);
            setTotalPages(response.data.total_pages);
            setTotalCount(response.data.total);
            setCurrentPage(response.data.page);
        } catch (error: any) {
            if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
            console.error("Failed to refetch materials", error);
        }
    };

    // Cleanup: Close modal when component unmounts (e.g., navigating away)
    useEffect(() => {
        return () => {
            setShowUploadModal(false);
        };
    }, []);

    const handleBack = () => {
        navigate('/school-admin/upload-pdf');
    };

    const handleAddPdf = () => {
        setShowUploadModal(true);
    };

    const handleDelete = useCallback(async (id: number) => {
        // Non-blocking confirmation - user must click delete twice or we proceed immediately
        // TODO: Replace with proper confirmation modal for production
        try {
            await api.delete(`/upload/training-material/${id}`);
            toast.success('File deleted successfully');
            // Refetch current page to sync with server
            refetchMaterials(currentPage);
        } catch (error: any) {
            console.error("Delete failed", error);
            toast.error(error.response?.data?.detail || "Failed to delete file");
        }
    }, [currentPage]);

    const handleUploadSuccess = () => {
        // Go to first page and refresh when new file is uploaded
        setCurrentPage(1);
        refetchMaterials(1);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Define columns for DataTable
    const columns = useMemo<ColumnDef<PdfFile>[]>(() => [
        {
            accessorKey: 'subject_name',
            header: 'Subject',
            cell: ({ row }) => (
                <span className="font-medium text-slate-900">{row.original.subject_name}</span>
            ),
        },
        {
            accessorKey: 'original_filename',
            header: 'File Name',
            cell: ({ row }) => (
                <span className="text-slate-700">{row.original.original_filename}</span>
            ),
        },
        {
            accessorKey: 'file_size',
            header: 'Size',
            cell: ({ row }) => (
                <span className="text-slate-600">{formatFileSize(row.original.file_size)}</span>
            ),
        },
        {
            accessorKey: 'uploaded_at',
            header: 'Uploaded',
            cell: ({ row }) => (
                <span className="text-slate-600">{formatDate(row.original.uploaded_at)}</span>
            ),
        },
        {
            accessorKey: 'file_status',
            header: 'Status',
            cell: ({ row }) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    row.original.file_status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-slate-100 text-slate-800'
                }`}>
                    {row.original.file_status}
                </span>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <button
                    onClick={() => handleDelete(row.original.id)}
                    className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors"
                    title="Delete"
                >
                    Delete
                </button>
            ),
        },
    ], [handleDelete]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={handleBack}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                    title="Go Back"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Question Bank - Grade {gradeId}</h1>
                    <p className="text-slate-500 text-sm">Manage educational materials for this grade.</p>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800">Uploaded Materials</h2>
                <button
                    onClick={handleAddPdf}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add PDF to Train LLM
                </button>
            </div>

            {/* DataTable */}
            <DataTable
                columns={columns}
                data={pdfs}
                isLoading={loading}
                emptyMessage="No PDFs uploaded yet."
                sorting={sorting}
                onSortingChange={setSorting}
                manualSorting={false}
            />

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-sm text-slate-500">
                        Showing {pdfs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="First Page"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Previous Page"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === pageNum
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Next Page"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <button
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Last Page"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <UploadMaterialModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSuccess={handleUploadSuccess}
                initialGradeId={Number(gradeId)}
            />
        </div>
    );
};

export default QuestionBankDetails;
