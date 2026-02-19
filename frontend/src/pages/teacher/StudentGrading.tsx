import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

interface Assignment {
    id: number;
    title: string;
    description: string;
    status: 'PUBLISHED' | 'DRAFT';
}

interface Submission {
    id: number;
    assignment_id: number;
    status: 'PENDING' | 'SUBMITTED' | 'GRADED';
    submitted_at: string;
    assignment: Assignment;
    answers?: StudentAnswer[];
}

interface Question {
    id: number;
    text: string;
    points: number;
    question_type: string;
    options: { id: number; text: string; is_correct: boolean }[];
}

interface StudentAnswer {
    id: number;
    question_id: number;
    selected_option_id?: number;
    text_answer?: string;
    is_correct: boolean;
    points_awarded: number;
}

interface SubmissionDetail extends Submission {
    assignment: Assignment & { questions: Question[] };
    answers: StudentAnswer[];
}

const StudentGrading: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();

    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'quiz' | 'project'>('quiz');
    const [studentName, setStudentName] = useState('');

    // Grading Detail State
    const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
    const [submissionDetail, setSubmissionDetail] = useState<SubmissionDetail | null>(null);

    // Working Grade State
    const [finalGrade, setFinalGrade] = useState('');
    const [feedback, setFeedback] = useState('');
    const [gradedAnswers, setGradedAnswers] = useState<{ [qId: number]: { points: number; isCorrect: boolean } }>({});


    useEffect(() => {
        if (studentId) {
            fetchSubmissions();
            fetchStudentDetails();
        }
    }, [studentId]);

    const fetchStudentDetails = async () => {
        try {
            const res = await api.get(`/teacher/students/${studentId}`);
            setStudentName(res.data.name);
        } catch (error) {
            console.error("Failed to fetch student details", error);
        }
    };

    const fetchSubmissions = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/teacher/students/${studentId}/pending-submissions`);
            setSubmissions(res.data);
        } catch (error) {
            console.error("Failed to fetch submissions", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubmissionDetail = async (subId: number) => {
        try {
            setSelectedSubmissionId(subId);
            const res = await api.get(`/teacher/submissions/${subId}/details`);
            const detail = res.data;
            setSubmissionDetail(detail);

            // Initialize grading state
            setFeedback(detail.feedback || '');
            setFinalGrade(detail.grade || '');

            const initialGrades: any = {};
            let totalPoints = 0;

            detail.assignment.questions.forEach((q: Question) => {
                const ans = detail.answers.find((a: StudentAnswer) => a.question_id === q.id);
                // Auto-grade logic for display default
                const isCorrect = ans?.is_correct || false;
                const points = ans?.points_awarded || (isCorrect ? q.points : 0);

                initialGrades[q.id] = { points, isCorrect };
                totalPoints += points;
            });
            setGradedAnswers(initialGrades);
            if (!detail.grade) setFinalGrade(totalPoints.toString());

        } catch (error) {
            console.error("Failed to fetch details", error);
        }
    };

    const handleSaveGrade = async () => {
        if (!selectedSubmissionId) return;
        try {
            const answersPayload = Object.keys(gradedAnswers).map(qId => ({
                question_id: Number(qId),
                points: gradedAnswers[Number(qId)].points,
                is_correct: gradedAnswers[Number(qId)].isCorrect
            }));

            await api.post(`/teacher/submissions/${selectedSubmissionId}/grade`, {
                grade: finalGrade,
                feedback: feedback,
                answers: answersPayload
            });

            toast.success("Grade saved successfully!");
            setSelectedSubmissionId(null);
            fetchSubmissions(); // Refresh list
        } catch (error) {
            console.error("Failed to save grade", error);
            toast.error("Failed to save grade.");
        }
    };

    const toggleAnswerCorrectness = (qId: number, maxPoints: number) => {
        setGradedAnswers(prev => {
            const current = prev[qId];
            const newCorrect = !current.isCorrect;
            return {
                ...prev,
                [qId]: {
                    isCorrect: newCorrect,
                    points: newCorrect ? maxPoints : 0
                }
            };
        });
    };

    // Calculate live total
    const currentTotalScore = Object.values(gradedAnswers).reduce((sum, item) => sum + item.points, 0);

    // Filter submissions based on tab
    const filteredSubmissions = submissions.filter(sub => {
        const questions = (sub.assignment as any).questions || [];
        if (activeTab === 'quiz') return questions.length > 0;
        return questions.length === 0;
    });

    if (loading) return <div className="p-8 text-center text-slate-500">Loading submissions...</div>;

    return (
        <div className="space-y-6">
            {/* Enhanced Header with Breadcrumb */}
            <div>
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-4 font-medium group">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Grading Dashboard</span>
                </button>
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">Grade Assignments</h1>
                    {studentName && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border-2 border-indigo-200 shadow-md">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-lg">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 font-medium">Student</div>
                                    <div className="text-lg font-bold text-slate-900">{studentName}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Tabs */}
            <div className="flex space-x-2 bg-white rounded-xl p-2 shadow-sm border border-slate-200">
                <button
                    onClick={() => setActiveTab('quiz')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'quiz'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md transform scale-105'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Quiz Submissions
                </button>
                <button
                    onClick={() => setActiveTab('project')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'project'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md transform scale-105'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Project Assignments
                </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Enhanced Left: List of Submissions */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Pending Submissions
                        </h3>
                    </div>
                    {filteredSubmissions.length === 0 ? (
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
                            <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-slate-500 text-sm font-medium">No pending {activeTab === 'quiz' ? 'quiz' : 'project'} submissions</p>
                        </div>
                    ) : (
                        filteredSubmissions.map(sub => (
                            <div
                                key={sub.id}
                                onClick={() => fetchSubmissionDetail(sub.id)}
                                className={`group p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 relative overflow-hidden ${selectedSubmissionId === sub.id
                                        ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-500 ring-4 ring-indigo-200 shadow-lg transform scale-105'
                                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                                    }`}
                            >
                                {selectedSubmissionId === sub.id && (
                                    <div className="absolute top-3 right-3">
                                        <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                                <div className="font-bold text-slate-900 mb-2 text-lg pr-6">{sub.assignment.title}</div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${sub.status === 'GRADED' ? 'bg-green-100 text-green-700' :
                                        sub.status === 'SUBMITTED' ? 'bg-orange-100 text-orange-700' :
                                            'bg-gray-100 text-gray-700'
                                    }`}>
                                    {sub.status === 'GRADED' && (
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    {sub.status}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* Enhanced Right: Grading Area */}
                <div className="lg:col-span-2">
                    {selectedSubmissionId && submissionDetail ? (
                        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-8 space-y-6">
                            {/* Enhanced Header */}
                            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">{submissionDetail.assignment.title}</h2>
                                    <p className="text-sm text-slate-600">{submissionDetail.assignment.description}</p>
                                </div>
                                <div className="text-right ml-6">
                                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200">
                                        <div className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                            {currentTotalScore}
                                        </div>
                                        <div className="text-xs text-slate-600 font-semibold uppercase tracking-wide">Total Points</div>
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced Questions */}
                            <div className="space-y-5">
                                {submissionDetail.assignment.questions.map((q, idx) => {
                                    const studentAns = submissionDetail.answers.find(a => a.question_id === q.id);
                                    const graded = gradedAnswers[q.id] || { points: 0, isCorrect: false };

                                    return (
                                        <div key={q.id} className={`p-6 rounded-xl border-2 transition-all ${graded.isCorrect
                                                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                                                : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
                                            }`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className="bg-indigo-600 text-white rounded-lg px-3 py-1.5 font-bold text-sm">
                                                        Q{idx + 1}
                                                    </div>
                                                    <span className="font-semibold text-slate-800 text-base leading-relaxed">{q.text}</span>
                                                </div>
                                                <div className="bg-white rounded-lg px-3 py-1.5 shadow-sm border border-slate-200 ml-4">
                                                    <span className="text-xs font-bold text-slate-500">Max:</span>
                                                    <span className="text-sm font-bold text-indigo-600 ml-1">{q.points} pts</span>
                                                </div>
                                            </div>

                                            {/* Enhanced Answer Display */}
                                            <div className="mb-4">
                                                <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    Student Answer:
                                                </div>
                                                <div className={`p-4 rounded-lg font-medium shadow-sm ${graded.isCorrect
                                                        ? 'bg-green-100 text-green-900 border-2 border-green-300'
                                                        : 'bg-red-100 text-red-900 border-2 border-red-300'
                                                    }`}>
                                                    {q.question_type === 'MULTIPLE_CHOICE' || q.question_type === 'TRUE_FALSE'
                                                        ? q.options.find(o => o.id === studentAns?.selected_option_id)?.text || "No Answer Provided"
                                                        : studentAns?.text_answer || "No Answer Provided"
                                                    }
                                                </div>
                                                {!graded.isCorrect && (q.question_type === 'MULTIPLE_CHOICE' || q.question_type === 'TRUE_FALSE') && (
                                                    <div className="mt-2 p-3 bg-white rounded-lg border-2 border-green-200">
                                                        <div className="text-xs font-bold text-green-700 uppercase tracking-wide flex items-center gap-2 mb-1">
                                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                            Correct Answer:
                                                        </div>
                                                        <div className="text-sm font-semibold text-green-800">
                                                            {q.options.find(o => o.is_correct)?.text || "Check Answer Key"}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Enhanced Grading Controls */}
                                            <div className="flex items-center gap-4 border-t-2 border-slate-200 pt-4 bg-white rounded-lg p-4 -mb-2 -mx-2">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={graded.isCorrect}
                                                        onChange={() => toggleAnswerCorrectness(q.id, q.points)}
                                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                    <span className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">Mark as Correct</span>
                                                </label>
                                                <div className="flex items-center gap-3 ml-auto">
                                                    <span className="text-sm font-bold text-slate-600">Award Points:</span>
                                                    <input
                                                        type="number"
                                                        value={graded.points}
                                                        onChange={(e) => setGradedAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], points: Number(e.target.value) } }))}
                                                        className="w-20 px-3 py-2 border-2 border-slate-300 rounded-lg text-center font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                        min="0"
                                                        max={q.points}
                                                    />
                                                    <span className="text-sm text-slate-500 font-medium">/ {q.points}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Enhanced Final Grade Input */}
                            <div className="pt-6 border-t-2 border-slate-200">
                                <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Final Grade & Feedback</label>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                            Letter Grade
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="A, B, C..."
                                            value={finalGrade}
                                            onChange={(e) => setFinalGrade(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-center text-lg"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                            </svg>
                                            Teacher Feedback
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="Add comments about the student's performance..."
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                                        />
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        onClick={() => setSelectedSubmissionId(null)}
                                        className="px-6 py-3 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold transition-all flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveGrade}
                                        className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform hover:scale-105"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Save Grade
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-300 min-h-[500px]">
                            <div className="text-center">
                                {selectedSubmissionId ? (
                                    <>
                                        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                                        <span className="text-slate-500 font-medium">Loading submission details...</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4">
                                            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">Select a Submission</h3>
                                        <p className="text-slate-500 text-sm">Choose a submission from the list to start grading</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentGrading;
