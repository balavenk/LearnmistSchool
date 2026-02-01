import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

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

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            const response = await api.get('/upload/all-training-materials');
            setFiles(response.data);
        } catch (error) {
            console.error("Failed to load materials", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await api.put(`/upload/training-material/${id}/status`, { file_status: status });
            // Refresh list or optimistic update
            setFiles(prev => prev.map(f => f.id === id ? { ...f, file_status: status } : f));
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update status");
        }
    };

    const handleDownload = async (file: PdfFile) => {
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
            alert("Failed to download file");
        }
    };

    const filteredFiles = files.filter(f => {
        if (activeTab === 'NOT_TRAINED') {
            // Processing files should also be visible here so user knows they are busy
            return f.file_status === 'Uploaded' || f.file_status === 'Skipped' || f.file_status === 'Processing';
        } else {
            return f.file_status === 'Trained';
        }
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Train Via LLM</h1>
                <p className="text-slate-500 text-sm">Manage and train LLM with uploaded materials.</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('NOT_TRAINED')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'NOT_TRAINED'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                        `}
                    >
                        Not Trained
                    </button>
                    <button
                        onClick={() => setActiveTab('TRAINED')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'TRAINED'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                        `}
                    >
                        Trained
                    </button>
                </nav>
            </div>

            {/* Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">School</th>
                            <th className="px-6 py-4">Grade</th>
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
                            <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
                        ) : filteredFiles.length === 0 ? (
                            <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">No files found in this category.</td></tr>
                        ) : (
                            filteredFiles.map(file => (
                                <tr key={file.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-900">{file.school_name}</td>
                                    <td className="px-6 py-4 text-slate-900">{file.grade_name}</td>
                                    <td className="px-6 py-4 text-slate-900 font-medium">{file.subject_name}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                        </svg>
                                        {file.original_filename}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{(file.file_size / 1024).toFixed(1)} KB</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${file.file_status === 'Trained'
                                            ? 'bg-green-100 text-green-700'
                                            : file.file_status === 'Skipped'
                                                ? 'bg-gray-100 text-gray-700'
                                                : file.file_status === 'Processing'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {file.file_status || 'Uploaded'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{new Date(file.uploaded_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        {activeTab === 'NOT_TRAINED' && (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/train-llm/${file.id}`)}
                                                    className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition"
                                                >
                                                    Train
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(file)}
                                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition flex items-center gap-1"
                                                    title="Download"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    DL
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(file.id, 'Skipped')}
                                                    className="px-3 py-1 bg-slate-200 text-slate-700 text-xs rounded hover:bg-slate-300 transition"
                                                >
                                                    Skip
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TrainViaLLM;
