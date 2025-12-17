import React from 'react';

const StudentDashboard: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">Student Dashboard</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content (Schedule/Classes) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Today's Schedule</h2>
                        <ul className="space-y-4">
                            <li className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
                                <div>
                                    <p className="font-bold text-indigo-900">Mathematics</p>
                                    <p className="text-sm text-indigo-600">Mr. Anderson • Room 302</p>
                                </div>
                                <span className="text-indigo-800 font-semibold">09:00 AM</span>
                            </li>
                            <li className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <p className="font-bold text-slate-800">History</p>
                                    <p className="text-sm text-slate-500">Ms. Roberts • Room 105</p>
                                </div>
                                <span className="text-slate-700 font-semibold">10:30 AM</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Sidebar (Grades/Assignments) */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Upcoming Due Dates</h2>
                        <ul className="space-y-3">
                            <li className="text-sm">
                                <span className="text-red-500 font-bold block">Tomorrow</span>
                                <span className="text-slate-700">Math Homework - Algebra</span>
                            </li>
                            <li className="text-sm pt-2 border-t">
                                <span className="text-orange-500 font-bold block">Friday</span>
                                <span className="text-slate-700">Science Project Proposal</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
