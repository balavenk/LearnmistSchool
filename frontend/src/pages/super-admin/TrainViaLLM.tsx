import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import axios from 'axios';
import { PAGINATION_CONFIG } from '../../config/pagination';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';

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

const TrainViaLLM: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'NOT_TRAINED' | 'TRAINED'>('NOT_TRAINED');
    const [files, setFiles] = useState<PdfFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery);

    const fetchFiles = useCallback(async (signal?: AbortSignal) => {
        try {
            const response = await api.get('/upload/all-training-materials', { signal });
            setFiles(response.data);
        } catch (error: any) {
            if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') return;
            console.error("Failed to load materials", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const abortController = new AbortController();
        let isMounted = true;

        const loadFiles = async () => {
            await fetchFiles(abortController.signal);
        };

        loadFiles();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, [fetchFiles]);

    const handleUpdateStatus = useCallback(async (id: number, status: string) => {
        try {
            await api.put(`/upload/training-material/${id}/status`, { file_status: status });
            // Refresh list or optimistic update
            setFiles(prev => prev.map(f => f.id === id ? { ...f, file_status: status } : f));
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

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.original_filename);

            // Append to html link element page
            document.body.appendChild(link);

            // Start download
            link.click();

            // Clean up and remove the link
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Download failed", error);
            toast.error("Failed to download file");
        }
    }, []);

    const filteredFiles = useMemo(() => {
        return files.filter(f => {
            const matchesTab = activeTab === 'NOT_TRAINED'
                ? (f.file_status === 'Uploaded' || f.file_status === 'Skipped' || f.file_status === 'Processing')
                : f.file_status === 'Trained';
            
            const matchesSearch = deferredSearchQuery === '' || 
                f.original_filename.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
                f.subject_name.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
                f.school_name.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
                f.grade_name.toLowerCase().includes(deferredSearchQuery.toLowerCase());
            
            return matchesTab && matchesSearch;
        });
    }, [files, activeTab, deferredSearchQuery]);

    const isFilterLoading = useMemo(
        () => searchQuery !== deferredSearchQuery,
        [searchQuery, deferredSearchQuery]
    );

    const totalPages = Math.ceil(filteredFiles.length / PAGINATION_CONFIG.TRAINING_FILES_PER_PAGE);
    const paginatedFiles = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGINATION_CONFIG.TRAINING_FILES_PER_PAGE;
        return filteredFiles.slice(startIndex, startIndex + PAGINATION_CONFIG.TRAINING_FILES_PER_PAGE);
    }, [filteredFiles, currentPage]);

    const handleTabChange = useCallback((tab: 'NOT_TRAINED' | 'TRAINED') => {
        setActiveTab(tab);
        setCurrentPage(1);
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        setCurrentPage(1);
    }, []);

    // DataTable Columns
    const columns = useMemo<ColumnDef<PdfFile>[]>(
        () => [
            {
                accessorKey: 'school_name',
                header: 'School',
                cell: ({ row }) => (
                    <span className="text-slate-900 font-medium">{row.original.school_name}</span>
                ),
            },
            {
                accessorKey: 'grade_name',
                header: 'Grade',
                cell: ({ row }) => (
                    <span className="text-slate-700">{row.original.grade_name}</span>
                ),
            },
            {
                accessorKey: 'subject_name',
                header: 'Subject',
                cell: ({ row }) => (
                    <span className="text-slate-900 font-semibold">{row.original.subject_name}</span>
                ),
            },
            {
                accessorKey: 'original_filename',
                header: 'File Name',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <div className="bg-red-100 rounded-lg p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="font-medium text-slate-900">{row.original.original_filename}</span>
                    </div>
                ),
            },
            {
                accessorKey: 'file_size',
                header: 'Size',
                cell: ({ row }) => (
                    <span className="text-slate-600 font-medium">{(row.original.file_size / 1024).toFixed(1)} KB</span>
                ),
            },
            {
                accessorKey: 'file_status',
                header: 'Status',
                cell: ({ row }) => (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 ${
                        row.original.file_status === 'Trained'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : row.original.file_status === 'Skipped'
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : row.original.file_status === 'Processing'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${
                            row.original.file_status === 'Trained' ? 'bg-green-500' :
                            row.original.file_status === 'Skipped' ? 'bg-slate-500' :
                            row.original.file_status === 'Processing' ? 'bg-amber-500 animate-pulse' :
                            'bg-blue-500'
                        }`}></span>
                        {row.original.file_status || 'Uploaded'}
                    </span>
                ),
            },
            {
                accessorKey: 'uploaded_at',
                header: 'Upload Date',
                cell: ({ row }) => (
                    <span className="text-slate-600">{new Date(row.original.uploaded_at).toLocaleDateString()}</span>
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
                                    onClick={() => navigate(`/train-llm/${row.original.id}`)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg hover:scale-105"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    Train
                                </button>
                                <button
                                    onClick={() => handleDownload(row.original)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg border-2 border-green-700 hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
                                    title="Download"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus(row.original.id, 'Skipped')}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border-2 border-slate-300 hover:bg-slate-200 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                    </svg>
                                    Skip
                                </button>
                            </>
                        )}
                    </div>
                ),
            },
        ],
        [activeTab, navigate, handleDownload, handleUpdateStatus]
    );

    return (
        <div className="space-y-6">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
                <div className="flex items-center gap-4 mb-2">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Train Via LLM</h1>
                        <p className="text-indigo-100 text-md mt-1">Manage and train LLM with uploaded materials</p>
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="text-indigo-100 text-sm font-medium">Total Files</div>
                        <div className="text-2xl font-bold mt-1">{files.length}</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="text-indigo-100 text-sm font-medium">Not Trained</div>
                        <div className="text-2xl font-bold mt-1">
                            {files.filter(f => f.file_status === 'Uploaded' || f.file_status === 'Skipped' || f.file_status === 'Processing').length}
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="text-indigo-100 text-sm font-medium">Trained</div>
                        <div className="text-2xl font-bold mt-1">{files.filter(f => f.file_status === 'Trained').length}</div>
                    </div>
                </div>
            </div>

            {/* Enhanced Tabs */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden">
                <div className="flex border-b-2 border-slate-200">
                    <button
                        onClick={() => handleTabChange('NOT_TRAINED')}
                        className={`flex-1 py-5 text-sm font-bold border-b-4 transition-all ${
                            activeTab === 'NOT_TRAINED'
                                ? 'border-indigo-600 bg-white text-indigo-600 shadow-sm'
                                : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Not Trained</span>
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-bold">
                                {files.filter(f => f.file_status === 'Uploaded' || f.file_status === 'Skipped' || f.file_status === 'Processing').length}
                            </span>
                        </div>
                    </button>
                    <button
                        onClick={() => handleTabChange('TRAINED')}
                        className={`flex-1 py-5 text-sm font-bold border-b-4 transition-all ${
                            activeTab === 'TRAINED'
                                ? 'border-indigo-600 bg-white text-indigo-600 shadow-sm'
                                : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Trained</span>
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-bold">
                                {files.filter(f => f.file_status === 'Trained').length}
                            </span>
                        </div>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 bg-slate-50 border-b-2 border-slate-200">
                    <div className="relative">
                        <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by filename, subject, school, or grade..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="w-full pl-12 pr-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={handleClearSearch}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                        Showing <span className="font-bold text-indigo-600">{paginatedFiles.length}</span> of <span className="font-bold">{filteredFiles.length}</span> files
                    </div>
                </div>
            </div>

            {/* DataTable */}
            <DataTable
                columns={columns}
                data={paginatedFiles}
                isLoading={loading || isFilterLoading}
                emptyMessage={searchQuery ? 'No files found matching your search' : 'No files found in this category'}
            />

            {/* Pagination */}
            {!loading && filteredFiles.length > 0 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredFiles.length}
                    itemsPerPage={PAGINATION_CONFIG.TRAINING_FILES_PER_PAGE}
                    isLoading={isFilterLoading}
                />
            )}
        </div>
    );
};

export default TrainViaLLM;
