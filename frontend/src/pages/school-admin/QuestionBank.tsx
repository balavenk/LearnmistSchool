import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { Smile, Zap, ShieldAlert } from 'lucide-react';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';
import type { ColumnDef } from '@tanstack/react-table';
import PAGINATION_CONFIG from '../../config/pagination';

interface Grade {
    id: number;
    name: string;
}

interface Subject {
    id: number;
    name: string;
}

interface Question {
    id: number;
    text: string;
    points: number;
    question_type: string;
    difficulty_level: string;
}

const QuestionBank: React.FC = () => {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);

    // Filters
    const [selectedGradeId, setSelectedGradeId] = useState<number | ''>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
    const [year, setYear] = useState<string>('');
    const [difficulty, setDifficulty] = useState<string>('');
    const [searchText, setSearchText] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const questionsPerPage = PAGINATION_CONFIG.QUESTIONS_PER_PAGE;

    // Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [quizTitle, setQuizTitle] = useState('');
    const [quizDesc, setQuizDesc] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchGrades = async () => {
        try {
            const res = await api.get('/school-admin/grades/');
            setGrades(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchSubjects = async () => {
        try {
            const res = await api.get('/school-admin/subjects/');
            setSubjects(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                grade_id: selectedGradeId,
                subject_id: selectedSubjectId,
                page: currentPage,
                page_size: questionsPerPage
            };
            if (difficulty) params.difficulty = difficulty;
            if (searchText) params.search = searchText;
            if (year) params.year = year;

            const res = await api.get('/school-admin/questions/', { params });

            if (res.data && res.data.items !== undefined) {
                setQuestions(res.data.items);
                setTotalQuestions(res.data.total);
            } else if (Array.isArray(res.data)) {
                setQuestions(res.data);
                setTotalQuestions(res.data.length);
            } else {
                setQuestions(res.data.questions || []);
                setTotalQuestions(res.data.total || 0);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [selectedGradeId, selectedSubjectId, difficulty, searchText, year, currentPage, questionsPerPage]);

    useEffect(() => {
        fetchGrades();
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (!selectedGradeId) {
            // Optional: reset subjects? No, they are global now.
            // But we should reset selectedSubjectId if we want them to re-select
            setSelectedSubjectId('');
        }
    }, [selectedGradeId]);

    useEffect(() => {
        if (selectedGradeId && selectedSubjectId) {
            // Handled mostly by combining with pagination inputs below, but kept for symmetry
        } else {
            setQuestions([]);
        }
    }, [selectedGradeId, selectedSubjectId, difficulty, searchText, year]);

    const toggleSelection = (id: number) => {
        setSelectedIds(prev => prev.includes(id)
            ? prev.filter(x => x !== id)
            : [...prev, id]
        );
    };

    const handleCreateQuiz = async () => {
        setCreating(true);
        try {
            const payload = {
                title: quizTitle,
                description: quizDesc,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
                grade_id: selectedGradeId,
                subject_id: selectedSubjectId,
                question_ids: selectedIds
            };

            await api.post('/school-admin/assignments/from-bank', payload);
            toast.success('Quiz Created Successfully!');
            setShowModal(false);
            setQuizTitle('');
            setQuizDesc('');
            setSelectedIds([]);
            // School admin might want to go to a general list or just stay here
            // navigate('/school-admin/assignments'); // If such a page exists
        } catch (error) {
            console.error(error);
            toast.error('Failed to create quiz');
        } finally {
            setCreating(false);
        }
    };

    useEffect(() => {
        if (selectedGradeId && selectedSubjectId) {
            // Debounce search text changes
            const timer = setTimeout(() => {
                fetchQuestions();
            }, searchText ? 500 : 0);
            return () => clearTimeout(timer);
        } else {
            setQuestions([]);
        }
    }, [selectedGradeId, selectedSubjectId, difficulty, searchText, year, currentPage, fetchQuestions]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedGradeId, selectedSubjectId, difficulty, searchText, year]);

    const totalPages = Math.ceil(totalQuestions / questionsPerPage);

    const stats = useMemo(() => {
        const easy = questions.filter(q => q.difficulty_level === 'Easy').length;
        const medium = questions.filter(q => q.difficulty_level === 'Medium').length;
        const hard = questions.filter(q => q.difficulty_level === 'Hard').length;
        return { easy, medium, hard };
    }, [questions]);

    const columns = useMemo<ColumnDef<Question>[]>(() => [
        {
            id: 'selection',
            header: () => (
                <div className="flex items-center justify-center w-12">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={selectedIds.includes(row.original.id)}
                        onChange={() => toggleSelection(row.original.id)}
                        className="rounded-lg border-2 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 w-5 h-5 cursor-pointer transition-all"
                    />
                </div>
            ),
        },
        {
            header: 'Question Text',
            accessorKey: 'text',
            cell: ({ row }) => (
                <div className="font-medium text-slate-800 text-sm leading-relaxed max-w-md">
                    {row.original.text}
                </div>
            ),
        },
        {
            header: 'Difficulty',
            accessorKey: 'difficulty_level',
            cell: ({ row }) => {
                const level = row.original.difficulty_level;
                return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm
                        ${level === 'Easy' ? 'bg-green-100 text-green-700 border-2 border-green-200' :
                            level === 'Hard' ? 'bg-red-100 text-red-700 border-2 border-red-200' :
                                'bg-yellow-100 text-yellow-700 border-2 border-yellow-200'}`}>
                        {level === 'Easy' && <Smile className="w-3.5 h-3.5" />}
                        {level === 'Medium' && <Zap className="w-3.5 h-3.5" />}
                        {level === 'Hard' && <ShieldAlert className="w-3.5 h-3.5" />}
                        {level || 'N/A'}
                    </span>
                );
            },
        },
        {
            header: 'Points',
            accessorKey: 'points',
            cell: ({ row }) => (
                <div className="bg-indigo-100 text-indigo-700 rounded-lg px-3 py-1.5 font-bold text-sm inline-block">
                    {row.original.points}
                </div>
            ),
        },
        {
            header: 'Type',
            accessorKey: 'question_type',
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {row.original.question_type}
                </span>
            ),
        },
    ], [selectedIds]);

    const mobileCardRender = useCallback((q: Question) => (
        <div className="space-y-4">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    <h3 className="font-bold text-slate-900 leading-snug mb-2">{q.text}</h3>
                    <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider
                            ${q.difficulty_level === 'Easy' ? 'bg-green-100 text-green-700' :
                                q.difficulty_level === 'Hard' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'}`}>
                            {q.difficulty_level}
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                            {q.question_type}
                        </span>
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                            {q.points} pts
                        </span>
                    </div>
                </div>
                <input
                    type="checkbox"
                    checked={selectedIds.includes(q.id)}
                    onChange={() => toggleSelection(q.id)}
                    className="rounded-lg border-2 border-slate-300 text-indigo-600 w-6 h-6 cursor-pointer flex-shrink-0"
                />
            </div>
        </div>
    ), [selectedIds]);

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Question Bank</h1>
                        <p className="text-slate-600 text-sm">Browse the school library and create assignments</p>
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-md border-2 border-indigo-200">
                            <div>
                                <div className="text-xs text-slate-500 font-medium">Selected</div>
                                <div className="text-xl font-bold text-indigo-600">{selectedIds.length}</div>
                            </div>
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                            >
                                Create Quiz
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {questions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm">
                        <div className="text-2xl font-bold text-slate-900">{totalQuestions}</div>
                        <div className="text-xs text-slate-500 font-medium">Total Questions</div>
                    </div>
                    <div className="bg-white rounded-xl p-5 border-2 border-green-200 shadow-sm">
                        <div className="text-2xl font-bold text-green-700">{stats.easy}</div>
                        <div className="text-xs text-green-500 font-medium">Easy</div>
                    </div>
                    <div className="bg-white rounded-xl p-5 border-2 border-yellow-200 shadow-sm">
                        <div className="text-2xl font-bold text-yellow-700">{stats.medium}</div>
                        <div className="text-xs text-yellow-500 font-medium">Medium</div>
                    </div>
                    <div className="bg-white rounded-xl p-5 border-2 border-red-200 shadow-sm">
                        <div className="text-2xl font-bold text-red-700">{stats.hard}</div>
                        <div className="text-xs text-red-500 font-medium">Hard</div>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Grade</label>
                        <select
                            className="w-full rounded-xl border-2 border-slate-300 p-3 bg-white outline-none font-medium"
                            value={selectedGradeId}
                            onChange={(e) => setSelectedGradeId(Number(e.target.value) || '')}
                        >
                            <option value="">Select Grade</option>
                            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Subject</label>
                        <select
                            className="w-full rounded-xl border-2 border-slate-300 p-3 bg-white outline-none font-medium disabled:bg-slate-50"
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(Number(e.target.value) || '')}
                            disabled={!selectedGradeId}
                        >
                            <option value="">Select Subject</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Year</label>
                        <select
                            className="w-full rounded-xl border-2 border-slate-300 p-3 bg-white outline-none font-medium text-slate-700"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                        >
                            <option value="">All Years</option>
                            {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).reverse().map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Difficulty</label>
                        <select
                            className="w-full rounded-xl border-2 border-slate-300 p-3 bg-white outline-none font-medium"
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                        >
                            <option value="">All Levels</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Search</label>
                        <input
                            type="text"
                            className="w-full rounded-xl border-2 border-slate-300 p-3 bg-white outline-none font-medium"
                            placeholder="Search questions..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={questions}
                isLoading={loading}
                mobileCardRender={mobileCardRender}
                emptyMessage={selectedGradeId && selectedSubjectId ? "No questions found matching your criteria" : "Please select a grade and subject to view questions"}
                rowClassName={(row) => selectedIds.includes(row.original.id) ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500' : ''}
            />

            {!loading && questions.length > 0 && totalPages > 1 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalQuestions}
                    itemsPerPage={questionsPerPage}
                    onPageChange={setCurrentPage}
                />
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
                        <h2 className="text-2xl font-bold mb-1">Create Quiz</h2>
                        <p className="text-sm text-slate-500 mb-6 font-medium">Selected {selectedIds.length} questions</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Quiz Title</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border-2 border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-medium"
                                    value={quizTitle}
                                    onChange={e => setQuizTitle(e.target.value)}
                                    placeholder="Weekly Quiz"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Description</label>
                                <textarea
                                    className="w-full p-3 border-2 border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-medium h-24"
                                    value={quizDesc}
                                    onChange={e => setQuizDesc(e.target.value)}
                                    placeholder="Brief description..."
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Due Date</label>
                                <input
                                    type="datetime-local"
                                    className="w-full p-3 border-2 border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-medium"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateQuiz}
                                    disabled={!quizTitle || creating}
                                    className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Create Quiz'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionBank;