import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

interface ClassStats {
    id: number;
    name: string;
    section: string;
    student_count: number;
    grade_name: string;
}

interface DashboardStats {
    total_students: number;
    total_classes: number;
    classes: ClassStats[];
}

const TeacherDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/teacher/dashboard/stats');
                setStats(res.data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900">Teacher Dashboard</h1>
                <button
                    onClick={() => navigate('/teacher/assignments')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                    Manage Assignments
                </button>
            </div>

            {/* Overview Stats (Optional, strictly not requested but good practice) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <div className="text-sm text-indigo-600 font-medium">Total Classes</div>
                    <div className="text-2xl font-bold text-indigo-900">{stats?.total_classes || 0}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <div className="text-sm text-purple-600 font-medium">Total Students</div>
                    <div className="text-2xl font-bold text-purple-900">{stats?.total_students || 0}</div>
                </div>
            </div>

            <h2 className="text-xl font-bold text-slate-800 pt-4">Your Classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats?.classes.length === 0 ? (
                    <div className="col-span-full text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                        You have no assigned classes.
                    </div>
                ) : (
                    stats?.classes.map((cls) => (
                        <div key={cls.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{cls.name}</h3>
                                    <p className="text-slate-500 text-sm mt-1">{cls.grade_name} • Section {cls.section}</p>
                                </div>
                                <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                    {cls.name.substring(0, 1)}
                                </div>
                            </div>

                            <div className="flex justify-between text-sm text-slate-600 border-t border-slate-100 pt-4 mt-4">
                                <span className="flex items-center gap-1">
                                    👥 {cls.student_count} Students
                                </span>
                                <button
                                    onClick={() => navigate('/teacher/students')}
                                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                    View Class →
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TeacherDashboard;
