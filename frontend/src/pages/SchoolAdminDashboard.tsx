import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const SchoolAdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        total_students: 0,
        total_teachers: 0,
        total_classes: 0
    });

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
            <h1 className="text-3xl font-bold text-slate-900">School Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm uppercase font-bold text-slate-500 mb-1">Total Students</h3>
                    <p className="text-3xl font-bold text-slate-900">{stats.total_students}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm uppercase font-bold text-slate-500 mb-1">Total Teachers</h3>
                    <p className="text-3xl font-bold text-slate-900">{stats.total_teachers}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm uppercase font-bold text-slate-500 mb-1">Classes</h3>
                    <p className="text-3xl font-bold text-slate-900">{stats.total_classes}</p>
                </div>
            </div>
        </div>
    );
};

export default SchoolAdminDashboard;
