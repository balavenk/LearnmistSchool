import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
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

type MaterialTab = 'UPLOADED' | 'TRAINED';

const TeacherUploadPdf: React.FC = () => {
    const navigate = useNavigate();
    const [grades, setGrades] = useState<Grade[]>([]);
    const [selectedGradeId, setSelectedGradeId] = useState<number | ''>('');
    const [materials, setMaterials] = useState<PdfFile[]>([]);
    const [activeTab, setActiveTab] = useState<MaterialTab>('UPLOADED');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [trainingId, setTrainingId] = useState<number | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;

    const fetchGrades = async () => {
        try {
            const res = await api.get<Grade[]>('/teacher/grades/');
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
            console.error('Failed to fetch uploaded materials', error);
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

    const filteredMaterials = useMemo(() => {
        if (activeTab === 'TRAINED') {
            return materials.filter((m) => m.file_status === 'Trained');
        }
        return materials.filter((m) => m.file_status !== 'Trained');
    }, [materials, activeTab]);

    const handleUploadSuccess = () => {
        if (selectedGradeId !== '') {
            setCurrentPage(1);
            fetchMaterials(Number(selectedGradeId), 1);
        }
    };

    const handleTrain = async (fileId: number) => {
        setTrainingId(fileId);
        try {
            await api.post(`/upload/training-material/${fileId}/train`, {
                file_status: 'Processing',
                file_metadata: JSON.stringify({ triggered_by: 'teacher' }),
            });
            navigate(`/teacher/upload/${fileId}/progress`);
        } catch (error) {
            console.error('Failed to start training', error);
            alert('Failed to start training for this PDF.');
        } finally {
            setTrainingId(null);
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
                    <p className="text-slate-500 text-sm">Upload PDFs and train LLM from teacher workspace.</p>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Grade</label>
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

            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('UPLOADED')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'UPLOADED'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    Uploaded
                </button>
                <button
                    onClick={() => setActiveTab('TRAINED')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'TRAINED'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    Trained
                </button>
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
                        ) : filteredMaterials.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No PDFs found for this tab.</td></tr>
                        ) : (
                            filteredMaterials.map((pdf) => (
                                <tr key={pdf.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-900 font-medium">{pdf.subject_name}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{pdf.original_filename}</td>
                                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={pdf.description}>{pdf.description || '-'}</td>
                                    <td className="px-6 py-4 text-slate-500">{(pdf.file_size / 1024).toFixed(1)} KB</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            pdf.file_status === 'Trained' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {pdf.file_status || 'Uploaded'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{new Date(pdf.uploaded_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        {activeTab === 'UPLOADED' && (
                                            <button
                                                onClick={() => handleTrain(pdf.id)}
                                                disabled={trainingId === pdf.id}
                                                className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {trainingId === pdf.id ? 'Starting...' : 'Train'}
                                            </button>
                                        )}
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
                gradeId={Number(selectedGradeId)}
                subjectEndpoint="/teacher/subjects/"
            />
        </div>
    );
};

export default TeacherUploadPdf;
