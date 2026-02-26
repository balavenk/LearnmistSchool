import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { ListTodo, Award, CheckCircle2, Clock } from 'lucide-react';
import TakeQuiz from './TakeQuiz';
import ReviewQuiz from './ReviewQuiz';

interface Assignment {
    id: number;
    title: string;
    description: string;
    subject_name: string;
    teacher_name: string;
    due_date: string;
    status: string;
    exam_type?: string;
}

interface Submission {
    id: number;
    status: string;
    grade: string | null;
    feedback: string | null;
    submitted_at: string;
}

interface StudentAssignmentOverviewItem {
    assignment: Assignment;
    submission: Submission | null;
    has_questions: boolean;
}

const StudentAssignments: React.FC = () => {
    const [activeMainTab, setActiveMainTab] = useState<'quiz' | 'project'>('quiz');
    const [activeSubTab, setActiveSubTab] = useState<'open' | 'completed' | 'graded'>('open');
    const [overviewItems, setOverviewItems] = useState<StudentAssignmentOverviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [takingQuizId, setTakingQuizId] = useState<number | null>(null);
    const [reviewSubmissionId, setReviewSubmissionId] = useState<number | null>(null);

    const fetchOverview = async () => {
        try {
            setLoading(true);
            const response = await api.get('/student/assignments/overview');
            console.log("DEBUG Student Assignments Overview:", response.data);
            setOverviewItems(response.data);
        } catch (error) {
            console.error("Failed to fetch assignments overview", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview();
    }, []);

    const handleTakeTest = (assignmentId: number) => {
        setTakingQuizId(assignmentId);
    };

    const handleQuizClose = () => {
        setTakingQuizId(null);
    };

    const handleQuizSubmitSuccess = () => {
        setTakingQuizId(null);
        fetchOverview(); // Refresh to move it to completed
    };

    const handleReview = (submissionId: number) => {
        setReviewSubmissionId(submissionId);
    };

    const handleReviewClose = () => {
        setReviewSubmissionId(null);
    };

    // Calculate dynamic lists and counts based on selected main tab
    const isQuiz = (item: StudentAssignmentOverviewItem) => {
        return item.has_questions ||
            item.assignment.exam_type?.toLowerCase() === 'quiz' ||
            item.assignment.title.toLowerCase().includes('quiz');
    };

    const quizItems = overviewItems.filter(isQuiz);
    const projectItems = overviewItems.filter(item => !isQuiz(item));
    const currentMainList = activeMainTab === 'quiz' ? quizItems : projectItems;

    const openItems = currentMainList.filter(item => {
        const status = item.submission?.status;
        return !status || (status !== 'SUBMITTED' && status !== 'GRADED');
    });
    const completedItems = currentMainList.filter(item => item.submission?.status === 'SUBMITTED');
    const gradedItems = currentMainList.filter(item => item.submission?.status === 'GRADED');

    const renderOpenGrid = () => (
        <div className="divide-y divide-slate-100">
            {openItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No open assignments!</div>
            ) : (
                openItems.map((item) => (
                    <div key={item.assignment.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                        <div className="col-span-2 font-medium text-slate-700">
                            {item.assignment.subject_name || <span className="text-slate-400 italic">General</span>}
                        </div>
                        <div className="col-span-4">
                            <h4 className="font-semibold text-slate-900">{item.assignment.title}</h4>
                            {item.assignment.description && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">{item.assignment.description}</p>
                            )}
                        </div>
                        <div className="col-span-2 text-sm text-slate-600">{item.assignment.teacher_name}</div>
                        <div className="col-span-2 text-sm text-slate-600">{new Date(item.assignment.due_date).toLocaleDateString()}</div>
                        <div className="col-span-2 text-right">
                            <button
                                onClick={() => handleTakeTest(item.assignment.id)}
                                className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors"
                            >
                                Take {activeMainTab === 'quiz' ? 'Test' : 'Project'}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderCompletedGrid = () => (
        <div className="divide-y divide-slate-100">
            {completedItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No completed assignments yet.</div>
            ) : (
                completedItems.map((item) => (
                    <div key={item.assignment.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                        <div className="col-span-2 font-medium text-slate-700">
                            {item.assignment.subject_name || <span className="text-slate-400 italic">General</span>}
                        </div>
                        <div className="col-span-4">
                            <h4 className="font-semibold text-slate-900">{item.assignment.title}</h4>
                            {item.assignment.description && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">{item.assignment.description}</p>
                            )}
                        </div>
                        <div className="col-span-2 text-sm text-slate-600">{item.assignment.teacher_name}</div>
                        <div className="col-span-2 text-sm text-slate-600">{new Date(item.assignment.due_date).toLocaleDateString()}</div>
                        <div className="col-span-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Completed
                                </span>
                                {item.submission?.id && (
                                    <button
                                        onClick={() => handleReview(item.submission!.id)}
                                        className="text-indigo-600 hover:text-indigo-900 text-sm font-semibold ml-2"
                                    >
                                        Review
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderGradedGrid = () => (
        <div className="divide-y divide-slate-100">
            {/* Extended Header for Graded Grid since it needs Score */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-2">Subject</div>
                <div className="col-span-3">Assignment Name</div>
                <div className="col-span-2">Teacher</div>
                <div className="col-span-2">Due Date</div>
                <div className="col-span-1 text-center font-bold">Score</div>
                <div className="col-span-2 text-right">Action</div>
            </div>
            {gradedItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No graded assignments yet.</div>
            ) : (
                gradedItems.map((item) => (
                    <div key={item.assignment.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                        <div className="col-span-2 font-medium text-slate-700">
                            {item.assignment.subject_name || <span className="text-slate-400 italic">General</span>}
                        </div>
                        <div className="col-span-3">
                            <h4 className="font-semibold text-slate-900">{item.assignment.title}</h4>
                            {item.assignment.description && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">{item.assignment.description}</p>
                            )}
                        </div>
                        <div className="col-span-2 text-sm text-slate-600">{item.assignment.teacher_name}</div>
                        <div className="col-span-2 text-sm text-slate-600">{new Date(item.assignment.due_date).toLocaleDateString()}</div>
                        <div className="col-span-1 text-center font-black text-indigo-700 bg-indigo-50 py-1 rounded-md border border-indigo-100">
                            {item.submission?.grade || 'N/A'}
                        </div>
                        <div className="col-span-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                                {item.submission?.id && (
                                    <button
                                        onClick={() => handleReview(item.submission!.id)}
                                        className="text-indigo-600 hover:text-indigo-900 text-sm font-semibold ml-2"
                                    >
                                        Review Feedback
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {takingQuizId && (
                <TakeQuiz
                    assignmentId={takingQuizId}
                    onClose={handleQuizClose}
                    onSubmitSuccess={handleQuizSubmitSuccess}
                />
            )}

            {reviewSubmissionId && (
                <ReviewQuiz
                    submissionId={reviewSubmissionId}
                    onClose={handleReviewClose}
                />
            )}

            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Assignments</h1>
                <p className="text-slate-500 mt-1 text-lg">Manage and track your school work progress.</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                    {/* Top Level Tabs (Quiz / Project) */}
                    <div className="flex border-b border-slate-200 bg-slate-50/50">
                        <button
                            onClick={() => { setActiveMainTab('quiz'); setActiveSubTab('open'); }}
                            className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeMainTab === 'quiz'
                                ? 'border-indigo-600 text-indigo-600 bg-white'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <ListTodo className="w-5 h-5" />
                            Quizzes ({quizItems.length})
                        </button>
                        <button
                            onClick={() => { setActiveMainTab('project'); setActiveSubTab('open'); }}
                            className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeMainTab === 'project'
                                ? 'border-indigo-600 text-indigo-600 bg-white'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <Award className="w-5 h-5" />
                            Projects / Assignments ({projectItems.length})
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Sub Tabs */}
                        <div className="flex space-x-1 bg-slate-100/80 p-1.5 rounded-xl mb-6 max-w-3xl mx-auto md:mx-0">
                            <button
                                onClick={() => setActiveSubTab('open')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeSubTab === 'open'
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                                    }`}
                            >
                                <Clock className="w-4 h-4" /> Open ({openItems.length})
                            </button>
                            <button
                                onClick={() => setActiveSubTab('completed')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeSubTab === 'completed'
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                                    }`}
                            >
                                <CheckCircle2 className="w-4 h-4" /> Completed ({completedItems.length})
                            </button>
                            <button
                                onClick={() => setActiveSubTab('graded')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeSubTab === 'graded'
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                                    }`}
                            >
                                <Award className="w-4 h-4" /> Graded ({gradedItems.length})
                            </button>
                        </div>

                        {/* Standard Grid Header for Open and Completed */}
                        {activeSubTab !== 'graded' && (
                            <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-t-xl">
                                <div className="col-span-2">Subject</div>
                                <div className="col-span-4">Assignment Name</div>
                                <div className="col-span-2">Teacher</div>
                                <div className="col-span-2">Due Date</div>
                                <div className="col-span-2 text-right">Action</div>
                            </div>
                        )}

                        {/* Grid Body */}
                        <div className={`border ${activeSubTab !== 'graded' ? 'border-t-0 rounded-b-xl' : 'rounded-xl'} border-slate-200`}>
                            {activeSubTab === 'open' && renderOpenGrid()}
                            {activeSubTab === 'completed' && renderCompletedGrid()}
                            {activeSubTab === 'graded' && renderGradedGrid()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentAssignments;
