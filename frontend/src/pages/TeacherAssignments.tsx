import React, { useState, useMemo } from 'react';

// Mock Data Types
interface Assignment {
    id: number;
    title: string;
    description: string;
    course: string;
    dueDate: string;
    status: 'Published' | 'Draft';
    assignedTo: string;
}

const INITIAL_ASSIGNMENTS: Assignment[] = [
    { id: 1, title: 'Algebra Quiz 1', description: 'Basic algebra concepts.', course: 'Math 101', dueDate: '2024-12-30', status: 'Published', assignedTo: 'All Students' },
    { id: 2, title: 'History Essay', description: 'Write about the industrial revolution.', course: 'History 202', dueDate: '2025-01-15', status: 'Draft', assignedTo: 'All Students' },
    { id: 3, title: 'Science Lab Report', description: 'Photosynthesis experiment results.', course: 'Biology 101', dueDate: '2024-12-28', status: 'Published', assignedTo: 'John Doe' },
];

const TeacherAssignments: React.FC = () => {
    const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [filter, setFilter] = useState('All');

    // Form State (Manual)
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newCourse, setNewCourse] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [newAssignee, setNewAssignee] = useState('All Students');

    // Form State (AI)
    const [aiTopic, setAiTopic] = useState('');
    const [aiGrade, setAiGrade] = useState('Grade 10');
    const [aiDifficulty, setAiDifficulty] = useState('Medium');
    const [aiQuestionCount, setAiQuestionCount] = useState(10);
    const [aiQuestionType, setAiQuestionType] = useState('Multiple Choice');

    const filteredAssignments = useMemo(() => {
        if (filter === 'All') return assignments;
        return assignments.filter(a => a.status === filter);
    }, [assignments, filter]);

    const handleCreateAssignment = (e: React.FormEvent) => {
        e.preventDefault();
        const newAssignment: Assignment = {
            id: assignments.length + 1,
            title: newTitle,
            description: newDesc,
            course: newCourse,
            dueDate: newDueDate,
            status: 'Published',
            assignedTo: newAssignee,
        };
        setAssignments([newAssignment, ...assignments]);
        closeModal();
    };

    const handleAIGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock generation - in a real app this would call an API
        const newAssignment: Assignment = {
            id: assignments.length + 1,
            title: `${aiTopic} Quiz (AI Generated)`,
            description: `A ${aiDifficulty} difficulty quiz with ${aiQuestionCount} ${aiQuestionType} questions on ${aiTopic}.`,
            course: 'General', // Placeholder
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
            status: 'Draft',
            assignedTo: 'All Students',
        };
        setAssignments([newAssignment, ...assignments]);
        closeAIModal();
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewTitle('');
        setNewDesc('');
        setNewCourse('');
        setNewDueDate('');
        setNewAssignee('All Students');
    };

    const closeAIModal = () => {
        setIsAIModalOpen(false);
        setAiTopic('');
        setAiGrade('Grade 10');
        setAiDifficulty('Medium');
        setAiQuestionCount(10);
        setAiQuestionType('Multiple Choice');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Assignments</h1>
                    <p className="text-slate-500 mt-1">Manage and assign quizzes and homework.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsAIModalOpen(true)}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-lg shadow-md font-medium transition-all flex items-center"
                    >
                        <span className="mr-2">✨</span> Create Quiz
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-6 py-2.5 rounded-lg shadow-sm font-medium transition-colors"
                    >
                        + Create Manually
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-4 border-b border-slate-200">
                {['All', 'Published', 'Draft'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`pb-2 px-4 text-sm font-medium transition-colors relative ${filter === status
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Assignments List */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAssignments.map((assignment) => (
                    <div key={assignment.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative overflow-hidden">
                        {assignment.title.includes('AI Generated') && (
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <span className="text-6xl">✨</span>
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${assignment.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {assignment.status}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">{assignment.course}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10">{assignment.title}</h3>
                        <p className="text-slate-600 text-sm mb-4 line-clamp-2 relative z-10">{assignment.description}</p>
                        <div className="text-xs text-slate-500 space-y-1 relative z-10">
                            <p><strong>Due:</strong> {assignment.dueDate}</p>
                            <p><strong>Assigned to:</strong> {assignment.assignedTo}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Manual Assignment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Create New Assignment</h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleCreateAssignment} className="space-y-4">
                            {/* ... (Existing fields) ... */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea required rows={3} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
                                    <input type="text" required value={newCourse} onChange={(e) => setNewCourse(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Math 101" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                                    <input type="date" required value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                                <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="All Students">All Students</option>
                                    <option value="Class A">Class A</option>
                                    <option value="Class B">Class B</option>
                                    <option value="John Doe">John Doe</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">Assign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create AI Quiz Modal */}
            {isAIModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full blur-3xl -z-10 -mr-16 -mt-16"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -z-10 -ml-16 -mb-16"></div>

                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">✨</span>
                                <h2 className="text-xl font-bold text-slate-900">Generate Quiz with AI</h2>
                            </div>
                            <button onClick={closeAIModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleAIGenerate} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Topic / Content</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={aiTopic}
                                    onChange={(e) => setAiTopic(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                    placeholder="e.g. Quadratic Equations, The American Civil War, Photosynthesis..."
                                />
                                <p className="text-xs text-slate-400 mt-1">Describe what the quiz should be about.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Grade Level</label>
                                    <select
                                        value={aiGrade}
                                        onChange={(e) => setAiGrade(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                                    <select
                                        value={aiDifficulty}
                                        onChange={(e) => setAiDifficulty(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        {['Easy', 'Medium', 'Hard'].map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Number of Questions</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={aiQuestionCount}
                                        onChange={(e) => setAiQuestionCount(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Question Type</label>
                                    <select
                                        value={aiQuestionType}
                                        onChange={(e) => setAiQuestionType(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        {['Multiple Choice', 'True/False', 'Short Answer', 'Mixed'].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button type="button" onClick={closeAIModal} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-medium shadow-md flex justify-center items-center gap-2"
                                >
                                    <span>✨</span> Generate Quiz
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherAssignments;
