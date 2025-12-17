import React from 'react';

const SuperAdminDashboard: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">Super Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Total Schools</h3>
                    <p className="text-4xl font-bold text-indigo-600">12</p>
                    <p className="text-sm text-slate-500 mt-2">+2 added this month</p>
                </div>
                {/* Card 2 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Active Users</h3>
                    <p className="text-4xl font-bold text-green-600">3,450</p>
                    <p className="text-sm text-slate-500 mt-2">Across all schools</p>
                </div>
                {/* Card 3 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">System Status</h3>
                    <div className="flex items-center mt-1">
                        <span className="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                        <span className="text-lg font-medium text-slate-800">Operational</span>
                    </div>
                </div>
            </div>
            {/* Recent Activity Table Placeholder */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-lg font-semibold text-slate-800">Recent Schools Added</h3>
                </div>
                <div className="p-6 text-center text-slate-500 py-12">
                    Table of recent schools will appear here.
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
