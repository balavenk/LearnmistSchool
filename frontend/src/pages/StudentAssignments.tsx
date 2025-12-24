import React from 'react';

interface Assignment {
    id: number;
    title: string;
    description: string;
    course: string;
    dueDate: string;
    status: 'Pending' | 'Submitted' | 'Graded';
    grade?: string;
}

const MOCK_STUDENT_ASSIGNMENTS: Assignment[] = [
    { id: 1, title: 'Algebra Quiz 1', description: 'Complete questions 1-10 on page 42.', course: 'Math 101', dueDate: '2024-12-30', status: 'Pending' },
    { id: 2, title: 'History Essay', description: 'Submit your essay on the Industrial Revolution.', course: 'History 202', dueDate: '2025-01-15', status: 'Pending' },
    { id: 3, title: 'Science Lab Report', description: 'Upload your lab report from Tuesday.', course: 'Biology 101', dueDate: '2024-12-20', status: 'Graded', grade: 'A' },
    { id: 4, title: 'English Reading', description: 'Read Chapter 4 of To Kill a Mockingbird.', course: 'English Lit', dueDate: '2024-12-25', status: 'Submitted' },
];

const StudentAssignments: React.FC = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">My Assignments</h1>
                <p className="text-slate-500 mt-1">View upcoming and past works.</p>
            </div>

            <div className="space-y-4">
                {MOCK_STUDENT_ASSIGNMENTS.map((assignment) => (
                    <div key={assignment.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center hover:shadow-md transition-all">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg font-bold text-slate-900">{assignment.title}</h3>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold 
                                    ${assignment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                        assignment.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                                            'bg-green-100 text-green-800'}`}>
                                    {assignment.status}
                                </span>
                            </div>
                            <p className="text-slate-600 text-sm mb-2">{assignment.description}</p>
                            <div className="text-xs text-slate-500 flex gap-4">
                                <span><strong>Course:</strong> {assignment.course}</span>
                                <span><strong>Due:</strong> {assignment.dueDate}</span>
                            </div>
                        </div>

                        <div className="mt-4 md:mt-0 md:ml-6 flex items-center gap-4">
                            {assignment.status === 'Graded' ? (
                                <div className="text-center">
                                    <div className="text-sm text-slate-500 uppercase tracking-wide">Grade</div>
                                    <div className="text-2xl font-bold text-indigo-600">{assignment.grade}</div>
                                </div>
                            ) : (
                                <button
                                    disabled={assignment.status === 'Submitted'}
                                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${assignment.status === 'Submitted'
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        }`}
                                >
                                    {assignment.status === 'Submitted' ? 'Submitted' : 'Start / Submit'}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StudentAssignments;
