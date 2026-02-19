import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import UploadMaterialModal from '../../components/UploadMaterialModal';

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

const QuestionBank: React.FC = () => {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [selectedGradeId, setSelectedGradeId] = useState<number | ''>('');
    const [materials, setMaterials] = useState<PdfFile[]>([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;

    const fetchGrades = async () => {
        try {
            const res = await api.get<Grade[]>('/school-admin/grades/');
            setGrades(res.data);
            if (res.data.length > 0) {
                setSelectedGradeId((prev) => (prev === '' ? res.data[0].id : prev));
            }
        } catch (error) {
            console.error('Failed to fetch grades', error);
        }
    };

    const fetchMaterials = async (gradeId: number, page: number = 1) => {
        setLoading(true);
        try {
            const response = await api.get<PaginatedResponse>(
                `/upload/training-material/${gradeId}?page=${page}&page_size=${pageSize}`
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
    };

    useEffect(() => {
        fetchGrades();
    }, []);

    useEffect(() => {
        if (selectedGradeId !== '') {
            fetchMaterials(Number(selectedGradeId), currentPage);
        }
    }, [selectedGradeId, currentPage]);

    const handleUploadSuccess = () => {
        if (selectedGradeId !== '') {
            setCurrentPage(1);
            fetchMaterials(Number(selectedGradeId), 1);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this file? This action cannot be undone.")) return;

        try {
            await api.delete(`/upload/training-material/${id}`);
            if (selectedGradeId !== '') {
                fetchMaterials(Number(selectedGradeId), currentPage);
            }
        } catch (error: any) {
            console.error("Delete failed", error);
            toast.error(error.response?.data?.detail || "Failed to delete file");
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Upload PDF</h1>
                    <p className="text-slate-500 text-sm">Manage educational materials and train LLM across all grades.</p>
                </div>

                <button
                    onClick={() => setShowUploadModal(true)}
                    disabled={selectedGradeId === ''}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add PDF to train LLM
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Grade to Manage</label>
                <select
                    value={selectedGradeId}
                    onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : '';
                        setSelectedGradeId(value);
                        setCurrentPage(1);
                    }}
                    className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="">Select grade...</option>
                    {grades.map((grade) => (
                        <option key={grade.id} value={grade.id}>{grade.name}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Subject</th>
                            <th className="px-6 py-4">File Name</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Size</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Upload Date</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
                        ) : selectedGradeId === '' ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Select a grade to view materials.</td></tr>
                        ) : materials.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No PDFs found for this grade.</td></tr>
                        ) : (
                            materials.map((pdf) => (
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
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${pdf.file_status === 'Trained' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
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

            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-sm text-slate-500">
                        Showing {materials.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            <UploadMaterialModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSuccess={handleUploadSuccess}
                initialGradeId={Number(selectedGradeId)}
            />
        </div>
    );
};

export default QuestionBank;
