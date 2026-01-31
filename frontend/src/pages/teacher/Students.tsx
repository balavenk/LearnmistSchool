import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

interface Student {
    id: number;
    name: string;
    grade_id: number;
    class_id: number | null;
}

interface Grade {
    id: number;
    name: string;
}

interface ClassData {
    id: number;
    name: string;
    section: string;
    grade_id: number;
}

const Students: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [filters, setFilters] = useState({
        name: '',
        grade_id: '',
        class_id: ''
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');
    const [selectedGradeId, setSelectedGradeId] = useState<number | ''>('');
    const [selectedClassId, setSelectedClassId] = useState<number | ''>('');

    const ITEMS_PER_PAGE = 10;

    // Helpers
    const getGradeName = (id: number) => grades.find(g => g.id === id)?.name || 'Unknown';
    const getClassName = (id: number | null) => {
        if (!id) return 'Unassigned';
        const cls = classes.find(c => c.id === id);
        return cls ? `${cls.name} (${cls.section})` : 'Unknown';
    };

    // Filter & Sort Logic
    const processedStudents = useMemo(() => {
        let result = [...students];

        // 1. Filter
        if (filters.name) {
            result = result.filter(s => s.name.toLowerCase().includes(filters.name.toLowerCase()));
        }
        if (filters.grade_id) {
            result = result.filter(s => s.grade_id === Number(filters.grade_id));
        }
        if (filters.class_id) {
            result = result.filter(s => s.class_id === Number(filters.class_id));
        }

        // 2. Sort
        if (sortConfig) {
            result.sort((a, b) => {
                let aValue: any = '';
                let bValue: any = '';

                switch (sortConfig.key) {
                    case 'name':
                        aValue = a.name;
                        bValue = b.name;
                        break;
                    case 'grade':
                        aValue = getGradeName(a.grade_id);
                        bValue = getGradeName(b.grade_id);
                        break;
                    case 'class':
                        aValue = getClassName(a.class_id);
                        bValue = getClassName(b.class_id);
                        break;
                    default:
                        return 0;
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [students, filters, sortConfig, grades, classes]);

    const paginatedStudents = processedStudents.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );
    const totalPages = Math.ceil(processedStudents.length / ITEMS_PER_PAGE);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    // Derived state for class dropdown (filter by selected grade)
    const availableClasses = useMemo(() => {
        if (!selectedGradeId) return [];
        return classes.filter(c => c.grade_id === Number(selectedGradeId));
    }, [selectedGradeId, classes]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [studentsRes, gradesRes, classesRes] = await Promise.all([
                api.get('/teacher/students/'),
                api.get('/teacher/grades/'),
                api.get('/teacher/classes/')
            ]);
            setStudents(studentsRes.data);
            setGrades(gradesRes.data);
            setClasses(classesRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);
    // Note: You need to keep handleCreateStudent and closeModal in the file when applying. 
    // I am assuming the tool will keep surrounding code if I target specific lines or if I replace logic blocks.
    // Ideally I should provide the FULL component content to be safe given the significant internal changes.
    // But replaced block below targets the render and logic variables.

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Student Roster</h1>
                    <p className="text-slate-500 mt-1">Manage students and view their details.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg shadow-sm font-medium transition-colors flex items-center"
                >
                    <span className="mr-2 text-xl leading-none">+</span> Add Student
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>
                                <div className="flex items-center gap-1">
                                    Name {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('grade')}>
                                <div className="flex items-center gap-1">
                                    Grade {sortConfig?.key === 'grade' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('class')}>
                                <div className="flex items-center gap-1">
                                    Class / Section {sortConfig?.key === 'class' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                        {/* Filter Row */}
                        <tr className="bg-white border-b border-slate-100">
                            <th className="px-6 py-2">
                                <input
                                    type="text"
                                    placeholder="Filter Name..."
                                    value={filters.name}
                                    onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full text-xs font-normal border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </th>
                            <th className="px-6 py-2">
                                <select
                                    value={filters.grade_id}
                                    onChange={(e) => setFilters(prev => ({ ...prev, grade_id: e.target.value }))}
                                    className="w-full text-xs font-normal border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">All Grades</option>
                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </th>
                            <th className="px-6 py-2">
                                <select
                                    value={filters.class_id}
                                    onChange={(e) => setFilters(prev => ({ ...prev, class_id: e.target.value }))}
                                    className="w-full text-xs font-normal border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">All Classes</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.section})</option>)}
                                </select>
                            </th>
                            <th className="px-6 py-2"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
                        ) : paginatedStudents.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                                <td className="px-6 py-4 text-slate-600">{getGradeName(student.grade_id)}</td>
                                <td className="px-6 py-4 text-slate-600">{getClassName(student.class_id)}</td>
                                <td className="px-6 py-4 text-right space-x-4">
                                    <button onClick={() => navigate(`/grading/${student.id}`)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Assignments</button>
                                    <button className="text-slate-400 hover:text-slate-600 text-sm font-medium">View Details</button>
                                </td>
                            </tr>
                        ))}
                        {paginatedStudents.length === 0 && !loading && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                    No students found matching filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-slate-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 my-8 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Add New Student</h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleCreateStudent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Student Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                                    <select
                                        value={selectedGradeId}
                                        onChange={(e) => {
                                            setSelectedGradeId(Number(e.target.value));
                                            setSelectedClassId(''); // Reset class when grade changes
                                        }}
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Select Grade</option>
                                        {grades.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(Number(e.target.value))}
                                        disabled={!selectedGradeId}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100"
                                    >
                                        <option value="">Select Class</option>
                                        {availableClasses.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.section})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">Add Student</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Students;
