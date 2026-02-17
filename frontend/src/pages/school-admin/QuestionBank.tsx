import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';

interface Grade {
    id: number;
    name: string;
    // Backend doesn't return student count or section in the basic grade list yet
    studentsCount?: number;
}

const QuestionBank: React.FC = () => {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 8;

    useEffect(() => {
        fetchGrades();
    }, []);

    const fetchGrades = async () => {
        try {
            setLoading(true);
            const res = await api.get('/school-admin/grades/');
            // The API returns a list of Grade objects { id, name, school_id }
            setGrades(res.data);
        } catch (error) {
            console.error("Failed to fetch grades", error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        return grades.filter(g =>
            g.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [grades, searchTerm]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const navigate = useNavigate();

    const handleSelect = useCallback((gradeId: number) => {
        navigate(`/school-admin/question-bank/${gradeId}`);
    }, [navigate]);

    // DataTable Columns
    const columns = useMemo<ColumnDef<Grade>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Grade Name',
                cell: ({ row }) => (
                    <span className="font-medium text-slate-900">{row.original.name}</span>
                ),
            },
            {
                id: 'action',
                header: 'Action',
                cell: ({ row }) => (
                    <div className="flex justify-end">
                        <button
                            onClick={() => handleSelect(row.original.id)}
                            className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-100 border border-indigo-200 transition-colors"
                        >
                            Select Grade
                        </button>
                    </div>
                ),
            },
        ],
        [handleSelect]
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
                    <p className="text-slate-500 text-sm">Select a grade to view or manage questions.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <input
                    type="text"
                    placeholder="Search grades..."
                    className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>

            {/* DataTable */}
            <DataTable
                columns={columns}
                data={paginated}
                isLoading={loading}
                emptyMessage="No grades found."
            />

            {/* Pagination */}
            {!loading && filtered.length > 0 && totalPages > 1 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filtered.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            )}
        </div>
    );
};

export default QuestionBank;
