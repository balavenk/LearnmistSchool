import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

interface QuestionOption {
    id: number;
    text: string;
    question_id: number;
}

interface Question {
    id: number;
    text: string;
    points: number;
    question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
    options: QuestionOption[];
}

interface AssignmentDetail {
    id: number;
    title: string;
    description: string;
    questions: Question[];
}

interface TakeQuizProps {
    assignmentId: number;
    onClose: () => void;
    onSubmitSuccess: () => void;
}

const TakeQuiz: React.FC<TakeQuizProps> = ({ assignmentId, onClose, onSubmitSuccess }) => {
    const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<number, { optionId?: number; text?: string }>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const response = await api.get(`/student/assignments/${assignmentId}/take`);
                setAssignment(response.data);
            } catch (error) {
                console.error("Failed to load quiz", error);
                alert("Failed to load quiz. It might not be available.");
                onClose();
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [assignmentId]);

    const handleOptionSelect = (questionId: number, optionId: number) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: { optionId }
        }));
    };

    const handleTextChange = (questionId: number, text: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: { text }
        }));
    };

    const isComplete = () => {
        if (!assignment) return false;
        return assignment.questions.every(q => {
            const ans = answers[q.id];
            if (!ans) return false;
            if (q.question_type === 'SHORT_ANSWER') return !!ans.text?.trim(); // Ensure text is not empty
            return !!ans.optionId; // Ensure option is selected
        });
    };

    const handleSubmit = async () => {
        if (!isComplete()) return;
        if (!window.confirm("Are you sure you want to finish the test? You cannot change answers after submitting.")) return;

        setSubmitting(true);
        try {
            // Format answers for API
            // API Expects: answers: List[StudentAnswerCreate]
            // StudentAnswerCreate: { question_id, selected_option_id, text_answer }
            const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
                question_id: parseInt(qId),
                selected_option_id: ans.optionId,
                text_answer: ans.text
            }));

            await api.post('/student/submissions/', {
                assignment_id: assignmentId,
                answers: formattedAnswers
            });

            alert("Quiz submitted successfully!");
            onSubmitSuccess();
        } catch (error) {
            console.error("Failed to submit quiz", error);
            alert("Failed to submit quiz.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading quiz...</div>;
    if (!assignment) return null;

    return (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
            <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 border-b border-slate-200 pb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{assignment.title}</h1>
                        <p className="mt-2 text-slate-600">{assignment.description}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Questions */}
                <div className="space-y-8">
                    {assignment.questions.map((q, index) => (
                        <div key={q.id} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <div className="flex items-start gap-4">
                                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold rounded-full text-sm">
                                    {index + 1}
                                </span>
                                <div className="flex-1">
                                    <h3 className="text-lg font-medium text-slate-900 mb-4">{q.text}</h3>

                                    {/* Options */}
                                    <div className="space-y-3">
                                        {(q.question_type === 'MULTIPLE_CHOICE' || q.question_type === 'TRUE_FALSE') && q.options.map(opt => (
                                            <label key={opt.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${answers[q.id]?.optionId === opt.id
                                                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200'
                                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                                }`}>
                                                <input
                                                    type="radio"
                                                    name={`question-${q.id}`}
                                                    value={opt.id}
                                                    checked={answers[q.id]?.optionId === opt.id}
                                                    onChange={() => handleOptionSelect(q.id, opt.id)}
                                                    className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                                />
                                                <span className="ml-3 text-slate-700">{opt.text}</span>
                                            </label>
                                        ))}

                                        {q.question_type === 'SHORT_ANSWER' && (
                                            <textarea
                                                className="w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md"
                                                rows={3}
                                                placeholder="Type your answer here..."
                                                value={answers[q.id]?.text || ''}
                                                onChange={(e) => handleTextChange(q.id, e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer / Submit */}
                <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isComplete() || submitting}
                        className={`px-8 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white shadow-sm transition-all
                            ${isComplete() && !submitting
                                ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'
                                : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                        {submitting ? 'Submitting...' : 'Submit Test'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TakeQuiz;
