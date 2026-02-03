import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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

    // Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [quizTitle, setQuizTitle] = useState('');
    const [quizDesc, setQuizDesc] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [creating, setCreating] = useState(false);

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

    useEffect(() => {
        if (selectedClassId && selectedSubjectId) {
            fetchQuestions();
        } else {
            setQuestions([]);
        }
    }, [selectedClassId, selectedSubjectId, difficulty, searchText]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (selectedClassId && selectedSubjectId) {
                fetchQuestions();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchText]);

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

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params: any = {
                class_id: selectedClassId,
                subject_id: selectedSubjectId
            };
            if (difficulty) params.difficulty = difficulty;
            if (searchText) params.search = searchText;

            const res = await axios.get('http://localhost:8000/teacher/questions/', {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setQuestions(res.data);
            // Clear selection on new fetch? Or keep identifiers? For simplicity, we might keep but valid IDs only?
            // User might want to search, select, search again, select more. So don't clear.
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <div className="p-6 bg-slate-50 min-h-screen relative">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Question Bank</h1>

                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm border border-indigo-100">
                        <span className="text-sm font-medium text-indigo-900 px-3">
                            {selectedIds.length} Selected
                        </span>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Generate New Quiz
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                    <select
                        className="w-full rounded-lg border-slate-300 p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(Number(e.target.value) || '')}
                    >
                        <option value="">Select Class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                    <select
                        className="w-full rounded-lg border-slate-300 p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(Number(e.target.value) || '')}
                        disabled={!selectedClassId}
                    >
                        <option value="">Select Subject</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty (Optional)</label>
                    <select
                        className="w-full rounded-lg border-slate-300 p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
                    <input
                        type="text"
                        className="w-full rounded-lg border-slate-300 p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Search text..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                            <th className="p-4 w-10">
                                {/* Select All could go here, but pagination makes it tricky. Let's skip for now or just check all visible. */}
                            </th>
                            <th className="p-4">Description</th> {/* Question Text */}
                            <th className="p-4 w-32">Difficulty</th>
                            <th className="p-4 w-24">Points</th>
                            <th className="p-4 w-32">Type</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading...</td></tr>
                        ) : questions.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No questions found. Select Class & Subject.</td></tr>
                        ) : (
                            questions.map(q => (
                                <tr key={q.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(q.id) ? 'bg-indigo-50/50' : ''}`}>
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(q.id)}
                                            onChange={() => toggleSelection(q.id)}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        />
                                    </td>
                                    <td className="p-4 font-medium text-slate-800">{q.text}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                            ${q.difficulty_level === 'Easy' ? 'bg-green-100 text-green-700' :
                                                q.difficulty_level === 'Hard' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'}`}>
                                            {q.difficulty_level || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600">{q.points}</td>
                                    <td className="p-4 text-xs font-mono text-slate-500">{q.question_type}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Quiz Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Create Assignment</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={quizTitle}
                                    onChange={e => setQuizTitle(e.target.value)}
                                    placeholder="e.g., Weekly Quiz"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    rows={3}
                                    value={quizDesc}
                                    onChange={e => setQuizDesc(e.target.value)}
                                    placeholder="Details about the assignment..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                                <input
                                    type="datetime-local"
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateQuiz}
                                    disabled={!quizTitle || creating}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Create Assignment'}
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
