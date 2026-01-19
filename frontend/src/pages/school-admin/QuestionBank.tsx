import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Reusing the Grade interface and logic from GradesList for consistency
// In a real app, this would be fetched from a shared context or API
interface Grade {
    id: number;
    name: string;
    section: string;
    studentsCount: number;
}

const INITIAL_GRADES: Grade[] = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Grade ${i + 1}`,
    section: 'A',
    studentsCount: Math.floor(Math.random() * 30) + 15,
}));

const QuestionBank: React.FC = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [grades, _setGrades] = useState<Grade[]>(INITIAL_GRADES);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 8;

    const filtered = useMemo(() => {
        return grades.filter(g =>
            g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.section.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [grades, searchTerm]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const navigate = useNavigate();

    const handleSelect = (gradeId: number) => {
        navigate(`/school-admin/question-bank/${gradeId}`);
    };

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

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Grade Name</th>
                            <th className="px-6 py-4">Section</th>
                            <th className="px-6 py-4">Students</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginated.map(grade => (
                            <tr key={grade.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{grade.name}</td>
                                <td className="px-6 py-4 text-slate-500">{grade.section}</td>
                                <td className="px-6 py-4 text-slate-600">{grade.studentsCount}</td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleSelect(grade.id)}
                                        className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                    >
                                        Select Grade
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {paginated.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No grades found.</td></tr>}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 flex justify-between items-center text-sm">
                        <span className="text-slate-500">Page {currentPage} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionBank;
