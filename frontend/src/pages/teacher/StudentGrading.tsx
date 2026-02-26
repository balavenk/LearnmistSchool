import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, ListTodo, CheckCircle2, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

interface Assignment {
    id: number;
    title: string;
    description: string;
    status: 'PUBLISHED' | 'DRAFT';
    due_date?: string;
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

interface Submission {
    id: number;
    assignment_id: number;
    status: 'PENDING' | 'SUBMITTED' | 'GRADED';
    submitted_at: string;
    grade?: string;
    feedback?: string;
    answers?: StudentAnswer[];
    assignment?: Assignment; // For detailed view
}

interface GradingOverviewItem {
    assignment: Assignment & { subject_name?: string }; // Include subject if returned
    submission: Submission | null;
    has_questions: boolean;
}

interface SubmissionDetail extends Submission {
    assignment: Assignment & { questions: Question[] };
    answers: StudentAnswer[];
}

const StudentGrading: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();

    const [overviewItems, setOverviewItems] = useState<GradingOverviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState('');

    // Main Tabs
    const [activeMainTab, setActiveMainTab] = useState<'quiz' | 'project'>('quiz');
    // Sub Tabs
    const [activeSubTab, setActiveSubTab] = useState<'not_started' | 'completed' | 'graded'>('not_started');

    // Grading Detail State
    const [isGradingMode, setIsGradingMode] = useState<boolean>(false);
    const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
    const [submissionDetail, setSubmissionDetail] = useState<SubmissionDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

    // Working Grade State
    const [finalGrade, setFinalGrade] = useState('');
    const [feedback, setFeedback] = useState('');
    const [gradedAnswers, setGradedAnswers] = useState<{ [qId: number]: { points: number; isCorrect: boolean } }>({});

    useEffect(() => {
        if (studentId) {
            fetchStudentDetails();
            fetchOverview();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    const fetchStudentDetails = async () => {
        try {
            const res = await api.get(`/teacher/students/${studentId}`);
            setStudentName(res.data.name);
        } catch (error) {
            console.error("Failed to fetch student details", error);
        }
    };

    const fetchOverview = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/teacher/students/${studentId}/grading-overview`);
            setOverviewItems(res.data);
        } catch (error) {
            console.error("Failed to fetch grading overview", error);
            toast.error("Failed to load assignments");
        } finally {
            setLoading(false);
        }
    };

    const fetchSubmissionDetail = async (subId: number) => {
        try {
            setLoadingDetail(true);
            setIsGradingMode(true);
            setSelectedSubmissionId(subId);

            const res = await api.get(`/teacher/submissions/${subId}/details`);
            const detail = res.data;
            setSubmissionDetail(detail);

            // Initialize grading state
            setFeedback(detail.feedback || '');
            setFinalGrade(detail.grade || '');

            const initialGrades: Record<number, { points: number; isCorrect: boolean }> = {};
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
            toast.error("Failed to load submission details");
            setIsGradingMode(false);
        } finally {
            setLoadingDetail(false);
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

            // Exit grading mode and refresh list
            setIsGradingMode(false);
            setSelectedSubmissionId(null);
            fetchOverview();

            // Switch to graded tab to show the result
            setActiveSubTab('graded');
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

    // --- Filtering Logic ---
    const getFilteredItems = () => {
        return overviewItems.filter(item => {
            // First filter by Main Tab (Quiz vs Project)
            const isQuiz = item.has_questions;
            if (activeMainTab === 'quiz' && !isQuiz) return false;
            if (activeMainTab === 'project' && isQuiz) return false;

            // Then filter by Sub Tab
            const sub = item.submission;
            if (activeSubTab === 'not_started') {
                return !sub || (sub.status !== 'SUBMITTED' && sub.status !== 'GRADED');
            } else if (activeSubTab === 'completed') {
                return sub && sub.status === 'SUBMITTED';
            } else if (activeSubTab === 'graded') {
                return sub && sub.status === 'GRADED';
            }
            return false;
        });
    };

    const displayedItems = getFilteredItems();

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // ==========================================
    // RENDER GRIDS
    // ==========================================
    const renderAssignedNotStartedGrid = () => (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                        <th className="px-6 py-4 font-semibold">Assignment Name</th>
                        <th className="px-6 py-4 font-semibold">Subject</th>
                        <th className="px-6 py-4 font-semibold">Date Assigned</th>
                        <th className="px-6 py-4 font-semibold text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {displayedItems.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No assignments found in this category.</td></tr>
                    )}
                    {displayedItems.map((item) => (
                        <tr key={item.assignment.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{item.assignment.title}</td>
                            <td className="px-6 py-4 text-slate-600">{item.assignment.subject_name || 'General'}</td>
                            <td className="px-6 py-4 text-slate-600">{formatDate(item.assignment.due_date)}</td>
                            <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                    Not Started
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderCompletedByStudentGrid = () => (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                        <th className="px-6 py-4 font-semibold">Assignment Name</th>
                        <th className="px-6 py-4 font-semibold">Subject</th>
                        <th className="px-6 py-4 font-semibold">Date Assigned</th>
                        <th className="px-6 py-4 font-semibold">Date Completed</th>
                        <th className="px-6 py-4 font-semibold text-center">Auto Score</th>
                        <th className="px-6 py-4 font-semibold text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {displayedItems.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No completed assignments ready for grading.</td></tr>
                    )}
                    {displayedItems.map((item) => {
                        const sub = item.submission!;
                        // Calculate auto score roughly assuming answers exist, or let grading view handle it
                        return (
                            <tr key={item.assignment.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900">{item.assignment.title}</td>
                                <td className="px-6 py-4 text-slate-600">{item.assignment.subject_name || 'General'}</td>
                                <td className="px-6 py-4 text-slate-600">{formatDate(item.assignment.due_date)}</td>
                                <td className="px-6 py-4 text-slate-600">{formatDate(sub.submitted_at)}</td>
                                <td className="px-6 py-4 text-center font-semibold text-indigo-600">
                                    Pending
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => fetchSubmissionDetail(sub.id)}
                                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Grade
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderGradedGrid = () => (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                        <th className="px-6 py-4 font-semibold">Assignment Name</th>
                        <th className="px-6 py-4 font-semibold">Date Assigned</th>
                        <th className="px-6 py-4 font-semibold">Date Completed</th>
                        <th className="px-6 py-4 font-semibold text-center">Score</th>
                        <th className="px-6 py-4 font-semibold">Comments</th>
                        <th className="px-6 py-4 font-semibold text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {displayedItems.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No graded assignments found.</td></tr>
                    )}
                    {displayedItems.map((item) => {
                        const sub = item.submission!;
                        return (
                            <tr key={item.assignment.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900">{item.assignment.title}</td>
                                <td className="px-6 py-4 text-slate-500 text-sm">{formatDate(item.assignment.due_date)}</td>
                                <td className="px-6 py-4 text-slate-500 text-sm">{formatDate(sub.submitted_at)}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-200">
                                        {sub.grade || '-'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-sm truncate max-w-[200px]" title={sub.feedback}>
                                    {sub.feedback || <span className="text-slate-400 italic">No comments</span>}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => fetchSubmissionDetail(sub.id)}
                                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                    >
                                        Edit Grade
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    // ==========================================
    // RENDER FULL GRADING DETAIL VIEW
    // ==========================================
    if (isGradingMode) {
        if (loadingDetail || !submissionDetail) {
            return <div className="p-12 flex justify-center items-center"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;
        }

        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                {/* Grading Header */}
                <div>
                    <button onClick={() => setIsGradingMode(false)} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-4 font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Assignments Grid</span>
                    </button>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">{submissionDetail.assignment.title}</h2>
                            <p className="text-sm text-slate-500 mb-4">{submissionDetail.assignment.description}</p>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
                                    <User className="w-4 h-4 text-indigo-500" />
                                    <span className="font-medium">{studentName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    <span className="font-medium">Submitted: {formatDate(submissionDetail.submitted_at)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 min-w-[120px]">
                                <div className="text-3xl font-black text-indigo-700 text-center">
                                    {currentTotalScore}
                                </div>
                                <div className="text-xs text-indigo-500 font-bold uppercase tracking-wide text-center mt-1">Total Points</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Questions Review */}
                <div className="space-y-4">
                    {submissionDetail.assignment.questions.map((q, idx) => {
                        const studentAns = submissionDetail.answers.find(a => a.question_id === q.id);
                        const graded = gradedAnswers[q.id] || { points: 0, isCorrect: false };

                        return (
                            <div key={q.id} className={`bg-white p-6 rounded-xl border-2 transition-all ${graded.isCorrect ? 'border-green-200' : 'border-red-200'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="bg-slate-100 text-slate-600 rounded-md px-2.5 py-1 font-bold text-sm border border-slate-200">
                                            Q{idx + 1}
                                        </div>
                                        <span className="font-semibold text-slate-800 text-base">{q.text}</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-500 ml-4 whitespace-nowrap">
                                        {q.points} pt{q.points !== 1 && 's'}
                                    </div>
                                </div>

                                <div className="mb-4 pl-12">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Student Answer:</div>
                                    <div className={`p-4 rounded-lg font-medium shadow-sm border ${graded.isCorrect ? 'bg-green-50 text-green-900 border-green-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
                                        {q.question_type === 'MULTIPLE_CHOICE' || q.question_type === 'TRUE_FALSE'
                                            ? q.options.find(o => o.id === studentAns?.selected_option_id)?.text || "No Answer Provided"
                                            : studentAns?.text_answer || "No Answer Provided"
                                        }
                                    </div>
                                    {!graded.isCorrect && (q.question_type === 'MULTIPLE_CHOICE' || q.question_type === 'TRUE_FALSE') && (
                                        <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Correct Answer:
                                            </div>
                                            <div className="text-sm font-semibold text-slate-800">
                                                {q.options.find(o => o.is_correct)?.text || "Check Answer Key"}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Grading Controls */}
                                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2 pl-12">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={graded.isCorrect}
                                            onChange={() => toggleAnswerCorrectness(q.id, q.points)}
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                                        />
                                        <span className="font-semibold text-sm text-slate-700">Mark as Correct</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-slate-600">Points Awarded:</span>
                                        <input
                                            type="number"
                                            value={graded.points}
                                            onChange={(e) => setGradedAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], points: Number(e.target.value) } }))}
                                            className="w-16 px-2 py-1.5 border border-slate-300 rounded-md text-center font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            min="0"
                                            max={q.points}
                                        />
                                        <span className="text-sm text-slate-500">/ {q.points}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Final Grade Input & Save */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-indigo-600" />
                        Final Grading & Comments
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Final Score / Grade</label>
                            <input
                                type="text"
                                placeholder="E.g. A, 95/100, Good"
                                value={finalGrade}
                                onChange={(e) => setFinalGrade(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Teacher Comments</label>
                            <textarea
                                rows={3}
                                placeholder="Provide constructive feedback..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 resize-none"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setIsGradingMode(false)}
                            className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveGrade}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Save Grade
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER MAIN VIEW
    // ==========================================
    if (loading) return <div className="p-12 flex justify-center items-center"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-4 font-medium group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Grading Dashboard</span>
                </button>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-1">Student Grading Overview</h1>
                        <p className="text-sm text-slate-500">Manage assignments and review submissions</p>
                    </div>
                    {studentName && (
                        <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-100">
                            <div className="bg-indigo-100 p-2 rounded-lg">
                                <User className="w-5 h-5 text-indigo-700" />
                            </div>
                            <div>
                                <div className="text-xs text-indigo-500 font-bold uppercase tracking-wider">Student</div>
                                <div className="text-base font-bold text-indigo-900">{studentName}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {(() => {
                    const quizItems = overviewItems.filter(item => item.has_questions);
                    const projectItems = overviewItems.filter(item => !item.has_questions);
                    const currentList = activeMainTab === 'quiz' ? quizItems : projectItems;

                    const notStartedCount = currentList.filter(item => !item.submission || (item.submission.status !== 'SUBMITTED' && item.submission.status !== 'GRADED')).length;
                    const completedCount = currentList.filter(item => item.submission && item.submission.status === 'SUBMITTED').length;
                    const gradedCount = currentList.filter(item => item.submission && item.submission.status === 'GRADED').length;

                    return (
                        <>
                            {/* Top Level Tabs (Quiz / Project) */}
                            <div className="flex border-b border-slate-200 bg-slate-50/50">
                                <button
                                    onClick={() => { setActiveMainTab('quiz'); setActiveSubTab('not_started'); }}
                                    className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeMainTab === 'quiz'
                                        ? 'border-indigo-600 text-indigo-600 bg-white'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <ListTodo className="w-5 h-5" />
                                    Quiz Submissions ({quizItems.length})
                                </button>
                                <button
                                    onClick={() => { setActiveMainTab('project'); setActiveSubTab('not_started'); }}
                                    className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeMainTab === 'project'
                                        ? 'border-indigo-600 text-indigo-600 bg-white'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <Award className="w-5 h-5" />
                                    Project Assignments ({projectItems.length})
                                </button>
                            </div>

                            <div className="p-6">
                                {/* Sub Tabs */}
                                <div className="flex space-x-1 bg-slate-100/80 p-1.5 rounded-xl mb-6 max-w-2xl mx-auto md:mx-0">
                                    <button
                                        onClick={() => setActiveSubTab('not_started')}
                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'not_started'
                                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                                            }`}
                                    >
                                        Assigned / Not Started ({notStartedCount})
                                    </button>
                                    <button
                                        onClick={() => setActiveSubTab('completed')}
                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'completed'
                                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                                            }`}
                                    >
                                        Completed By Student ({completedCount})
                                    </button>
                                    <button
                                        onClick={() => setActiveSubTab('graded')}
                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'graded'
                                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                                            }`}
                                    >
                                        Graded ({gradedCount})
                                    </button>
                                </div>

                                {/* Grids */}
                                {activeSubTab === 'not_started' && renderAssignedNotStartedGrid()}
                                {activeSubTab === 'completed' && renderCompletedByStudentGrid()}
                                {activeSubTab === 'graded' && renderGradedGrid()}
                            </div>
                        </>
                    );
                })()}
            </div>
        </div>
    );
};

export default StudentGrading;
