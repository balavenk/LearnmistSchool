import React from 'react';

const SchoolAdminDashboard: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">School Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm uppercase font-bold text-slate-500 mb-1">Total Students</h3>
                    <p className="text-3xl font-bold text-slate-900">850</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm uppercase font-bold text-slate-500 mb-1">Total Teachers</h3>
                    <p className="text-3xl font-bold text-slate-900">42</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm uppercase font-bold text-slate-500 mb-1">Classes</h3>
                    <p className="text-3xl font-bold text-slate-900">28</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm uppercase font-bold text-slate-500 mb-1">Attendance</h3>
                    <p className="text-3xl font-bold text-slate-900">96.5%</p>
                </div>
            </div>
        </div>
    );
};

export default SchoolAdminDashboard;
