import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Smile, Zap, ShieldAlert } from 'lucide-react';
import PAGINATION_CONFIG from '../../config/pagination';

interface Class {
    id: number;
    name: string;
    section: string;
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
    const navigate = useNavigate();
    const [classes, setClasses] = useState<Class[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);

    // Filters
    const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
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

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:8000/teacher/classes/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClasses(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchSubjects = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:8000/teacher/subjects/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubjects(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params: any = {
                class_id: selectedClassId,
                subject_id: selectedSubjectId,
                skip: (currentPage - 1) * questionsPerPage,
                limit: questionsPerPage
            };
            if (difficulty) params.difficulty = difficulty;
            if (searchText) params.search = searchText;

            console.log('Fetching questions with params:', params); // Debug log

            const res = await axios.get('http://localhost:8000/teacher/questions/', {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            
            console.log('API Response:', res.data); // Debug: Check actual response structure
            console.log('Response type:', Array.isArray(res.data) ? 'Array' : 'Object');
            console.log('Response length/total:', Array.isArray(res.data) ? res.data.length : res.data.total);
            
            // Handle different API response formats
            if (Array.isArray(res.data)) {
                // Backend is not implementing pagination properly - returning all results
                // We need to manually paginate on frontend as fallback
                console.warn('Backend returned array instead of paginated response. Applying client-side pagination.');
                const startIndex = (currentPage - 1) * questionsPerPage;
                const endIndex = startIndex + questionsPerPage;
                const paginatedQuestions = res.data.slice(startIndex, endIndex);
                setQuestions(paginatedQuestions);
                setTotalQuestions(res.data.length);
            } else if (res.data.questions && typeof res.data.total === 'number') {
                // Proper paginated response with questions array and total count
                console.log('Using paginated response format (questions + total)');
                setQuestions(res.data.questions);
                setTotalQuestions(res.data.total);
            } else if (res.data.items && typeof res.data.total === 'number') {
                // Alternative paginated format
                console.log('Using paginated response format (items + total)');
                setQuestions(res.data.items);
                setTotalQuestions(res.data.total);
            } else {
                // Fallback
                console.log('Using fallback response handling');
                setQuestions(res.data.questions || res.data.items || res.data);
                setTotalQuestions(res.data.total || res.data.count || 0);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [selectedClassId, selectedSubjectId, currentPage, questionsPerPage, difficulty, searchText]);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchSubjects();
        } else {
            setSubjects([]);
        }
    }, [selectedClassId]);

    // Consolidated pagination effect - reset to page 1 when filters change
    useEffect(() => {
        if (selectedClassId && selectedSubjectId) {
            setCurrentPage(1);
        } else {
            setQuestions([]);
            setTotalQuestions(0);
        }
    }, [selectedClassId, selectedSubjectId, difficulty, searchText]);

    // Fetch questions when page changes or filters are ready (with debounce for search)
    useEffect(() => {
        if (!selectedClassId || !selectedSubjectId) return;

        // Debounce search text changes
        const timer = setTimeout(() => {
            fetchQuestions();
        }, searchText ? 500 : 0); // 500ms debounce for search, immediate for others

        return () => clearTimeout(timer);
    }, [fetchQuestions, selectedClassId, selectedSubjectId, searchText]);

    const toggleSelection = (id: number) => {
        setSelectedIds(prev => prev.includes(id)
            ? prev.filter(x => x !== id)
            : [...prev, id]
        );
    };

    const handleCreateQuiz = async () => {
        setCreating(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                title: quizTitle,
                description: quizDesc,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
                class_id: selectedClassId, // Assuming we assign to the filtered class
                subject_id: selectedSubjectId, // Assuming we use selected subject
                question_ids: selectedIds
            };

            await axios.post('http://localhost:8000/teacher/assignments/from-bank', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('Quiz Created Successfully!');
            setShowModal(false);
            setQuizTitle('');
            setQuizDesc('');
            setSelectedIds([]);
            navigate('/teacher/assignments'); // Redirect to assignments list
        } catch (error) {
            console.error(error);
            alert('Failed to create quiz');
        } finally {
            setCreating(false);
        }
    };

    const totalPages = Math.ceil(totalQuestions / questionsPerPage);

    const getDifficultyStats = () => {
        const easy = questions.filter(q => q.difficulty_level === 'Easy').length;
        const medium = questions.filter(q => q.difficulty_level === 'Medium').length;
        const hard = questions.filter(q => q.difficulty_level === 'Hard').length;
        return { easy, medium, hard };
    };

    const stats = getDifficultyStats();
    const isShowingAllResults = questions.length === totalQuestions; // Only show stats when showing complete data

    return (
        <div className="space-y-6">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Question Bank</h1>
                        <p className="text-slate-600 text-sm">Browse and select questions to create assignments</p>
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-md border-2 border-indigo-200">
                            <div className="flex items-center gap-2">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg p-2">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 font-medium">Selected</div>
                                    <div className="text-xl font-bold text-indigo-600">{selectedIds.length}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Quiz
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Statistics Cards - Only show for current page with clear label */}
            {questions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900">{totalQuestions}</div>
                                <div className="text-xs text-slate-500 font-medium">Total Questions</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 border-2 border-green-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 rounded-lg p-3">
                                <Smile className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-700">{stats.easy}</div>
                                <div className="text-xs text-slate-500 font-medium">Easy {!isShowingAllResults && '(This Page)'}</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 border-2 border-yellow-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-yellow-100 rounded-lg p-3">
                                <Zap className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-yellow-700">{stats.medium}</div>
                                <div className="text-xs text-slate-500 font-medium">Medium {!isShowingAllResults && '(This Page)'}</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 border-2 border-red-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 rounded-lg p-3">
                                <ShieldAlert className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-red-700">{stats.hard}</div>
                                <div className="text-xs text-slate-500 font-medium">Hard {!isShowingAllResults && '(This Page)'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Filters */}
            <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <h3 className="text-lg font-bold text-slate-800">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Class
                        </label>
                        <select
                            className="w-full rounded-xl border-2 border-slate-300 p-3 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium transition-all"
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(Number(e.target.value) || '')}
                        >
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            Subject
                        </label>
                        <select
                            className="w-full rounded-xl border-2 border-slate-300 p-3 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(Number(e.target.value) || '')}
                            disabled={!selectedClassId}
                        >
                            <option value="">Select Subject</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Difficulty
                        </label>
                        <select
                            className="w-full rounded-xl border-2 border-slate-300 p-3 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium transition-all"
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
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Search
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-xl border-2 border-slate-300 p-3 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium transition-all"
                            placeholder="Search questions..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Enhanced Table */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                            <th className="p-4 w-16">
                                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </th>
                            <th className="p-4 text-xs uppercase text-slate-700 font-bold tracking-wide">Question Text</th>
                            <th className="p-4 w-32 text-xs uppercase text-slate-700 font-bold tracking-wide">Difficulty</th>
                            <th className="p-4 w-24 text-xs uppercase text-slate-700 font-bold tracking-wide">Points</th>
                            <th className="p-4 w-40 text-xs uppercase text-slate-700 font-bold tracking-wide">Type</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                        <span className="text-slate-500 font-medium">Loading questions...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : questions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-full p-4">
                                            <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-slate-700 font-semibold mb-1">No questions found</p>
                                            <p className="text-slate-500 text-sm">Please select a class and subject to view questions</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            questions.map(q => (
                                <tr key={q.id} className={`group hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all ${selectedIds.includes(q.id) ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500' : ''}`}>
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(q.id)}
                                            onChange={() => toggleSelection(q.id)}
                                            className="rounded-lg border-2 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 w-5 h-5 cursor-pointer transition-all"
                                        />
                                    </td>
                                    <td className="p-4 font-medium text-slate-800 text-sm leading-relaxed">{q.text}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm
                                            ${
                                                q.difficulty_level === 'Easy' ? 'bg-green-100 text-green-700 border-2 border-green-200' :
                                                q.difficulty_level === 'Hard' ? 'bg-red-100 text-red-700 border-2 border-red-200' :
                                                'bg-yellow-100 text-yellow-700 border-2 border-yellow-200'
                                            }`}>
                                            {q.difficulty_level === 'Easy' && <Smile className="w-3.5 h-3.5" />}
                                            {q.difficulty_level === 'Medium' && <Zap className="w-3.5 h-3.5" />}
                                            {q.difficulty_level === 'Hard' && <ShieldAlert className="w-3.5 h-3.5" />}
                                            {q.difficulty_level || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-indigo-100 text-indigo-700 rounded-lg px-3 py-1.5 font-bold text-sm">
                                                {q.points}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                            {q.question_type}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Enhanced Pagination */}
            {!loading && questions.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border-2 border-slate-200">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="font-medium">Showing</span>
                        <span className="font-bold text-indigo-600">{(currentPage - 1) * questionsPerPage + 1}</span>
                        <span>to</span>
                        <span className="font-bold text-indigo-600">{Math.min(currentPage * questionsPerPage, totalQuestions)}</span>
                        <span>of</span>
                        <span className="font-bold text-indigo-600">{totalQuestions}</span>
                        <span>questions</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-lg border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Previous
                        </button>

                        <div className="flex gap-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-10 h-10 rounded-lg font-bold transition-all ${
                                            currentPage === pageNum
                                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md transform scale-110'
                                                : 'border-2 border-slate-300 text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 rounded-lg border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            Next
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Enhanced Create Quiz Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 border-2 border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl p-3">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Create Quiz</h2>
                                <p className="text-sm text-slate-500">Using {selectedIds.length} selected questions</p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    Quiz Title
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium transition-all"
                                    value={quizTitle}
                                    onChange={e => setQuizTitle(e.target.value)}
                                    placeholder="e.g., Weekly Math Quiz"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                    </svg>
                                    Description
                                </label>
                                <textarea
                                    className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none font-medium transition-all"
                                    rows={3}
                                    value={quizDesc}
                                    onChange={e => setQuizDesc(e.target.value)}
                                    placeholder="Add details about the quiz..."
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Due Date
                                </label>
                                <input
                                    type="datetime-local"
                                    className="w-full p-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium transition-all"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>

                            <div className="pt-4 border-t-2 border-slate-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-3 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold transition-all flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateQuiz}
                                    disabled={!quizTitle || creating}
                                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105"
                                >
                                    {creating ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Create Quiz
                                        </>
                                    )}
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
