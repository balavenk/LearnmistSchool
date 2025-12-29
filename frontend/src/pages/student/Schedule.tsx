import React from 'react';

const Schedule: React.FC = () => {
    // Hardcoded mock data for schedule
    const scheduleItems = [
        { day: 'Monday', time: '09:00 AM - 10:00 AM', subject: 'Mathematics', teacher: 'Mr. Anderson', room: '101' },
        { day: 'Monday', time: '10:15 AM - 11:15 AM', subject: 'Physics', teacher: 'Ms. Clark', room: 'Lab 2' },
        { day: 'Tuesday', time: '09:00 AM - 10:00 AM', subject: 'English', teacher: 'Mrs. Davis', room: '204' },
        { day: 'Tuesday', time: '11:00 AM - 12:00 PM', subject: 'History', teacher: 'Mr. Evans', room: '305' },
        { day: 'Wednesday', time: '09:00 AM - 10:00 AM', subject: 'Mathematics', teacher: 'Mr. Anderson', room: '101' },
        { day: 'Wednesday', time: '10:15 AM - 11:15 AM', subject: 'Chemistry', teacher: 'Ms. Frank', room: 'Lab 1' },
        { day: 'Thursday', time: '09:00 AM - 10:00 AM', subject: 'Biology', teacher: 'Dr. Green', room: 'Lab 3' },
        { day: 'Friday', time: '09:00 AM - 10:00 AM', subject: 'Physical Education', teacher: 'Coach Harris', room: 'Gym' },
    ];

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">My Class Schedule</h2>
            <div className="bg-white rounded-lg shadowoverflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {scheduleItems.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.day}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.time}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.subject}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.teacher}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.room}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Schedule;
