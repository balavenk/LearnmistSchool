import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, User, ListTodo, CheckCircle2, Award,
    Calendar, FileText, ChevronRight,
    CheckCircle, Star,
    ClipboardList, PenTool
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';
import type { ColumnDef } from '@tanstack/react-table';

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

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

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

    // Helper for date formatting
    const formatDate = useCallback((dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }, []);

    // --- Column Definitions ---

    const notStartedColumns = useMemo<ColumnDef<GradingOverviewItem>[]>(() => [
        {
            header: 'Assignment Name',
            accessorKey: 'assignment.title',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-white transition-colors">
                        <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="font-bold text-slate-900">{row.original.assignment.title}</span>
                </div>
            )
        },
        {
            header: 'Subject',
            accessorKey: 'assignment.subject_name',
            cell: ({ row }) => (
                <span className="font-medium text-slate-600">{row.original.assignment.subject_name || 'General'}</span>
            )
        },
        {
            header: 'Date Assigned',
            accessorKey: 'assignment.due_date',
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-slate-500 font-medium whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(row.original.assignment.due_date)}
                </div>
            )
        },
        {
            header: 'Status',
            id: 'status',
            cell: () => (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200">
                    Not Started
                </span>
            )
        }
    ], [formatDate]);

    const completedColumns = useMemo<ColumnDef<GradingOverviewItem>[]>(() => [
        {
            header: 'Assignment Name',
            accessorKey: 'assignment.title',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        <ClipboardList className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="font-bold text-slate-900">{row.original.assignment.title}</span>
                </div>
            )
        },
        {
            header: 'Subject',
            accessorKey: 'assignment.subject_name',
            cell: ({ row }) => (
                <span className="font-medium text-slate-600">{row.original.assignment.subject_name || 'General'}</span>
            )
        },
        {
            header: 'Assigned',
            accessorKey: 'assignment.due_date',
            cell: ({ row }) => (
                <div className="text-slate-500 text-xs font-semibold">
                    {formatDate(row.original.assignment.due_date)}
                </div>
            )
        },
        {
            header: 'Completed',
            accessorKey: 'submission.submitted_at',
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-indigo-600 font-bold whitespace-nowrap">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {formatDate(row.original.submission?.submitted_at)}
                </div>
            )
        },
        {
            header: 'Auto Score',
            id: 'auto_score',
            cell: () => (
                <span className="text-xs font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                    Pending
                </span>
            )
        },
        {
            header: 'Action',
            id: 'action',
            cell: ({ row }) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (row.original.submission) fetchSubmissionDetail(row.original.submission.id);
                    }}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm shadow-indigo-100"
                >
                    <PenTool className="w-3 h-3" /> Grade
                </button>
            )
        }
    ], [formatDate]);

    const gradedColumns = useMemo<ColumnDef<GradingOverviewItem>[]>(() => [
        {
            header: 'Assignment Name',
            accessorKey: 'assignment.title',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg border border-green-100">
                        <Award className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="font-bold text-slate-900">{row.original.assignment.title}</span>
                </div>
            )
        },
        {
            header: 'Completed',
            accessorKey: 'submission.submitted_at',
            cell: ({ row }) => (
                <div className="text-slate-500 text-xs font-medium">
                    {formatDate(row.original.submission?.submitted_at)}
                </div>
            )
        },
        {
            header: 'Score',
            accessorKey: 'submission.grade',
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 font-black text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                    <Star className="w-3.5 h-3.5 fill-green-600" />
                    {row.original.submission?.grade || '-'}
                </div>
            )
        },
        {
            header: 'Comments',
            accessorKey: 'submission.feedback',
            cell: ({ row }) => (
                <div className="text-slate-500 text-xs italic max-w-[150px] truncate" title={row.original.submission?.feedback}>
                    {row.original.submission?.feedback || 'No comments'}
                </div>
            )
        },
        {
            header: 'Action',
            id: 'action',
            cell: ({ row }) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (row.original.submission) fetchSubmissionDetail(row.original.submission.id);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-black uppercase tracking-widest flex items-center gap-1"
                >
                    Edit Grade <ChevronRight className="w-3.5 h-3.5" />
                </button>
            )
        }
    ], [formatDate]);

    const mobileCardRender = useCallback((item: GradingOverviewItem) => {
        const isCompleted = activeSubTab === 'completed';
        const isGraded = activeSubTab === 'graded';

        return (
            <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100 flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl border shadow-sm ${isGraded ? 'bg-green-50 border-green-100 text-green-600' :
                                isCompleted ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                                    'bg-slate-50 border-slate-100 text-slate-400'
                            }`}>
                            {isGraded ? <Award className="w-5 h-5" /> :
                                isCompleted ? <ClipboardList className="w-5 h-5" /> :
                                    <FileText className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 leading-tight truncate max-w-[180px]">
                                {item.assignment.title}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-0.5">
                                {item.assignment.subject_name || 'General'}
                            </p>
                        </div>
                    </div>
                    {isGraded && (
                        <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200 text-[10px] font-black">
                            <Star className="w-3 h-3 fill-green-600" />
                            {item.submission?.grade}
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-black uppercase tracking-widest">Assigned</span>
                        <span className="text-slate-700 font-bold">{formatDate(item.assignment.due_date)}</span>
                    </div>
                    {item.submission?.submitted_at && (
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-black uppercase tracking-widest">Completed</span>
                            <span className="text-indigo-600 font-black">{formatDate(item.submission.submitted_at)}</span>
                        </div>
                    )}
                </div>

                {(isCompleted || isGraded) && (
                    <button
                        onClick={() => item.submission && fetchSubmissionDetail(item.submission.id)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
                    >
                        {isGraded ? 'Edit Grade' : 'Grade Submission'}
                    </button>
                )}
            </div>
        );
    }, [activeSubTab, formatDate]);

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

    const currentColumns = useMemo(() => {
        if (activeSubTab === 'not_started') return notStartedColumns;
        if (activeSubTab === 'completed') return completedColumns;
        return gradedColumns;
    }, [activeSubTab, notStartedColumns, completedColumns, gradedColumns]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return displayedItems.slice(start, start + pageSize);
    }, [displayedItems, currentPage, pageSize]);

    // ==========================================
    // RENDER GRIDS
    // ==========================================
    // Legacy grids removed

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
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">Student Grading Overview</h1>
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

                                {/* DataTable Integration */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
                                    <DataTable
                                        data={paginatedData}
                                        columns={currentColumns}
                                        isLoading={loading}
                                        mobileCardRender={mobileCardRender}
                                        emptyMessage={`No ${activeSubTab.replace('_', ' ')} assignments found.`}
                                    />

                                    {!loading && displayedItems.length > 0 && (
                                        <PaginationControls
                                            currentPage={currentPage}
                                            totalPages={Math.ceil(displayedItems.length / pageSize)}
                                            totalItems={displayedItems.length}
                                            itemsPerPage={pageSize}
                                            onPageChange={setCurrentPage}
                                            onItemsPerPageChange={(val) => {
                                                setPageSize(val);
                                                setCurrentPage(1);
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        </>
                    );
                })()}
            </div>
        </div>
    );
};

export default StudentGrading;
