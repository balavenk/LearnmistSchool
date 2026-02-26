import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

interface Assignment {
    id: number;
    title: string;
    description: string;
    subject_name: string;
    teacher_name: string; // From API enrichment
    due_date: string;
    status: string; // 'DRAFT', 'PUBLISHED'
}

import TakeQuiz from './TakeQuiz';
import ReviewQuiz from './ReviewQuiz';

const StudentAssignments: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'open' | 'completed'>('open');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [takingQuizId, setTakingQuizId] = useState<number | null>(null);
    const [reviewSubmissionId, setReviewSubmissionId] = useState<number | null>(null);

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const endpoint = activeTab === 'open' ? '/api/student/assignments/open' : '/api/student/assignments/completed';
            const response = await api.get(endpoint);
            setAssignments(response.data);
        } catch (error) {
            console.error("Failed to fetch assignments", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, [activeTab]);

    const handleTakeTest = (assignmentId: number) => {
        setTakingQuizId(assignmentId);
    };

    const handleQuizClose = () => {
        setTakingQuizId(null);
    };

    const handleQuizSubmitSuccess = () => {
        setTakingQuizId(null);
        fetchAssignments(); // Refresh to move it to completed
    };

    const handleReview = (submissionId: number) => {
        setReviewSubmissionId(submissionId);
    };

    const handleReviewClose = () => {
        setReviewSubmissionId(null);
    };

    return (
        <div className="space-y-6">
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
                <h1 className="text-3xl font-bold text-slate-900">My Assignments</h1>
                <p className="text-slate-500 mt-1">Manage and track your school work.</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('open')}
                    className={`pb-4 px-6 text-sm font-medium transition-colors relative ${activeTab === 'open'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Open Assignments
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`pb-4 px-6 text-sm font-medium transition-colors relative ${activeTab === 'completed'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Completed
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Grid Header */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-2">Subject</div>
                    <div className="col-span-4">Assignment Name</div>
                    <div className="col-span-2">Teacher</div>
                    <div className="col-span-2">Due Date</div>
                    <div className="col-span-2 text-right">Action</div>
                </div>

                {/* Grid Content */}
                <div className="divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading assignments...</div>
                    ) : assignments.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            {activeTab === 'open' ? 'No open assignments!' : 'No completed assignments yet.'}
                        </div>
                    ) : (
                        assignments.map((assignment) => (
                            <div key={assignment.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                                <div className="col-span-2 font-medium text-slate-700">
                                    {assignment.subject_name || <span className="text-slate-400 italic">General</span>}
                                </div>
                                <div className="col-span-4">
                                    <h4 className="font-semibold text-slate-900">{assignment.title}</h4>
                                    {assignment.description && (
                                        <p className="text-xs text-slate-500 truncate mt-0.5">{assignment.description}</p>
                                    )}
                                </div>
                                <div className="col-span-2 text-sm text-slate-600">
                                    {assignment.teacher_name}
                                </div>
                                <div className="col-span-2 text-sm text-slate-600">
                                    {new Date(assignment.due_date).toLocaleDateString()}
                                </div>
                                <div className="col-span-2 text-right">
                                    {activeTab === 'open' ? (
                                        <button
                                            onClick={() => handleTakeTest(assignment.id)}
                                            className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors"
                                        >
                                            Take Test
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Completed
                                            </span>
                                            {(assignment as any).submission_id && (
                                                <button
                                                    onClick={() => handleReview((assignment as any).submission_id)}
                                                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                                >
                                                    Review
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentAssignments;
