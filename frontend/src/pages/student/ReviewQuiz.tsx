import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

interface QuestionOption {
    id: number;
    text: string;
    question_id: number;
    is_correct: boolean; // Assuming this is exposed in review, though QuestionOut normally hides it unless specific schema used
}

interface Question {
    id: number;
    text: string;
    points: number;
    question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
    options: QuestionOption[];
}

interface StudentAnswer {
    question_id: number;
    selected_option_id: number | null;
    text_answer: string | null;
    is_correct: boolean;
    points_awarded: number;
}

interface SubmissionDetail {
    id: number;
    grade: string | null;
    feedback: string | null;
    answers: StudentAnswer[];
    assignment: {
        id: number;
        title: string;
        description: string;
        questions: Question[];
    };
}

interface ReviewQuizProps {
    submissionId: number; // Changed from assignmentId as we need to fetch specific submission details
    onClose: () => void;
}

const ReviewQuiz: React.FC<ReviewQuizProps> = ({ submissionId, onClose }) => {
    const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReview = async () => {
            try {
                // Need to fetch assignment ID first? No, we need submission ID which links to it.
                // But the props passed here ... wait. 
                // StudentAssignments list has Assignment ID. 
                // We need to FIND the submission ID for this assignment for this student.
                // OR: Update StudentAssignments to fetch Submission ID in the "completed" list.
                // Let's assume StudentAssignments passes the submission ID if we update it?
                // The current "completed" list returns AssignmentOut.
                // We might need to call GET /submissions/ to map assignment -> submission ID
                // OR update GET /assignments/completed to return submission_id.

                // Let's assume for now we might need to look it up or passed correctly.
                // Actually StudentAssignments list uses /assignments/completed which returns AssignmentOut.
                // BUT lines 78-82 in student.py join Submission and Assignment but only return Assignment fields in a dict?
                // Wait, lines 89-100 in student.py manually construct the dict without submission_id.
                // checking student.py ...

                const response = await api.get(`/student/submissions/${submissionId}`);
                setSubmission(response.data);
            } catch (error) {
                console.error("Failed to load review", error);
                alert("Failed to load review.");
                onClose();
            } finally {
                setLoading(false);
            }
        };
        if (submissionId) fetchReview();
    }, [submissionId]);

    if (loading) return <div className="p-8 text-center">Loading review...</div>;
    if (!submission) return null;

    const { assignment } = submission;
    const answerMap = new Map(submission.answers.map(a => [a.question_id, a]));

    return (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
            <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 border-b border-slate-200 pb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Review: {assignment.title}</h1>
                        <p className="mt-2 text-slate-600">{assignment.description}</p>
                        <div className="mt-4 flex gap-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Grade: {submission.grade || "Pending"}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Total Score: {submission.answers.reduce((acc, curr) => acc + curr.points_awarded, 0)}
                            </span>
                        </div>
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
                    {assignment.questions.map((q, index) => {
                        const studentAnswer = answerMap.get(q.id);
                        const isCorrect = studentAnswer?.is_correct;

                        return (
                            <div key={q.id} className={`rounded-xl p-6 border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                <div className="flex items-start gap-4">
                                    <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center font-bold rounded-full text-sm ${isCorrect ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                                        {index + 1}
                                    </span>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <h3 className="text-lg font-medium text-slate-900 mb-4">{q.text}</h3>
                                            <span className="text-sm font-semibold text-slate-500">{studentAnswer?.points_awarded} / {q.points} pts</span>
                                        </div>

                                        {/* Options */}
                                        <div className="space-y-3">
                                            {(q.question_type === 'MULTIPLE_CHOICE' || q.question_type === 'TRUE_FALSE') && q.options.map(opt => {
                                                const isSelected = studentAnswer?.selected_option_id === opt.id;
                                                const isOptionCorrect = opt.is_correct; // Need backend to expose this

                                                let optionClass = "bg-white border-slate-200";
                                                let icon = null;

                                                if (isSelected && isOptionCorrect) {
                                                    optionClass = "bg-green-100 border-green-500 ring-1 ring-green-500";
                                                    icon = <span className="text-green-600 ml-auto">✓ Your Answer (Correct)</span>;
                                                } else if (isSelected && !isOptionCorrect) {
                                                    optionClass = "bg-red-100 border-red-500 ring-1 ring-red-500";
                                                    icon = <span className="text-red-600 ml-auto">✗ Your Answer (Incorrect)</span>;
                                                } else if (!isSelected && isOptionCorrect) {
                                                    optionClass = "bg-green-50 border-green-300 ring-1 ring-green-300 border-dashed";
                                                    icon = <span className="text-green-600 ml-auto">Correct Answer</span>;
                                                }

                                                return (
                                                    <div key={opt.id} className={`flex items-center p-3 rounded-lg border ${optionClass}`}>
                                                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center mr-3 ${isSelected ? 'border-slate-600' : 'border-slate-300'}`}>
                                                            {isSelected && <div className="h-2 w-2 rounded-full bg-slate-600" />}
                                                        </div>
                                                        <span className="text-slate-700">{opt.text}</span>
                                                        {icon}
                                                    </div>
                                                );
                                            })}

                                            {q.question_type === 'SHORT_ANSWER' && (
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium text-slate-700">Your Answer:</p>
                                                    <div className="p-3 bg-white border border-slate-300 rounded-md">
                                                        {studentAnswer?.text_answer || <span className="text-slate-400 italic">No answer provided</span>}
                                                    </div>
                                                    {/* Ideally show correct answer or feedback here if available */}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900"
                    >
                        Close Review
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewQuiz;
