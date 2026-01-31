import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    const [loadingDetail, setLoadingDetail] = useState(false);

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
            setLoadingDetail(true);
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

            alert("Grade saved successfully!");
            setSelectedSubmissionId(null);
            fetchSubmissions(); // Refresh list
        } catch (error) {
            console.error("Failed to save grade", error);
            alert("Failed to save grade.");
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
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600">← Back</button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Grade Assignments</h1>
                    {studentName && <p className="text-indigo-600 font-medium mt-1">Student: {studentName}</p>}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('quiz')}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'quiz' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Quiz
                </button>
                <button
                    onClick={() => setActiveTab('project')}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'project' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Project Assignments
                </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: List of Submissions */}
                <div className="lg:col-span-1 space-y-4">
                    {filteredSubmissions.length === 0 ? (
                        <div className="text-slate-400 text-sm">No pending submissions found for {activeTab}.</div>
                    ) : (
                        filteredSubmissions.map(sub => (
                            <div
                                key={sub.id}
                                onClick={() => fetchSubmissionDetail(sub.id)}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedSubmissionId === sub.id
                                    ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                                    : 'bg-white border-slate-200 hover:border-indigo-300'
                                    }`}
                            >
                                <div className="font-semibold text-slate-800">{sub.assignment.title}</div>
                                <div className="text-xs text-slate-500 mt-1">Submitted: {new Date(sub.submitted_at).toLocaleDateString()}</div>
                                <div className="text-xs font-medium text-orange-600 mt-2 bg-orange-50 inline-block px-2 py-1 rounded">
                                    {sub.status}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right: Grading Area */}
                <div className="lg:col-span-2">
                    {selectedSubmissionId && submissionDetail ? (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
                            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{submissionDetail.assignment.title}</h2>
                                    <p className="text-sm text-slate-500 mt-1">{submissionDetail.assignment.description}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-indigo-600">{currentTotalScore} <span className="text-sm text-slate-400 font-normal">pts</span></div>
                                    <div className="text-xs text-slate-400">Total Score</div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {submissionDetail.assignment.questions.map((q, idx) => {
                                    const studentAns = submissionDetail.answers.find(a => a.question_id === q.id);
                                    const graded = gradedAnswers[q.id] || { points: 0, isCorrect: false };

                                    return (
                                        <div key={q.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-medium text-slate-700">Q{idx + 1}. {q.text}</span>
                                                <span className="text-xs text-slate-400 bg-slate-200 px-2 py-1 rounded">{q.points} pts</span>
                                            </div>

                                            {/* Answer Display */}
                                            <div className="mb-3">
                                                <div className="text-sm text-slate-500 mb-1">Student Answer:</div>
                                                <div className={`text-sm font-medium p-2 rounded ${graded.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                                    {q.question_type === 'MULTIPLE_CHOICE' || q.question_type === 'TRUE_FALSE'
                                                        ? q.options.find(o => o.id === studentAns?.selected_option_id)?.text || "No Answer"
                                                        : studentAns?.text_answer || "No Answer"
                                                    }
                                                </div>
                                                {/* Correct Answer Display (if simple types) */}
                                                {!graded.isCorrect && (
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        Correct: {q.options.find(o => o.is_correct)?.text || "Check Key"}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Grading Controls */}
                                            <div className="flex items-center gap-4 border-t border-slate-200 pt-3">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={graded.isCorrect}
                                                        onChange={() => toggleAnswerCorrectness(q.id, q.points)}
                                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                                    />
                                                    <span className="text-sm text-slate-600">Mark Correct</span>
                                                </label>
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <span className="text-sm text-slate-500">Points:</span>
                                                    <input
                                                        type="number"
                                                        value={graded.points}
                                                        onChange={(e) => setGradedAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], points: Number(e.target.value) } }))}
                                                        className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Final Grade Input */}
                            <div className="pt-6 border-t border-slate-200">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Final Grade / Feedback</label>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-1">
                                        <input
                                            type="text"
                                            placeholder="Letter Grade (A, B...)"
                                            value={finalGrade}
                                            onChange={(e) => setFinalGrade(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <input
                                            type="text"
                                            placeholder="Optional Feedback..."
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={handleSaveGrade}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md transition-colors"
                                    >
                                        Save Grade
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 min-h-[300px]">
                            {selectedSubmissionId ? "Loading details..." : "Select a submission to grade"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentGrading;
