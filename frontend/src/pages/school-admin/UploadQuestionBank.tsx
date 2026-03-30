import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import UploadQuestionBankModal from '../../components/UploadQuestionBankModal';
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
    Clock,
    Trash2,
    FileIcon,
    BookOpen
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
    year?: number;
}

interface PaginatedResponse {
    items: PdfFile[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

const SchoolAdminUploadQuestionBank: React.FC = () => {
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
                `/upload/training-material/${gradeId}?page=${page}&page_size=${size}&is_bank=true`
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
            toast.success("Question Bank deleted successfully");
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
                    <div className="p-1.5 bg-orange-50 rounded-lg border border-orange-100">
                        <BookOpen className="w-4 h-4 text-orange-600" />
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
                <div className="flex items-center gap-1.5 text-slate-500 font-medium whitespace-nowrap">
                    <HardDrive className="w-3.5 h-3.5" />
                    {(row.original.file_size / 1024).toFixed(1)} KB
                </div>
            )
        },
        {
            header: 'Year',
            accessorKey: 'year',
            cell: ({ row }) => (
                <div className="text-slate-700 font-medium">
                    {row.original.year ? (
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                            {row.original.year}
                        </span>
                    ) : (
                        <span className="text-slate-400 italic text-xs">N/A</span>
                    )}
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'file_status',
            cell: ({ row }) => {
                const status = row.original.file_status || 'Uploaded';
                const isExtracted = status === 'Extracted';
                return (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${isExtracted
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                        }`}>
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
                        title="Delete Question Bank"
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
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <FileIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800 leading-tight truncate max-w-[150px]" title={pdf.original_filename}>
                            {pdf.original_filename}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-slate-500">{pdf.subject_name}</p>
                            {pdf.year && (
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[10px] text-slate-600 font-medium">
                                    {pdf.year}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${pdf.file_status === 'Extracted'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
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
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Question Bank Upload</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage Question Bank PDFs containing only questions for extraction.
                    </p>
                </div>

                <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Upload Question Bank
                </button>
            </div>

            {/* Filter Section */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden group">

                <div className="relative w-full md:w-auto flex-1 max-w-md">
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Grade Selection</label>
                    <select
                        value={selectedGradeId}
                        onChange={(e) => {
                            const value = e.target.value ? Number(e.target.value) : '';
                            setSelectedGradeId(value);
                            setCurrentPage(1);
                        }}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-700 transition-all cursor-pointer"
                    >
                        <option value="">Select a grade...</option>
                        {grades.map((grade) => (
                            <option key={grade.id} value={grade.id}>{grade.name}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-slate-50 px-5 py-3 rounded-xl border border-slate-200 flex items-center gap-4 shrink-0">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium mb-0.5">Total Banks</p>
                        <span className="text-xl font-bold text-slate-800">
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
                    emptyMessage={selectedGradeId === '' ? "Select a grade to view Question Banks." : "No Question Bank PDFs found for this grade."}
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

            <UploadQuestionBankModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSuccess={handleUploadSuccess}
                initialGradeId={Number(selectedGradeId)}
            />
        </div>
    );
};

export default SchoolAdminUploadQuestionBank;
