import React, { useState, useEffect } from 'react';
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
}

const QuestionBankDetails: React.FC = () => {
    const { gradeId } = useParams<{ gradeId: string }>();
    const navigate = useNavigate();
    const [pdfs, setPdfs] = useState<PdfFile[]>([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const gradeName = `Grade ${gradeId}`; // Logic to fetch name is pending, using ID for now

    const fetchMaterials = async () => {
        try {
            const response = await api.get(`/upload/training-material/${gradeId}`);
            setPdfs(response.data);
        } catch (error) {
            console.error("Failed to load materials", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (gradeId) {
            fetchMaterials();
        }
    }, [gradeId]);

    const handleBack = () => {
        navigate('/school-admin/question-bank');
    };

    const handleAddPdf = () => {
        setShowUploadModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this file? This action cannot be undone.")) return;

        try {
            await api.delete(`/upload/training-material/${id}`);
            // Remove from state
            setPdfs(pdfs.filter(pdf => pdf.id !== id));
        } catch (error: any) {
            console.error("Delete failed", error);
            alert(error.response?.data?.detail || "Failed to delete file");
        }
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
                            <th className="px-6 py-4">Subject</th>
                            <th className="px-6 py-4">File Name</th>
                            <th className="px-6 py-4">Size</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Upload Date</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
                        ) : pdfs.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No PDFs uploaded yet.</td></tr>
                        ) : (
                            pdfs.map(pdf => (
                                <tr key={pdf.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-900 font-medium">{pdf.subject_name}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                        </svg>
                                        {pdf.original_filename}
                                    </td>
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

            <UploadMaterialModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSuccess={fetchMaterials}
                gradeId={Number(gradeId)}
            />
        </div>
    );
};

export default QuestionBankDetails;
