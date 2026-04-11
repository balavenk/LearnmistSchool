import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import axios from 'axios';
import { PAGINATION_CONFIG } from '../../config/pagination';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';
import UploadQuestionBankModal from '../../components/UploadQuestionBankModal';

interface PdfFile {
    id: number;
    original_filename: string;
    uploaded_at: string;
    file_size: number;
    mime_type: string;
    file_status: string;
    subject_name: string;
    school_name: string;
    grade_name: string;
}

const ManageQuestionBank: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'NOT_TRAINED' | 'TRAINED'>('NOT_TRAINED');
    const [files, setFiles] = useState<PdfFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const deferredSearchQuery = useDeferredValue(searchQuery);

    const fetchFiles = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const response = await api.get('/upload/all-question-bank-materials', { signal });
            setFiles(response.data);
        } catch (error: any) {
            if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
            console.error("Failed to load question bank materials", error);
            toast.error("Failed to load materials");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const abortController = new AbortController();
        fetchFiles(abortController.signal);
        return () => abortController.abort();
    }, [fetchFiles]);

    const handleUpdateStatus = useCallback(async (id: number, status: string) => {
        try {
            await api.put(`/upload/training-material/${id}/status`, { file_status: status });
            setFiles(prev => prev.map(f => f.id === id ? { ...f, file_status: status } : f));
            toast.success(`Status updated to ${status}`);
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error("Failed to update status");
        }
    }, []);

    const handleDownload = useCallback(async (file: PdfFile) => {
        try {
            const response = await api.get(`/upload/training-material/${file.id}/download`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.original_filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Download failed", error);
            toast.error("Failed to download file");
        }
    }, []);

    const filteredFiles = useMemo(() => {
        return files.filter(f => {
            const matchesTab = activeTab === 'NOT_TRAINED'
                ? (f.file_status !== 'Extracted')
                : f.file_status === 'Extracted';

            const matchesSearch = deferredSearchQuery === '' ||
                f.original_filename.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
                f.subject_name.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
                f.school_name.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
                f.grade_name.toLowerCase().includes(deferredSearchQuery.toLowerCase());

            return matchesTab && matchesSearch;
        });
    }, [files, activeTab, deferredSearchQuery]);

    const isFilterLoading = useMemo(() => searchQuery !== deferredSearchQuery, [searchQuery, deferredSearchQuery]);

    const totalPages = Math.ceil(filteredFiles.length / PAGINATION_CONFIG.TRAINING_FILES_PER_PAGE);
    const paginatedFiles = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGINATION_CONFIG.TRAINING_FILES_PER_PAGE;
        return filteredFiles.slice(startIndex, startIndex + PAGINATION_CONFIG.TRAINING_FILES_PER_PAGE);
    }, [filteredFiles, currentPage]);

    const columns = useMemo<ColumnDef<PdfFile>[]>(() => [
        {
            accessorKey: 'school_name',
            header: 'School',
            cell: ({ row }) => <span className="text-slate-900 font-medium">{row.original.school_name}</span>,
        },
        {
            accessorKey: 'grade_name',
            header: 'Grade',
            cell: ({ row }) => <span className="text-slate-700">{row.original.grade_name}</span>,
        },
        {
            accessorKey: 'subject_name',
            header: 'Subject',
            cell: ({ row }) => <span className="text-slate-900 font-semibold">{row.original.subject_name}</span>,
        },
        {
            accessorKey: 'original_filename',
            header: 'File Name',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-100 rounded-lg p-2">
                        <svg className="h-5 w-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" />
                        </svg>
                    </div>
                    <span className="font-medium text-slate-900">{row.original.original_filename}</span>
                </div>
            ),
        },
        {
            accessorKey: 'file_status',
            header: 'Status',
            cell: ({ row }) => (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 ${row.original.file_status === 'Extracted' ? 'bg-green-50 text-green-700 border-green-200' :
                        row.original.file_status === 'Processing' || row.original.file_status === 'Extracting' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${row.original.file_status === 'Extracted' ? 'bg-green-500' :
                            row.original.file_status === 'Processing' || row.original.file_status === 'Extracting' ? 'bg-amber-500 animate-pulse' :
                                'bg-blue-500'
                        }`}></span>
                    {row.original.file_status || 'Uploaded'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    {activeTab === 'NOT_TRAINED' && (
                        <>
                            <button
                                onClick={() => navigate(`/manage-question-bank/${row.original.id}/progress`)}
                                disabled={row.original.file_status === 'Processing' || row.original.file_status === 'Extracting'}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-lg transition-all shadow-md ${row.original.file_status === 'Processing' || row.original.file_status === 'Extracting'
                                    ? 'bg-slate-300 cursor-not-allowed opacity-70'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                                }`}
                            >
                                {row.original.file_status === 'Processing' || row.original.file_status === 'Extracting' ? 'Extracting...' : 'Extract Questions'}
                            </button>
                            <button
                                onClick={() => handleDownload(row.original)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border-2 border-slate-300 hover:bg-slate-200 transition-all"
                            >
                                Download
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ], [activeTab, navigate, handleDownload, handleUpdateStatus]);

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100 mb-6 ">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl p-3 shadow-lg">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Manage Question Bank</h1>
                            <p className="text-slate-600 text-md mt-1">Extract structured questions from PDF banks into the pool</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition-all flex items-center gap-2 hover:scale-105"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Upload Question Bank
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden">
                <div className="flex border-b-2 border-slate-200">
                    <button
                        onClick={() => setActiveTab('NOT_TRAINED')}
                        className={`flex-1 py-5 text-sm font-bold border-b-4 transition-all ${activeTab === 'NOT_TRAINED' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 bg-slate-50'}`}
                    >
                        Files to Extract ({files.filter(f => f.file_status !== 'Extracted').length})
                    </button>
                    <button
                        onClick={() => setActiveTab('TRAINED')}
                        className={`flex-1 py-5 text-sm font-bold border-b-4 transition-all ${activeTab === 'TRAINED' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 bg-slate-50'}`}
                    >
                        Extracted Banks ({files.filter(f => f.file_status === 'Extracted').length})
                    </button>
                </div>

                <div className="p-4 bg-slate-50">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search question banks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={paginatedFiles}
                    isLoading={loading || isFilterLoading}
                />

                {filteredFiles.length > PAGINATION_CONFIG.TRAINING_FILES_PER_PAGE && (
                    <div className="p-4 border-t-2 border-slate-200">
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={filteredFiles.length}
                            itemsPerPage={PAGINATION_CONFIG.TRAINING_FILES_PER_PAGE}
                        />
                    </div>
                )}
            </div>

            <UploadQuestionBankModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={() => fetchFiles()}
            />
        </div>
    );
};

export default ManageQuestionBank;
