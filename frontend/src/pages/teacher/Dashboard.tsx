import React from 'react';

const TeacherDashboard: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900">Teacher Dashboard</h1>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                    Create Assignment
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Class Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
                    <h3 className="text-xl font-bold text-indigo-700">Mathematics 101</h3>
                    <p className="text-slate-500 mb-4">Grade 9 • Section A</p>
                    <div className="flex justify-between text-sm text-slate-600 border-t pt-4">
                        <span>32 Students</span>
                        <span>09:00 AM</span>
                    </div>
                </div>
                {/* Class Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
                    <h3 className="text-xl font-bold text-green-700">Science 202</h3>
                    <p className="text-slate-500 mb-4">Grade 10 • Section B</p>
                    <div className="flex justify-between text-sm text-slate-600 border-t pt-4">
                        <span>28 Students</span>
                        <span>11:30 AM</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
