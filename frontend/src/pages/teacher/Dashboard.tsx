import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, ClipboardList, Award, ArrowRight, GraduationCap, TrendingUp } from 'lucide-react';

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
    const username = localStorage.getItem('username') || 'Teacher';

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/api/teacher/dashboard/stats');
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
            {/* Welcome Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                            <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                                Welcome back, {username}!
                            </h1>
                            <p className="text-xs md:text-sm text-slate-600 mt-0.5">Here's your overview for today</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="text-left sm:text-right">
                            <p className="text-xs text-slate-500">Today</p>
                            <p className="text-sm md:text-base font-semibold text-slate-700">
                                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Total Classes Card */}
                <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-500 p-5 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/teacher/students')}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-white/90 text-sm font-medium mb-1">Total Classes</p>
                            <h3 className="text-3xl font-bold text-white mb-2">{stats?.total_classes || 0}</h3>
                            <div className="flex items-center gap-1 text-white/80 text-xs">
                                <TrendingUp className="w-3 h-3" />
                                <span>Active</span>
                            </div>
                        </div>
                        <div className="bg-white/25 backdrop-blur-sm p-3 rounded-lg">
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                {/* Total Students Card */}
                <div className="bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-500 p-5 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/teacher/students')}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-white/90 text-sm font-medium mb-1">Total Students</p>
                            <h3 className="text-3xl font-bold text-white mb-2">{stats?.total_students || 0}</h3>
                            <div className="flex items-center gap-1 text-white/80 text-xs">
                                <Users className="w-3 h-3" />
                                <span>Enrolled</span>
                            </div>
                        </div>
                        <div className="bg-white/25 backdrop-blur-sm p-3 rounded-lg">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                {/* Assignments Card */}
                <div className="bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 p-5 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/teacher/assignments')}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-white/90 text-sm font-medium mb-1">Assignments</p>
                            <h3 className="text-3xl font-bold text-white mb-2">{(stats?.classes?.length ?? 0) * 3}</h3>
                            <div className="flex items-center gap-1 text-white/80 text-xs">
                                <ClipboardList className="w-3 h-3" />
                                <span>Created</span>
                            </div>
                        </div>
                        <div className="bg-white/25 backdrop-blur-sm p-3 rounded-lg">
                            <ClipboardList className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                {/* Grading Card */}
                <div className="bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-500 p-5 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/teacher/grading')}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-white/90 text-sm font-medium mb-1">Pending Grading</p>
                            <h3 className="text-3xl font-bold text-white mb-2">0</h3>
                            <div className="flex items-center gap-1 text-white/80 text-xs">
                                <Award className="w-3 h-3" />
                                <span>To Review</span>
                            </div>
                        </div>
                        <div className="bg-white/25 backdrop-blur-sm p-3 rounded-lg">
                            <Award className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            <h2 className="text-lg md:text-xl font-bold text-slate-800 pt-4">Your Classes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {stats?.classes.length === 0 ? (
                    <div className="col-span-full text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                        You have no assigned classes.
                    </div>
                ) : (
                    stats?.classes.map((cls) => (
                        <div key={cls.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                                            <GraduationCap className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">{cls.name}</h3>
                                            <p className="text-slate-500 text-xs">{cls.grade_name}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-indigo-50 px-2 py-1 rounded-md">
                                    <span className="text-xs font-semibold text-indigo-700">Sec {cls.section}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 rounded-lg">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600 font-medium">{cls.student_count} Students</span>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigate('/teacher/students')}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                                >
                                    <Users className="w-4 h-4" />
                                    <span>View Students</span>
                                </button>
                                <button
                                    onClick={() => navigate('/teacher/assignments')}
                                    className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 hover:text-white transition-all group-hover:shadow-md"
                                    title="Manage Assignments"
                                >
                                    <ArrowRight className="w-4 h-4" />
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
