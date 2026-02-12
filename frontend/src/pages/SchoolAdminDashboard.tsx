import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Users, BookOpen, GraduationCap } from 'lucide-react';

const SchoolAdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        total_students: 0,
        total_teachers: 0,
        total_classes: 0,
        school_name: ''
    });
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role') || '';
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/school-admin/dashboard/stats');
                setStats(res.data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-6">
<div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Welcome {username} <span className='inline-block text-sm'>({role.replace('_', ' ')})</span>
                            </h1>
                {stats.school_name && (
                    <p className="text-sm text-slate-600 mt-1">Managing: <span className="font-semibold text-indigo-600">{stats.school_name}</span></p>
                )}
            </div>
        </div>
         <div className="text-right">
        <p className="text-sm text-slate-500">Today</p>
        <p className="text-lg font-semibold text-slate-700">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
    </div>
    </div>
</div>    
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Students Card */}
                <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-500 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-white/90 text-sm font-medium mb-1">Total Students</p>
                            <h3 className="text-3xl font-bold text-white mb-2">{stats.total_students}</h3>
                            <div className="flex items-center gap-1 text-white/80 text-xs">
                                <Users className="w-3 h-3" />
                                <span>Enrolled</span>
                            </div>
                        </div>
                        <div className="bg-white/25 backdrop-blur-sm p-3 rounded-lg">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>

                {/* Total Teachers Card */}
                <div className="bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-500 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-white/90 text-sm font-medium mb-1">Total Teachers</p>
                            <h3 className="text-3xl font-bold text-white mb-2">{stats.total_teachers}</h3>
                            <div className="flex items-center gap-1 text-white/80 text-xs">
                                <BookOpen className="w-3 h-3" />
                                <span>Teaching</span>
                            </div>
                        </div>
                        <div className="bg-white/25 backdrop-blur-sm p-3 rounded-lg">
                            <BookOpen className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>

                {/* Classes Card */}
                <div className="bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-white/90 text-sm font-medium mb-1">Classes</p>
                            <h3 className="text-3xl font-bold text-white mb-2">{stats.total_classes}</h3>
                            <div className="flex items-center gap-1 text-white/80 text-xs">
                                <GraduationCap className="w-3 h-3" />
                                <span>Active</span>
                            </div>
                        </div>
                        <div className="bg-white/25 backdrop-blur-sm p-3 rounded-lg">
                            <GraduationCap className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchoolAdminDashboard;
