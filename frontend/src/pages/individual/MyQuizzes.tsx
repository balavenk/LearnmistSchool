import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Play, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { format } from 'date-fns';
import TakeQuiz from './TakeQuiz';

interface Quiz {
    id: number;
    title: string;
    description: string;
    created_at: string;
    question_count?: number;
}

const MyQuizzes: React.FC = () => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [takingQuizId, setTakingQuizId] = useState<number | null>(null);

    // Create Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [subjectName, setSubjectName] = useState(''); // Text input for typeahead
    const [existingSubjects, setExistingSubjects] = useState<any[]>([]);
    const [filteredSubjects, setFilteredSubjects] = useState<any[]>([]);

    // New Fields
    const [examType, setExamType] = useState('Quiz'); // Quiz, Exam, Homework
    const [questionCount, setQuestionCount] = useState(10);
    const [difficulty, setDifficulty] = useState('Medium');
    const [questionType, setQuestionType] = useState('Multiple Choice'); // MCQ, True/False, Short Answer
    const [dueDate, setDueDate] = useState('');
    const [usePdfContext, setUsePdfContext] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const fetchQuizzes = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/individual/quizzes');
            setQuizzes(res.data);
        } catch (err) {
            console.error("Failed to fetch quizzes", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuizzes();
        fetchSubjects();
        // Check for create param
        const params = new URLSearchParams(location.search);
        if (params.get('create') === 'true') {
            setShowCreateModal(true);
        }
    }, [location.search]);

    const fetchSubjects = async () => {
        try {
            const res = await api.get('/individual/subjects');
            setExistingSubjects(res.data);
        } catch (err) { console.error("Failed subjects", err); }
    };

    // Filter subjects on type
    useEffect(() => {
        if (subjectName) {
            setFilteredSubjects(existingSubjects.filter(s => s.name.toLowerCase().includes(subjectName.toLowerCase())));
        } else {
            setFilteredSubjects([]);
        }
    }, [subjectName, existingSubjects]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/individual/quizzes', {
                title,
                description,
                subject_name: subjectName,
                exam_type: examType,
                question_count: Number(questionCount),
                difficulty_level: difficulty,
                question_type: questionType,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
                use_pdf_context: usePdfContext
            });
            setShowCreateModal(false);
            resetForm();
            fetchQuizzes();
        } catch (err) {
            console.error("Create failed", err);
            alert("Failed to create quiz");
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setSubjectName('');
        setExamType('Quiz');
        setQuestionCount(10);
        setDifficulty('Medium');
        setQuestionType('Multiple Choice');
        setDueDate('');
        setUsePdfContext(false);
        navigate('/individual/quizzes'); // Ensure URL cleans up
    };

    return (
        <div className="p-6">
            {takingQuizId && (
                <TakeQuiz
                    assignmentId={takingQuizId}
                    onClose={() => setTakingQuizId(null)}
                    onSubmitSuccess={() => {
                        setTakingQuizId(null);
                        fetchQuizzes();
                    }}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900">My Quizzes</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                    <Plus size={20} />
                    <span>Create Quiz</span>
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-10">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map(quiz => (
                        <div key={quiz.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all">
                            <h3 className="font-bold text-lg text-slate-900 mb-2">{quiz.title}</h3>
                            <p className="text-slate-500 text-sm mb-4 line-clamp-2">{quiz.description || "No description"}</p>
                            {/* Display extra info if available? For now just title/desc as per design */}

                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                                <Link
                                    to={`/individual/quizzes/${quiz.id}`}
                                    className="text-indigo-600 font-medium text-sm hover:underline"
                                >
                                    Edit Questions
                                </Link>
                                <button
                                    onClick={() => setTakingQuizId(quiz.id)}
                                    className="flex items-center space-x-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-green-100"
                                >
                                    <Play size={14} />
                                    <span>Take Quiz</span>
                                </button>
                            </div>
                        </div>
                    ))}
                    {quizzes.length === 0 && ( /* ... */ null)}
                    {quizzes.length === 0 && (
                        <div className="col-span-full text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            <p className="text-slate-500">No quizzes created yet.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal (Styled like Teacher AI Modal) */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden transition-all duration-300">
                        {/* Decorative background blobs */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full blur-3xl -z-10 -mr-16 -mt-16"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -z-10 -ml-16 -mb-16"></div>

                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">✨</span>
                                <h2 className="text-xl font-bold text-slate-900">Create New Quiz</h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    navigate('/individual/quizzes'); // Clear param on close
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title / Topic</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    required
                                    placeholder="e.g. Algebra Basics"
                                />
                            </div>
                            {/* PDF Context Checkbox */}
                            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl">
                                <input
                                    type="checkbox"
                                    id="usePdfContextIndividual"
                                    checked={usePdfContext}
                                    onChange={(e) => setUsePdfContext(e.target.checked)}
                                    className="mt-1 w-5 h-5 text-purple-600 border-purple-300 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                                />
                                <label htmlFor="usePdfContextIndividual" className="flex-1 cursor-pointer">
                                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Generate from Trained PDF/Book
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">
                                        Use questions from uploaded textbooks and PDFs. If unchecked, generates from general knowledge.
                                    </p>
                                </label>
                            </div>
                            {/* Subject Typeahead */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={subjectName}
                                    onChange={e => setSubjectName(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    required
                                    placeholder="Start typing subject..."
                                    list="subject-suggestions"
                                />
                                <datalist id="subject-suggestions">
                                    {existingSubjects.map((s: any) => (
                                        <option key={s.id} value={s.name} />
                                    ))}
                                </datalist>
                            </div>

                            {/* Options Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Exam Type</label>
                                    <select
                                        value={examType}
                                        onChange={e => setExamType(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        <option value="Quiz">Quiz</option>
                                        <option value="Exam">Exam</option>
                                        <option value="Homework">Homework</option>
                                        <option value="Practice">Practice</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                                    <input
                                        type="datetime-local"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Questions</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={questionCount}
                                        onChange={e => setQuestionCount(Number(e.target.value))}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                                    <select
                                        value={difficulty}
                                        onChange={e => setDifficulty(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Question Type</label>
                                <select
                                    value={questionType}
                                    onChange={e => setQuestionType(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="Multiple Choice">Multiple Choice</option>
                                    <option value="True/False">True/False</option>
                                    <option value="Short Answer">Short Answer</option>
                                    <option value="Mixed">Mixed</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                    rows={2}
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        navigate('/individual/quizzes');
                                    }}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-medium shadow-md flex items-center gap-2"
                                >
                                    <span>✨</span> Create Quiz
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyQuizzes;
