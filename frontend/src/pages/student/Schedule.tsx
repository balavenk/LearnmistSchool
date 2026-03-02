import React, { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../components/DataTable';

interface ScheduleItem {
    day: string;
    time: string;
    subject: string;
    teacher: string;
    room: string;
}

const Schedule: React.FC = () => {
    // Hardcoded mock data for schedule
    const scheduleItems: ScheduleItem[] = [
        { day: 'Monday', time: '09:00 AM - 10:00 AM', subject: 'Mathematics', teacher: 'Mr. Anderson', room: '101' },
        { day: 'Monday', time: '10:15 AM - 11:15 AM', subject: 'Physics', teacher: 'Ms. Clark', room: 'Lab 2' },
        { day: 'Tuesday', time: '09:00 AM - 10:00 AM', subject: 'English', teacher: 'Mrs. Davis', room: '204' },
        { day: 'Tuesday', time: '11:00 AM - 12:00 PM', subject: 'History', teacher: 'Mr. Evans', room: '305' },
        { day: 'Wednesday', time: '09:00 AM - 10:00 AM', subject: 'Mathematics', teacher: 'Mr. Anderson', room: '101' },
        { day: 'Wednesday', time: '10:15 AM - 11:15 AM', subject: 'Chemistry', teacher: 'Ms. Frank', room: 'Lab 1' },
        { day: 'Thursday', time: '09:00 AM - 10:00 AM', subject: 'Biology', teacher: 'Dr. Green', room: 'Lab 3' },
        { day: 'Friday', time: '09:00 AM - 10:00 AM', subject: 'Physical Education', teacher: 'Coach Harris', room: 'Gym' },
    ];

    const scheduleColumns = useMemo<ColumnDef<ScheduleItem>[]>(() => [
        {
            accessorKey: 'day',
            header: 'Day',
            cell: ({ row }) => (
                <span className="font-medium text-gray-900">{row.original.day}</span>
            )
        },
        {
            accessorKey: 'time',
            header: 'Time',
        },
        {
            accessorKey: 'subject',
            header: 'Subject',
        },
        {
            accessorKey: 'teacher',
            header: 'Teacher',
        },
        {
            accessorKey: 'room',
            header: 'Room',
        },
    ], []);

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">My Class Schedule</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <DataTable
                    columns={scheduleColumns}
                    data={scheduleItems}
                    isLoading={false}
                />
            </div>
        </div>
    );
};

export default Schedule;
