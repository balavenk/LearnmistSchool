import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';

interface Subject {
    id: number;
    name: string;
}

interface UploadMaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    schoolId?: number; // Might not need if backend infers from token
    gradeId: number;
    subjectEndpoint?: string;
}

const UploadMaterialModal: React.FC<UploadMaterialModalProps> = ({ isOpen, onClose, onSuccess, gradeId, subjectEndpoint = '/school-admin/subjects/' }) => {
    console.log('📤 UploadMaterialModal props:', { isOpen, gradeId, subjectEndpoint });
    const [file, setFile] = useState<File | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            console.log('📖 Modal opened, fetching subjects from:', subjectEndpoint);
            fetchSubjects();
            // Reset form when modal opens
            setFile(null);
            setSelectedSubjectId('');
            setDescription('');
            setError('');
        }
    }, [isOpen, subjectEndpoint]);

    // Cleanup: Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const fetchSubjects = async () => {
        try {
            console.log('Fetching subjects from endpoint:', subjectEndpoint);
            const response = await api.get(subjectEndpoint);
            console.log('Received subjects:', response.data);
            setSubjects(response.data);
            if (response.data.length === 0) {
                setError('No subjects found. You may not be assigned to any subjects for this grade. Please contact your administrator.');
            }
        } catch (err) {
            console.error("Failed to fetch subjects", err);
            setError('Failed to load subjects. Please try again.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const handleUpload = async () => {
        console.log('🚀 Starting upload process...');
        if (!file) {
            setError('Please select a file');
            return;
        }
        if (!selectedSubjectId) {
            setError('Please select a subject');
            return;
        }

        setLoading(true);
        setError('');

        console.log('📦 Preparing upload:', { fileName: file.name, gradeId, selectedSubjectId, description });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('grade_id', gradeId.toString());
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
            // Get user info first to get school_id
            console.log('👤 Fetching user info...');
            const me = await api.get('/auth/me');
            console.log('User data:', me.data);
            const schoolId = me.data.school_id;
            console.log('School ID:', schoolId);

            if (!schoolId) {
                setError('Your account is not linked to a school. Please contact your administrator.');
                return;
            }

            formData.append('school_id', schoolId.toString());

            console.log('📤 Uploading to /upload/training-material...');
            const uploadResponse = await api.post('/upload/training-material', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('✅ Upload successful!', uploadResponse.data);
            
            // Show success toast
            toast.success('PDF uploaded successfully!');
            
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
            console.error('❌ Upload failed:', err);
            console.error('Error response:', err.response);
            const errorMsg = err.response?.data?.detail || err.message || 'Upload failed. Please try again.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    console.log('UploadMaterialModal render - isOpen:', isOpen);
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                // Close modal if clicking on backdrop
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
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
                            Select Subject
                        </label>
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">Select a subject...</option>
                            {subjects.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                        </select>
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
                                    <div className="text-sm text-indigo-600 font-medium">
                                        {file.name}
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
