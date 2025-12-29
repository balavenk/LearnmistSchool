import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

interface Assignment {
    id: number;
    title: string;
    description: string;
    course?: string; // Not directly in Assignment model, maybe need subject
    due_date: string;
    // status: 'Pending' | 'Submitted' | 'Graded'; // Backend status is about assignment itself
    // We need submission status. 
    // Assignment model: { id, title, description, due_date, status, teacher_id, class_id, subject_id }
    // We need to fetch submissions to know if it's submitted.
    // simpler for now: just show assignments.
    status?: string; // Placeholder
}

interface Submission {
    assignment_id: number;
    status: string;
    grade?: string;
}

const StudentAssignments: React.FC = () => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]); // To track status
    const [loading, setLoading] = useState(true);

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const [assignmentsRes, submissionsRes] = await Promise.all([
                api.get('/student/assignments/'),
                api.get('/student/submissions/')
            ]);
            setAssignments(assignmentsRes.data);
            setSubmissions(submissionsRes.data);
        } catch (error) {
            console.error("Failed to fetch assignments data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, []);

    const handleSubmit = async (assignmentId: number) => {
        try {
            await api.post('/student/submissions/', {
                assignment_id: assignmentId,
                content: "Submitting assignment..." // Schema might need content? Checked schema: SubmissionCreate(assignment_id). content optional? 
                // Wait, checked schema.py earlier, didn't see content field in snippets. 
                // Let's assume standard submission.
            });
            alert("Assignment submitted successfully!");
            // Update local state or re-fetch
            setSubmissions([...submissions, { assignment_id: assignmentId, status: 'SUBMITTED' }]);
        } catch (error) {
            console.error("Failed to submit", error);
            alert("Failed to submit assignment.");
        }
    };

    const getStatus = (assignmentId: number) => {
        const sub = submissions.find(s => s.assignment_id === assignmentId);
        if (sub) return sub.status;
        return 'PENDING';
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">My Assignments</h1>
                <p className="text-slate-500 mt-1">View upcoming and past works.</p>
            </div>

            <div className="space-y-4">
                {loading ? <p>Loading assignments...</p> : assignments.map((assignment) => {
                    const status = getStatus(assignment.id);
                    return (
                        <div key={assignment.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center hover:shadow-md transition-all">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-lg font-bold text-slate-900">{assignment.title}</h3>
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold 
                                        ${status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                            status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                                                'bg-green-100 text-green-800'}`}>
                                        {status}
                                    </span>
                                </div>
                                <p className="text-slate-600 text-sm mb-2">{assignment.description}</p>
                                <div className="text-xs text-slate-500 flex gap-4">
                                    {/* <span><strong>Course:</strong> {assignment.course}</span> */}
                                    <span><strong>Due:</strong> {new Date(assignment.due_date).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="mt-4 md:mt-0 md:ml-6 flex items-center gap-4">
                                <button
                                    onClick={() => handleSubmit(assignment.id)}
                                    disabled={status === 'SUBMITTED'}
                                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${status === 'SUBMITTED'
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        }`}
                                >
                                    {status === 'SUBMITTED' ? 'Submitted' : 'Start / Submit'}
                                </button>
                            </div>
                        </div>
                    );
                })}
                {!loading && assignments.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                        No assignments found for your class.
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentAssignments;
