import React from 'react';

const SuperAdminDashboard: React.FC = () => {
    const [stats, setStats] = React.useState({
        total_schools: 0,
        active_users: 0,
        total_quizzes: 0,
        total_projects: 0,
        recent_schools: [] as any[]
    });
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                // We need to import api here or assume it's available via context/props?
                // Assuming standard import pattern.
                const response = await import('../api/axios').then(m => m.default.get('/super-admin/stats'));
                setStats(response.data);
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
            <h1 className="text-3xl font-bold text-slate-900">Super Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Card 1 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Total Schools</h3>
                    <p className="text-4xl font-bold text-indigo-600">{stats.total_schools}</p>
                    <p className="text-sm text-slate-500 mt-2">Registered in system</p>
                </div>
                {/* Card 2 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Active Users</h3>
                    <p className="text-4xl font-bold text-green-600">{stats.active_users.toLocaleString()}</p>
                    <p className="text-sm text-slate-500 mt-2">Students & Staff</p>
                </div>
                {/* Card 3: Quizzes */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Total Quizzes</h3>
                    <p className="text-4xl font-bold text-blue-600">{stats.total_quizzes}</p>
                    <p className="text-sm text-slate-500 mt-2">Questions-based</p>
                </div>
                {/* Card 4: Projects */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Projects</h3>
                    <p className="text-4xl font-bold text-purple-600">{stats.total_projects}</p>
                    <p className="text-sm text-slate-500 mt-2">Assignments</p>
                </div>
                {/* Card 5: System Status */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">System Status</h3>
                    <div className="flex items-center mt-1">
                        <span className="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                        <span className="text-lg font-medium text-slate-800">Operational</span>
                    </div>
                </div>
            </div>
            {/* Recent Activity Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-lg font-semibold text-slate-800">Recent Schools Added</h3>
                </div>
                {stats.recent_schools.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 py-12">
                        No schools found.
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <th className="px-6 py-4">School Name</th>
                                <th className="px-6 py-4">Address</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stats.recent_schools.map((school) => (
                                <tr key={school.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900">{school.name}</td>
                                    <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{school.address || "N/A"}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${school.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {school.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
