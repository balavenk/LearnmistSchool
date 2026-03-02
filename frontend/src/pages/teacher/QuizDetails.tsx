import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
}

const QuizDetails: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State (for adding/editing)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    // ... (form fields state would go here, omitting for brevity in initial scaffold)

    // Simple state for quick implementation
    const [qText, setQText] = useState('');
    const [qPoints, setQPoints] = useState(1);
    const [qType, setQType] = useState('MULTIPLE_CHOICE');
    const [qOptions, setQOptions] = useState<QuestionOption[]>([{ text: '', is_correct: false }]);


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

    const handleGenerateSample = async () => {
        try {
            await api.post(`/teacher/assignments/${assignmentId}/seed_questions`);
            fetchQuestions();
            toast.success("Sample questions added!");
        } catch (error) {
            console.error("Failed to seed questions", error);
            toast.error("Failed to add sample questions.");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                text: qText,
                points: qPoints,
                question_type: qType,
                options: qOptions
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
        } else {
            setEditingQuestion(null);
            setQText('');
            setQPoints(1);
            setQType('MULTIPLE_CHOICE');
            setQOptions([{ text: '', is_correct: false }]);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingQuestion(null);
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
            return <p className="text-sm text-green-600">Answer: {correct ? correct.text : 'N/A'}</p>;
        }
        return (
            <ul className="list-disc pl-5 mt-2 space-y-1">
                {q.options.map((opt, idx) => (
                    <li key={idx} className={opt.is_correct ? "text-green-600 font-medium" : "text-slate-500"}>
                        {opt.text} {opt.is_correct && "(Correct)"}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <button onClick={() => navigate('/teacher/assignments')} className="text-slate-500 hover:text-slate-800 mb-2">← Back to Assignments</button>
                    <h1 className="text-3xl font-bold text-slate-900">Quiz Content</h1>
                    <p className="text-slate-500">Manage questions for this assignment.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleGenerateSample}
                        className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 py-2 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                        + Add Sample Data
                    </button>
                    <button
                        onClick={() => openModal()}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        + Add Question
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
                                    <div>
                                        <h3 className="text-lg font-medium text-slate-900">{q.text}</h3>
                                        <div className="flex gap-2 text-xs text-uppercase tracking-wider text-slate-400 mt-1 mb-3">
                                            <span>{q.question_type.replace('_', ' ')}</span>
                                            <span>•</span>
                                            <span>{q.points} Points</span>
                                        </div>
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
