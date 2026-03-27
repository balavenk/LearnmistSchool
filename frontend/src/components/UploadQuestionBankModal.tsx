import React, { useState, useEffect } from 'react';
import { Trash2, Upload, FileText } from 'lucide-react';
import api from '../api/axios';

interface Subject {
    id: number;
    name: string;
}

interface Grade {
    id: number;
    name: string;
    school_id: number;
}

interface UploadQuestionBankModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialGradeId?: number;
}

const UploadQuestionBankModal: React.FC<UploadQuestionBankModalProps> = ({ isOpen, onClose, onSuccess, initialGradeId }) => {
    const [file, setFile] = useState<File | null>(null);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedGradeId, setSelectedGradeId] = useState<number | ''>(initialGradeId || '');
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
    const [description, setDescription] = useState('');
    const [year, setYear] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchGrades();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedGradeId) {
            fetchSubjects(Number(selectedGradeId));
        } else {
            setSubjects([]);
            setSelectedSubjectId('');
        }
    }, [selectedGradeId]);

    const fetchGrades = async () => {
        try {
            const role = localStorage.getItem('role')?.toUpperCase();
            let endpoint = '/school-admin/grades/';
            if (role === 'TEACHER') {
                endpoint = '/teacher/grades/';
            }
            const response = await api.get(endpoint);
            setGrades(response.data);
            
            if (initialGradeId) {
                setSelectedGradeId(initialGradeId);
            }
        } catch (err) {
            console.error("Failed to fetch grades", err);
        }
    };

    const fetchSubjects = async (gId: number) => {
        try {
            const role = localStorage.getItem('role')?.toUpperCase();
            let endpoint = `/school-admin/grades/${gId}/subjects`;

            if (role === 'TEACHER') {
                endpoint = `/teacher/grades/${gId}/subjects`;
            } else if (role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN') {
                endpoint = `/school-admin/subjects/`;
            }

            const response = await api.get(endpoint);
            setSubjects(response.data);
        } catch (err) {
            console.error("Failed to fetch subjects", err);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!file || !selectedGradeId || !selectedSubjectId) {
            setError('Please fill all required fields');
            return;
        }

        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('grade_id', selectedGradeId.toString());
        formData.append('subject_id', selectedSubjectId.toString());
        if (description) formData.append('description', description);
        if (year) formData.append('year', year.toString());
        
        const selectedGrade = grades.find(g => g.id === Number(selectedGradeId));
        if (selectedGrade) {
            formData.append('school_id', selectedGrade.school_id.toString());
        }

        try {
            await api.post('/upload/question-bank', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onSuccess();
            onClose();
            setFile(null);
            setSelectedGradeId('');
            setSelectedSubjectId('');
            setDescription('');
            setYear('');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 border-2 border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-600 to-red-600"></div>
                
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-lg">
                            <Upload className="text-orange-600" size={24} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800">Upload Question Bank</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">Grade</label>
                            <select
                                value={selectedGradeId}
                                onChange={(e) => setSelectedGradeId(Number(e.target.value) || '')}
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                            >
                                <option value="">Select Grade</option>
                                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">Subject</label>
                            <select
                                value={selectedSubjectId}
                                onChange={(e) => setSelectedSubjectId(Number(e.target.value) || '')}
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                                disabled={!selectedGradeId}
                            >
                                <option value="">Select Subject</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none h-24 font-medium"
                            placeholder="e.g., Previous year physics unit test papers..."
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">Year (Optional)</label>
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
                            min="1900"
                            max="2100"
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                            placeholder="e.g., 2023"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">Upload PDF</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-orange-500 hover:bg-orange-50 transition-all cursor-pointer relative">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            {file ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="bg-orange-600 text-white p-3 rounded-xl">
                                        <FileText size={32} />
                                    </div>
                                    <span className="font-bold text-slate-800">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => setFile(null)}
                                        className="text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 mt-2"
                                    >
                                        <Trash2 size={14} /> Remove
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
                                        <Upload className="text-slate-400" size={32} />
                                    </div>
                                    <div className="text-slate-600 font-bold">Click to browse or drag PDF here</div>
                                    <p className="text-xs text-slate-400 font-medium">Question bank PDFs only</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={loading || !file}
                        className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105"
                    >
                        {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {loading ? 'Uploading...' : 'Start Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadQuestionBankModal;
