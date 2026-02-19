import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UploadMaterialModal from '../../components/UploadMaterialModal';
import api from '../../api/axios';

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

type SortField = 'subject_name' | 'original_filename' | 'file_size' | 'uploaded_at';
type SortDirection = 'asc' | 'desc';

const QuestionBankDetails: React.FC = () => {
    const { gradeId } = useParams<{ gradeId: string }>();
    const navigate = useNavigate();
    const [pdfs, setPdfs] = useState<PdfFile[]>([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sortField, setSortField] = useState<SortField>('uploaded_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;

    const fetchMaterials = async (page: number = 1) => {
        setLoading(true);
        try {
            const response = await api.get<PaginatedResponse>(
                `/upload/training-material/${gradeId}?page=${page}&page_size=${pageSize}`
            );
            setPdfs(response.data.items);
            setTotalPages(response.data.total_pages);
            setTotalCount(response.data.total);
            setCurrentPage(response.data.page);
        } catch (error) {
            console.error("Failed to load materials", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (gradeId) {
            fetchMaterials(currentPage);
        }
    }, [gradeId, currentPage]);

    const handleBack = () => {
        navigate('/school-admin/question-bank');
    };

    const handleAddPdf = () => {
        setShowUploadModal(true);
        //alert("Upload feature pending backend integration.");
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this file? This action cannot be undone.")) return;

        try {
            await api.delete(`/upload/training-material/${id}`);
            // Refetch current page to sync with server
            fetchMaterials(currentPage);
        } catch (error: any) {
            console.error("Delete failed", error);
            alert(error.response?.data?.detail || "Failed to delete file");
        }
    };

    const handleUploadSuccess = () => {
        // Go to first page and refresh when new file is uploaded
        setCurrentPage(1);
        fetchMaterials(1);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            // Toggle direction if same field
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // New field, default to ascending
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedPdfs = useMemo(() => {
        const sorted = [...pdfs].sort((a, b) => {
            let aValue: any = a[sortField];
            let bValue: any = b[sortField];

            // Handle different data types
            if (sortField === 'uploaded_at') {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            } else if (sortField === 'file_size') {
                aValue = Number(aValue);
                bValue = Number(bValue);
            } else {
                // String comparison (case-insensitive)
                aValue = String(aValue).toLowerCase();
                bValue = String(bValue).toLowerCase();
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [pdfs, sortField, sortDirection]);

    const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
        if (sortField !== field) {
            return (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }

        return sortDirection === 'asc' ? (
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        );
    };

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

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th
                                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                onClick={() => handleSort('subject_name')}
                            >
                                <div className="flex items-center gap-2">
                                    Subject
                                    <SortIcon field="subject_name" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                onClick={() => handleSort('original_filename')}
                            >
                                <div className="flex items-center gap-2">
                                    File Name
                                    <SortIcon field="original_filename" />
                                </div>
                            </th>
                            <th className="px-6 py-4">Description</th>
                            <th
                                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                onClick={() => handleSort('file_size')}
                            >
                                <div className="flex items-center gap-2">
                                    Size
                                    <SortIcon field="file_size" />
                                </div>
                            </th>
                            <th className="px-6 py-4">Status</th>
                            <th
                                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                onClick={() => handleSort('uploaded_at')}
                            >
                                <div className="flex items-center gap-2">
                                    Upload Date
                                    <SortIcon field="uploaded_at" />
                                </div>
                            </th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
                        ) : sortedPdfs.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No PDFs uploaded yet.</td></tr>
                        ) : (
                            sortedPdfs.map(pdf => (
                                <tr key={pdf.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-900 font-medium">{pdf.subject_name}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                        </svg>
                                        {pdf.original_filename}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={pdf.description}>{pdf.description || '-'}</td>
                                    <td className="px-6 py-4 text-slate-500">{(pdf.file_size / 1024).toFixed(1)} KB</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                            {pdf.file_status || 'Uploaded'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{new Date(pdf.uploaded_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(pdf.id)}
                                            className="text-slate-400 hover:text-red-600 transition-colors"
                                            title="Delete File"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
