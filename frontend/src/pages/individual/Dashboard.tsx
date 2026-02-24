import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Edit3, Settings as SettingsIcon, Award } from 'lucide-react';
import api from '../../api/axios';

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalQuizzes: 0,
        completedQuizzes: 0
    });
    const username = localStorage.getItem('username');

    useEffect(() => {
        const abortController = new AbortController();
        let isMounted = true;

        // Fetch stats if available, or just mock for now/use list length
        const fetchStats = async () => {
            try {
                const res = await api.get('/individual/quizzes', {
                    signal: abortController.signal
                });
                if (isMounted) {
                    setStats(s => ({ ...s, totalQuizzes: res.data.length }));
                }
            } catch (err: any) {
                if (err.name === 'AbortError' || err.name === 'CanceledError') {
                    // Silently ignore canceled requests (navigation away from page)
                    return;
                }
                console.error(err);
            }
        };
        
        fetchStats();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome, {username}</h1>
            <p className="text-slate-500 mb-8">Manage your personal learning journey.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-700">My Quizzes</h3>
                        <BookOpen className="text-indigo-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats.totalQuizzes}</p>
                    <p className="text-sm text-slate-500">Created quizzes</p>
                </div>

                {/* Placeholder for completed count if we had an endpoint for it easily */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-700">Completed</h3>
                        <Award className="text-green-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">-</p>
                    <p className="text-sm text-slate-500">Quizzes taken</p>
                </div>
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link to="/individual/quizzes" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex items-center space-x-4">
                    <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                        <Edit3 size={24} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Manage Quizzes</h3>
                        <p className="text-sm text-slate-500">Create and take your own quizzes</p>
                    </div>
                </Link>

                <Link to="/individual/settings" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex items-center space-x-4">
                    <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
                        <SettingsIcon size={24} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Settings</h3>
                        <p className="text-sm text-slate-500">Link to a school or class</p>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default Dashboard;
