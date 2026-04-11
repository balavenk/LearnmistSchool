import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Printer, FilePlus, Image, X, Loader2 } from 'lucide-react';
import api from '../../api/axios';

interface QuestionOption {
    id?: number;
    text: string;
    is_correct: boolean;
}

interface Question {
    id: number;
    text: string;
    points: number;
    question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
    options: QuestionOption[];
    media_url?: string;
    media_type?: string; // "image" | "video"
}

const QuizDetails: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Determine back link based on user role path
    const isIndividual = location.pathname.startsWith('/individual');
    const backUrl = isIndividual ? '/individual/quizzes' : '/teacher/assignments';
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [includeAnswers, setIncludeAnswers] = useState(false);

    // Form State (for adding/editing)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    // ... (form fields state would go here, omitting for brevity in initial scaffold)

    // Simple state for quick implementation
    const [qText, setQText] = useState('');
    const [qPoints, setQPoints] = useState(1);
    const [qType, setQType] = useState('MULTIPLE_CHOICE');
    const [qOptions, setQOptions] = useState<QuestionOption[]>([{ text: '', is_correct: false }]);

    // Media state
    const [qMediaUrl, setQMediaUrl] = useState<string | undefined>(undefined);
    const [qMediaType, setQMediaType] = useState<string | undefined>(undefined);
    const [mediaUploading, setMediaUploading] = useState(false);
    const [mediaPreview, setMediaPreview] = useState<string | undefined>(undefined);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    // Helper to get full media URL
    const getMediaUrl = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('blob:')) return url;

        // If URL is already absolute, return it
        if (url.startsWith('http://') || url.startsWith('https://')) return url;

        const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
        const relativePath = url.startsWith('/') ? url : `/${url}`;

        return `${baseUrl}${relativePath}`;
    };


    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/teacher/assignments/${assignmentId}/questions`);
            setQuestions(response.data);
        } catch (error) {
            console.error("Failed to fetch questions", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (assignmentId) fetchQuestions();
    }, [assignmentId]);

    const handlePrint = () => {
        window.print();
    };



    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                text: qText,
                points: qPoints,
                question_type: qType,
                options: qOptions,
                media_url: qMediaUrl ?? null,
                media_type: qMediaType ?? null,
            };

            if (editingQuestion) {
                await api.put(`/teacher/questions/${editingQuestion.id}`, payload);
                toast.success("Question updated!");
            } else {
                await api.post(`/teacher/assignments/${assignmentId}/questions`, payload);
                toast.success("Question added!");
            }
            closeModal();
            fetchQuestions();
        } catch (error) {
            console.error("Failed to save question", error);
            toast.error("Failed to save question.");
        }
    };

    const openModal = (q?: Question) => {
        if (q) {
            setEditingQuestion(q);
            setQText(q.text);
            setQPoints(q.points);
            setQType(q.question_type);
            setQOptions(q.options.length > 0 ? q.options : [{ text: '', is_correct: false }]);
            setQMediaUrl(q.media_url);
            setQMediaType(q.media_type);
            setMediaPreview(q.media_url);
        } else {
            setEditingQuestion(null);
            setQText('');
            setQPoints(1);
            setQType('MULTIPLE_CHOICE');
            setQOptions([{ text: '', is_correct: false }]);
            setQMediaUrl(undefined);
            setQMediaType(undefined);
            setMediaPreview(undefined);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingQuestion(null);
        setQMediaUrl(undefined);
        setQMediaType(undefined);
        setMediaPreview(undefined);
    };

    const handleOptionChange = (index: number, field: keyof QuestionOption, value: any) => {
        const newOptions = [...qOptions];
        // @ts-ignore
        newOptions[index][field] = value;
        setQOptions(newOptions);
    };

    const addOption = () => {
        setQOptions([...qOptions, { text: '', is_correct: false }]);
    };

    const removeOption = (index: number) => {
        setQOptions(qOptions.filter((_, i) => i !== index));
    };

    // ---- Media Upload ----
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
    const MAX_IMAGE_BYTES = 2 * 1024 * 1024;   // 2 MB
    const MAX_VIDEO_BYTES = 10 * 1024 * 1024;  // 10 MB

    const handleMediaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

        if (!isImage && !isVideo) {
            toast.error('Unsupported file type. Use JPEG, PNG, GIF, WebP, MP4, or WebM.');
            return;
        }

        const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
        const maxLabel = isImage ? '2 MB' : '10 MB';
        if (file.size > maxBytes) {
            toast.error(`File too large. Maximum size is ${maxLabel}.`);
            return;
        }

        // Show local preview immediately
        const localUrl = URL.createObjectURL(file);
        setMediaPreview(localUrl);
        setQMediaType(isImage ? 'image' : 'video');
        setMediaUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('assignment_id', assignmentId!);

            const res = await api.post('/upload/question-media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setQMediaUrl(res.data.media_url);
            setQMediaType(res.data.media_type);
            setMediaPreview(res.data.media_url); // Switch to served URL
            toast.success('Media uploaded!');
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Failed to upload media.';
            toast.error(msg);
            setMediaPreview(undefined);
            setQMediaUrl(undefined);
            setQMediaType(undefined);
        } finally {
            setMediaUploading(false);
            // Reset file input so the same file can be re-selected if needed
            if (mediaInputRef.current) mediaInputRef.current.value = '';
        }
    };

    const clearMedia = () => {
        setQMediaUrl(undefined);
        setQMediaType(undefined);
        setMediaPreview(undefined);
        if (mediaInputRef.current) mediaInputRef.current.value = '';
    };

    const handleDelete = async (id: number) => {
        // Non-blocking - removed confirm() to prevent UI blocking
        try {
            await api.delete(`/teacher/questions/${id}`);
            toast.success('Question deleted successfully');
            setQuestions(questions.filter(q => q.id !== id));
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    // Helper to render options based on type
    const renderOptions = (q: Question) => {
        if (q.question_type === 'SHORT_ANSWER') {
            const correct = q.options.find(o => o.is_correct);
            if (!includeAnswers) return null;
            return <p className="text-sm text-green-600 font-medium mt-2">Correct Answer: {correct ? correct.text : ''}</p>;
        }
        return (
            <ul className="list-disc pl-5 mt-2 space-y-1">
                {q.options.map((opt, idx) => (
                    <li key={idx} className={includeAnswers && opt.is_correct ? "text-green-600 font-medium" : "text-slate-500"}>
                        {opt.text} {includeAnswers && opt.is_correct && "(Correct)"}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            {/* Print Only Header */}
            <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100 flex justify-between items-start mb-6 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">Brinymist School</h1>
                        <p className="text-sm text-slate-600">Official Assessment Paper</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-semibold">Quiz Assessment</h2>
                        <p className="text-sm text-slate-500">Assignment ID: {assignmentId}</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-8 border-t border-slate-100 pt-6">
                    <div className="border-b border-slate-300 pb-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500">Student Name:</span>
                        <div className="h-6"></div>
                    </div>
                    <div className="border-b border-slate-300 pb-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500">Grade / Section:</span>
                        <div className="h-6"></div>
                    </div>
                    <div className="border-b border-slate-300 pb-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500">Date:</span>
                        <div className="h-6"></div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center no-print">
                <div className="print-header">
                    <button onClick={() => navigate(backUrl)} className="text-slate-500 hover:text-slate-800 mb-2 no-print">← Back to Assignments</button>
                    <h1 className="text-3xl font-bold text-slate-900">Quiz Content</h1>
                    <p className="text-slate-500">Manage questions for this assignment.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        disabled={questions.length === 0}
                        className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Printer className="w-4 h-4" />
                        Print Quiz
                    </button>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg no-print">
                        <label className="text-sm font-medium text-slate-600 cursor-pointer flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={includeAnswers}
                                onChange={(e) => setIncludeAnswers(e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600"
                            />
                            Include Answers
                        </label>
                    </div>

                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                    >
                        <FilePlus className="w-4 h-4" />
                        Add Question
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {loading ? <p>Loading questions...</p> : (
                    questions.length === 0 ? <p className="text-slate-500 italic">No questions yet. Try adding sample data!</p> :
                        questions.map((q, index) => (
                            <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative group">
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(q)} className="text-sky-600 hover:text-sky-800 text-sm font-medium">Edit</button>
                                    <button onClick={() => handleDelete(q.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded text-sm">Q{index + 1}</span>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-medium text-slate-900">{q.text}</h3>
                                        <div className="flex gap-2 text-xs text-uppercase tracking-wider text-slate-400 mt-1 mb-3">
                                            <span>{q.question_type.replace('_', ' ')}</span>
                                            <span>•</span>
                                            <span>{q.points} Points</span>
                                        </div>
                                        {/* Question media inline display */}
                                        {q.media_url && q.media_type === 'image' && (
                                            <img
                                                src={getMediaUrl(q.media_url)}
                                                alt="Question media"
                                                className="mb-3 rounded-lg max-h-48 object-contain border border-slate-200"
                                            />
                                        )}
                                        {q.media_url && q.media_type === 'video' && (
                                            <video
                                                src={getMediaUrl(q.media_url)}
                                                controls
                                                className="mb-3 rounded-lg max-h-48 w-full border border-slate-200"
                                            />
                                        )}
                                        {renderOptions(q)}
                                    </div>
                                </div>
                            </div>
                        ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">{editingQuestion ? 'Edit Question' : 'Add New Question'}</h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Question Text</label>
                                <textarea required rows={2} value={qText} onChange={(e) => setQText(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                    <select value={qType} onChange={(e) => setQType(e.target.value as 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER')} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                        <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                                        <option value="TRUE_FALSE">True / False</option>
                                        <option value="SHORT_ANSWER">Short Answer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Points</label>
                                    <input type="number" min={1} value={qPoints} onChange={(e) => setQPoints(parseInt(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>

                            {/* Options Logic */}
                            <div className="border-t border-slate-100 pt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {qType === 'SHORT_ANSWER' ? 'Correct Answer' : 'Options'}
                                </label>

                                {qType === 'SHORT_ANSWER' ? (
                                    <input
                                        type="text"
                                        required
                                        placeholder="Correct Answer Text"
                                        value={qOptions[0]?.text || ''}
                                        onChange={(e) => handleOptionChange(0, 'text', e.target.value)}
                                        // Auto-set is_correct for short answer
                                        onBlur={() => handleOptionChange(0, 'is_correct', true)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                ) : (
                                    <div className="space-y-2">
                                        {qOptions.map((opt, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="correctOption"
                                                    checked={opt.is_correct}
                                                    onChange={() => {
                                                        const newOpts = qOptions.map((o, i) => ({ ...o, is_correct: i === idx }));
                                                        setQOptions(newOpts);
                                                    }}
                                                    className="w-4 h-4 text-indigo-600"
                                                />
                                                <input
                                                    type="text"
                                                    required
                                                    value={opt.text}
                                                    onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                                                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
                                                    placeholder={`Option ${idx + 1}`}
                                                />
                                                {qOptions.length > 2 && (
                                                    <button type="button" onClick={() => removeOption(idx)} className="text-slate-400 hover:text-red-500">×</button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={addOption} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mt-1">+ Add Option</button>
                                    </div>
                                )}
                            </div>

                            {/* Media Upload Section */}
                            <div className="border-t border-slate-100 pt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                                    <Image className="w-4 h-4" />
                                    Attach Image or Video <span className="text-slate-400 font-normal">(optional)</span>
                                </label>

                                {/* Preview */}
                                {mediaPreview && (
                                    <div className="relative inline-block mb-3">
                                        {qMediaType === 'image' ? (
                                            <img
                                                src={getMediaUrl(mediaPreview)}
                                                alt="Preview"
                                                className="rounded-lg border border-slate-200 max-h-36 max-w-full object-contain"
                                            />
                                        ) : (
                                            <video
                                                src={getMediaUrl(mediaPreview)}
                                                controls
                                                className="rounded-lg border border-slate-200 max-h-36 w-full"
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={clearMedia}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 shadow"
                                            title="Remove media"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}

                                {/* File Picker */}
                                {!mediaPreview && (
                                    <label className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-sm text-slate-500 ${mediaUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {mediaUploading ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                                        ) : (
                                            <><Image className="w-4 h-4" /> Click to pick an image or video</>
                                        )}
                                        <input
                                            ref={mediaInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                                            className="hidden"
                                            onChange={handleMediaFileChange}
                                            disabled={mediaUploading}
                                        />
                                    </label>
                                )}
                                <p className="text-xs text-slate-400 mt-1">Images: JPEG/PNG/GIF/WebP, max 2 MB · Videos: MP4/WebM, max 10 MB</p>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizDetails;
