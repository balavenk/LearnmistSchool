import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../api/axios';

interface Subject {
    id: number;
    name: string;
}

interface Grade {
    id: number;
    name: string;
    school_id?: number;
}

interface UploadMaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    schoolId?: number;
    initialGradeId?: number;
}

const UploadMaterialModal: React.FC<UploadMaterialModalProps> = ({ isOpen, onClose, onSuccess, initialGradeId }) => {
    const [file, setFile] = useState<File | null>(null);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedGradeId, setSelectedGradeId] = useState<number | ''>(initialGradeId || '');
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentSchoolId, setCurrentSchoolId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchGrades();
            fetchUserInfo();
        }
    }, [isOpen]);

    const fetchUserInfo = async () => {
        try {
            const res = await api.get('/auth/me');
            setCurrentSchoolId(res.data.school_id);
        } catch (err) {
            console.error("Failed to fetch user info", err);
        }
    };

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
            } else if (response.data.length > 0 && !selectedGradeId) {
                // Optional: auto-select first grade? Maybe better to let user choose.
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
                // For Admins, show ALL subjects in the school so they can manage curriculum freely
                endpoint = `/school-admin/subjects/`;
            }

            const response = await api.get(endpoint);
            setSubjects(response.data);
            setSelectedSubjectId('');
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
        if (!file) {
            setError('Please select a file');
            return;
        }
        if (!selectedGradeId) {
            setError('Please select a grade');
            return;
        }
        if (!selectedSubjectId) {
            setError('Please select a subject');
            return;
        }

        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('grade_id', selectedGradeId.toString());
        formData.append('subject_id', selectedSubjectId.toString());
        if (description) formData.append('description', description);
        // school_id is required by backend form but typically backend can infer or we pass it. 
        // Our backend router expects school_id as Form param.
        // We need to get school_id. 
        // Ideally backend infers from user, BUT the router signature says school_id: int = Form(...).
        // Let's change backend to infer or fetch it here.
        // Since we are School Admin, we can fetch our profile or just pass a placeholder if the backend validates it against token anyway.
        // Wait, the backend logic: "if current_user.school_id != school_id: raise 403". 
        // So we MUST pass the correct school_id.
        // We can get it from local storage user info or fetch "me". 
        // For now, let's fetch it or just assume we can get it from context.
        // Let's fetch current user info to get school_id first? Or just list it in subjects?
        // Actually, let's modify backend to use `current_user.school_id` as default if not passed, OR just pass it.
        // Let's assume we can get it.

        // HACK: For this iteration, let's fetch school_id or just get it from the user context. 
        // Since I don't have a global auth context easily accessible here without traversing up, 
        // I will do a quick fetch of "me" or just rely on the fact that I can modify the backend to verify token school_id 
        // and ignore the form param if matches or optional.

        // Better: Fetch it on mount.

        try {
            // Find school_id from selected grade
            const selectedGrade = grades.find(g => g.id === Number(selectedGradeId));
            const schoolIdToUse = selectedGrade?.school_id || currentSchoolId;

            if (!schoolIdToUse) {
                // Last ditch effort: Fetch if both missing (shouldn't happen with grades pre-loaded)
                const me = await api.get('/auth/me');
                formData.append('school_id', me.data.school_id.toString());
            } else {
                formData.append('school_id', schoolIdToUse.toString());
            }

            await api.post('/upload/training-material', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Reset form fields after successful upload
            setFile(null);
            setSelectedSubjectId('');
            setDescription('');

            // Reset file input element
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) {
                fileInput.value = '';
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Upload PDF for Training</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Select Grade
                        </label>
                        <select
                            value={selectedGradeId}
                            onChange={(e) => {
                                setSelectedGradeId(Number(e.target.value));
                                setSelectedSubjectId('');
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">Select a grade...</option>
                            {grades.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Select Subject
                        </label>
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            disabled={!selectedGradeId || subjects.length === 0}
                        >
                            <option value="">{subjects.length === 0 ? 'No subjects found for this grade' : 'Select a subject...'}</option>
                            {subjects.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                        </select>
                        {selectedGradeId && subjects.length === 0 && (
                            <p className="text-amber-600 text-xs mt-1">
                                No subjects are currently assigned to this grade.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Description <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                            placeholder="Enter a brief description of the content..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            PDF File
                        </label>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                {file ? (
                                    <div className="flex items-center justify-center gap-2 text-sm text-indigo-600 font-medium">
                                        <span>{file.name}</span>
                                        <button
                                            type="button"
                                            className="ml-2 text-slate-400 hover:text-red-600 focus:outline-none"
                                            title="Remove file"
                                            onClick={e => {
                                                e.stopPropagation();
                                                setFile(null);
                                                // Also reset the file input value
                                                const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                                                if (fileInput) fileInput.value = '';
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <svg className="mx-auto h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <div className="text-xs text-slate-500">
                                            Click to browse PDF
                                        </div>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Uploading...' : 'Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadMaterialModal;