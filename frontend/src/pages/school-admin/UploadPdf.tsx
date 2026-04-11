import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import UploadMaterialModal from '../../components/UploadMaterialModal';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';
import type { ColumnDef } from '@tanstack/react-table';
import PAGINATION_CONFIG from '../../config/pagination';
import {
    FileText,
    Plus,
    Calendar,
    HardDrive,
    Info,
    GraduationCap,
    Clock,
    Trash2,
    FileIcon
} from 'lucide-react';

interface Grade {
    id: number;
    name: string;
}

interface PdfFile {
    id: number;
    original_filename: string;
    uploaded_at: string;
    file_size: number;
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

const AdminUploadPdf: React.FC = () => {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [selectedGradeId, setSelectedGradeId] = useState<number | ''>('');
    const [materials, setMaterials] = useState<PdfFile[]>([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState<number>(PAGINATION_CONFIG.TRAINING_FILES_PER_PAGE);

    const fetchGrades = useCallback(async () => {
        try {
            const res = await api.get<Grade[]>('/school-admin/grades/');
            setGrades(res.data);
            if (res.data.length > 0) {
                setSelectedGradeId((prev) => (prev === '' ? res.data[0].id : prev));
            }
        } catch (error) {
            console.error('Failed to fetch grades', error);
        }
    }, []);

    const fetchMaterials = useCallback(async (gradeId: number, page: number = 1, size: number = PAGINATION_CONFIG.TRAINING_FILES_PER_PAGE) => {
        setLoading(true);
        try {
            const response = await api.get<PaginatedResponse>(
                `/upload/training-material/${gradeId}?page=${page}&page_size=${size}`
            );
            setMaterials(response.data.items);
            setTotalPages(response.data.total_pages);
            setTotalCount(response.data.total);
            setCurrentPage(response.data.page);
        } catch (error) {
            console.error('Failed to fetch materials', error);
            setMaterials([]);
            setTotalPages(1);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGrades();
    }, [fetchGrades]);

    useEffect(() => {
        if (selectedGradeId !== '') {
            fetchMaterials(Number(selectedGradeId), currentPage, pageSize);
        }
    }, [selectedGradeId, currentPage, pageSize, fetchMaterials]);

    const handleUploadSuccess = () => {
        if (selectedGradeId !== '') {
            setCurrentPage(1);
            fetchMaterials(Number(selectedGradeId), 1, pageSize);
        }
        setShowUploadModal(false);
    };

    const handleDelete = useCallback(async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this file? This action cannot be undone.")) return;

        try {
            await api.delete(`/upload/training-material/${id}`);
            toast.success("File deleted successfully");
            if (selectedGradeId !== '') {
                fetchMaterials(Number(selectedGradeId), currentPage, pageSize);
            }
        } catch (error: any) {
            console.error("Delete failed", error);
            toast.error(error.response?.data?.detail || "Failed to delete file");
        }
    }, [selectedGradeId, currentPage, pageSize, fetchMaterials]);

    // Column Definitions
    const columns = useMemo<ColumnDef<PdfFile>[]>(() => [
        {
            header: 'Subject',
            accessorKey: 'subject_name',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                        <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="font-semibold text-slate-900">{row.original.subject_name}</span>
                </div>
            )
        },
        {
            header: 'File Name',
            accessorKey: 'original_filename',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 max-w-[200px]">
                    <FileIcon className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="truncate font-medium text-slate-700" title={row.original.original_filename}>
                        {row.original.original_filename}
                    </span>
                </div>
            )
        },
        {
            header: 'Description',
            accessorKey: 'description',
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-slate-500 max-w-[150px] truncate" title={row.original.description}>
                    {row.original.description ? (
                        <>
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            {row.original.description}
                        </>
                    ) : '-'}
                </div>
            )
        },
        {
            header: 'Size',
            accessorKey: 'file_size',
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <HardDrive className="w-3.5 h-3.5" />
                    {(row.original.file_size / 1024).toFixed(1)} KB
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'file_status',
            cell: ({ row }) => {
                const status = row.original.file_status || 'Uploaded';
                const isTrained = status === 'Trained';
                return (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${isTrained
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isTrained ? 'bg-green-600' : 'bg-indigo-600'} ${isTrained ? 'animate-pulse' : ''}`}></div>
                        {status}
                    </span>
                );
            }
        },
        {
            header: 'Upload Date',
            accessorKey: 'uploaded_at',
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-slate-500 font-medium whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(row.original.uploaded_at).toLocaleDateString()}
                </div>
            )
        },
        {
            header: 'Actions',
            id: 'actions',
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(row.original.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete File"
                    >
                        <Trash2 className="w-4.5 h-4.5" />
                    </button>
                </div>
            )
        }
    ], [handleDelete]);

    const mobileCardRender = useCallback((pdf: PdfFile) => (
        <div className="space-y-4">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100 shadow-sm text-red-600">
                        <FileIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 leading-tight truncate max-w-[150px]" title={pdf.original_filename}>
                            {pdf.original_filename}
                        </h3>
                        <p className="text-xs text-indigo-600 font-black uppercase tracking-widest mt-0.5">{pdf.subject_name}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${pdf.file_status === 'Trained'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                        {pdf.file_status || 'Uploaded'}
                    </span>
                    <button
                        onClick={() => handleDelete(pdf.id)}
                        className="p-1.5 text-red-500 bg-red-50 rounded-lg border border-red-100"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-widest">Description</span>
                    <span className="text-slate-700 font-semibold truncate max-w-[150px]">{pdf.description || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-widest">Metadata</span>
                    <div className="flex items-center gap-3">
                        <span className="text-slate-700 font-bold flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-slate-400" />
                            {(pdf.file_size / 1024).toFixed(1)} KB
                        </span>
                        <span className="text-slate-700 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(pdf.uploaded_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    ), [handleDelete]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Upload Textbook</h1>
                        <p className="text-slate-600 font-medium flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-indigo-500" />
                            Manage educational materials and train LLM across all grades.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowUploadModal(true)}
                        disabled={selectedGradeId === ''}
                        className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6 py-3 rounded-xl shadow-lg shadow-indigo-100 font-bold transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                    >
                        <Plus className="w-5 h-5" /> Add PDF to train LLM
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden group">

                <div className="relative w-full md:w-auto flex-1 max-w-md">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 block ml-1">Grade Administration</label>
                    <div className="relative">
                        <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-indigo-500 pointer-events-none" />
                        <select
                            value={selectedGradeId}
                            onChange={(e) => {
                                const value = e.target.value ? Number(e.target.value) : '';
                                setSelectedGradeId(value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Select a grade...</option>
                            {grades.map((grade) => (
                                <option key={grade.id} value={grade.id}>{grade.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Plus className="w-4 h-4 rotate-45" />
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-50 px-6 py-4 rounded-2xl border border-indigo-100 flex items-center gap-4 shrink-0 shadow-sm">
                    <div className="p-2.5 bg-white rounded-xl shadow-xs border border-indigo-50">
                        <HardDrive className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Materials</p>
                        <span className="text-2xl font-black text-indigo-950 leading-none">
                            {totalCount}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[400px]">
                <DataTable
                    data={materials}
                    columns={columns}
                    isLoading={loading}
                    mobileCardRender={mobileCardRender}
                    emptyMessage={selectedGradeId === '' ? "Select a grade to view materials." : "No PDF materials found for this grade."}
                />

                {!loading && materials.length > 0 && (
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalCount}
                        itemsPerPage={pageSize}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={(val) => {
                            setPageSize(val);
                            setCurrentPage(1);
                        }}
                    />
                )}
            </div>

            <UploadMaterialModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSuccess={handleUploadSuccess}
                initialGradeId={Number(selectedGradeId)}
            />
        </div>
    );
};

export default AdminUploadPdf;
