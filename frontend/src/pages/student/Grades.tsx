import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

interface SubjectStats {
    subject_id: number;
    subject_name: string;
    total_assignments: number;
    completed_assignments: number;
    pending_assignments: number;
}

const StudentGrades: React.FC = () => {
    const [stats, setStats] = useState<SubjectStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGrades = async () => {
            try {
                const response = await api.get('/student/grades');
                setStats(response.data);
            } catch (error) {
                console.error("Failed to fetch grades", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGrades();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">My Grades</h1>
                <p className="text-slate-500 mt-1">Track your progress across all subjects.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
                        No subjects found.
                    </div>
                ) : (
                    stats.map((subject) => {
                        const progress = subject.total_assignments > 0
                            ? Math.round((subject.completed_assignments / subject.total_assignments) * 100)
                            : 0;

                        return (
                            <div key={subject.subject_id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                        {subject.total_assignments} Assignments
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 mb-1">{subject.subject_name}</h3>
                                <p className="text-sm text-slate-500 mb-6">Subject Progress</p>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-slate-700">Completion</span>
                                            <span className="text-slate-900">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div
                                                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Completed</p>
                                            <p className="text-xl font-bold text-green-600">{subject.completed_assignments}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Pending</p>
                                            <p className="text-xl font-bold text-orange-500">{subject.pending_assignments}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default StudentGrades;
