import React, { useState, useEffect } from 'react';
import api from '../api/axios';

interface Quiz {
    id: number;
    title: string;
    subject: string;
    questions: string; // JSON string
    created_at: string;
}

interface ClassItem {
    id: number;
    name: string;
    section: string;
}

const QuizBank: React.FC = () => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);

    // Assign Modal State
    const [selectedClassId, setSelectedClassId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        fetchQuizzes();
        fetchClasses();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const res = await api.get('/quiz/saved');
            setQuizzes(res.data);
        } catch (err) {
            console.error("Failed to fetch quizzes", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            // Assuming we have a way to get classes for the teacher
            // For now, let's fetch all classes (or filter if API supports it)
            // Ideally: GET /classes/my-classes
            const res = await api.get('/classes/');
            setClasses(res.data);
        } catch (err) {
            console.error("Failed to fetch classes", err);
        }
    };

    const handleAssign = async () => {
        if (!selectedQuiz || !selectedClassId || !dueDate) {
            alert("Please select a class and due date.");
            return;
        }

        setAssigning(true);
        try {
            await api.post('/assignments/', {
                title: selectedQuiz.title,
                description: `Complete the ${selectedQuiz.subject} quiz.`,
                due_date: new Date(dueDate).toISOString(),
                status: "PUBLISHED",
                assigned_to_class_id: parseInt(selectedClassId),
                subject_id: null, // Optional, could derive from quiz subject logic
                quiz_id: selectedQuiz.id
            });
            alert("Quiz assigned successfully!");
            setShowAssignModal(false);
            setSelectedClassId('');
            setDueDate('');
        } catch (err) {
            console.error(err);
            alert("Failed to assign quiz.");
        } finally {
            setAssigning(false);
        }
    };

    const openAssignModal = (quiz: Quiz) => {
        setSelectedQuiz(quiz);
        setShowAssignModal(true);
    };

    // Helper to count questions
    const getQuestionCount = (jsonStr: string) => {
        try {
            return JSON.parse(jsonStr).length;
        } catch {
            return 0;
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-8">📚 Question Bank</h1>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading quizzes...</div>
            ) : quizzes.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
                    <p className="text-slate-500 mb-4">No saved quizzes found.</p>
                    <a href="/quiz-generator" className="text-indigo-600 hover:text-indigo-800 font-medium">
                        Generate your first quiz →
                    </a>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map((quiz) => (
                        <div key={quiz.id} className="bg-white rounded-xl shadow-md p-6 border border-slate-100 hover:shadow-lg transition-shadow flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-bold">
                                        {quiz.subject}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(quiz.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">{quiz.title}</h3>
                                <p className="text-sm text-slate-500 mb-4">
                                    {getQuestionCount(quiz.questions)} Questions
                                </p>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                                <button
                                    onClick={() => alert("View functionality coming soon! (Check JSON in DB)")}
                                    className="flex-1 px-3 py-2 text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    View
                                </button>
                                <button
                                    onClick={() => openAssignModal(quiz)}
                                    className="flex-1 px-3 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors shadow-sm"
                                >
                                    Assign Class
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Assign Modal */}
            {showAssignModal && selectedQuiz && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in scale-95 duration-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">
                            Assign "{selectedQuiz.title}"
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Select Class</label>
                                <select
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">-- Choose Class --</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {c.section}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Due Date</label>
                                <input
                                    type="datetime-local"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={assigning}
                                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                            >
                                {assigning ? 'Assigning...' : 'Confirm Assignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizBank;
