import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

// Types
interface Assignment {
    id: number;
    title: string;
    description: string;
    subject_id?: number | null; // Backend uses IDs
    class_id?: number | null;
    due_date?: string;
    status: 'PUBLISHED' | 'DRAFT'; // Matches Enum in backend (mapped in UI)
    assignedTo?: string; // Derived for UI
}

interface ClassOption {
    id: number;
    name: string;
    section: string;
    grade?: { name: string };
}

interface SubjectOption {
    id: number;
    name: string;
}

const TeacherAssignments: React.FC = () => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [filter, setFilter] = useState('Draft');

    // Form State (Manual)
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
    const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
    const [newDueDate, setNewDueDate] = useState('');

    // Form State (AI)
    const [aiTopic, setAiTopic] = useState('');
    const [aiGrade, setAiGrade] = useState('Grade 10');
    const [aiDifficulty, setAiDifficulty] = useState('Medium');
    const [aiQuestionCount, setAiQuestionCount] = useState(10);
    const [aiQuestionType, setAiQuestionType] = useState('Multiple Choice');
    const [aiDueDate, setAiDueDate] = useState('');
    const [aiSubjectId, setAiSubjectId] = useState<number | ''>('');
    const [aiClassId, setAiClassId] = useState<number | ''>('');


    // Fetch Data
    const fetchData = async () => {
        try {
            setLoading(true);
            const [assignmentsRes, classesRes, subjectsRes] = await Promise.all([
                api.get('/teacher/assignments/'),
                api.get('/teacher/classes/'),
                api.get('/teacher/subjects/')
            ]);
            setAssignments(assignmentsRes.data);
            setClasses(classesRes.data);
            setSubjects(subjectsRes.data);
        } catch (error) {
            console.error("Failed to fetch teacher data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredAssignments = useMemo(() => {
        if (filter === 'All') return assignments;
        return assignments.filter(a => a.status === filter.toUpperCase()); // Match backend enum
    }, [assignments, filter]);

    const handleCreateAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/teacher/assignments/', {
                title: newTitle,
                description: newDesc,
                due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
                status: 'PUBLISHED',
                assigned_to_class_id: Number(selectedClassId),
                subject_id: Number(selectedSubjectId)
            });
            fetchData();
            closeModal();
            alert("Assignment created successfully!");
        } catch (error) {
            console.error("Failed to create assignment", error);
            alert("Failed to create assignment.");
        }
    };

    const [isGenerating, setIsGenerating] = useState(false);
    const [generationLogs, setGenerationLogs] = useState<string[]>([]);

    const handleAIGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setGenerationLogs(["Initializing connection..."]);

        const clientId = Date.now().toString();
        const ws = new WebSocket(`ws://127.0.0.1:8000/ws/generate-quiz/${clientId}`);

        ws.onopen = () => {
            setGenerationLogs(prev => [...prev, "Connected to server.", "Sending generation request..."]);
            ws.send(JSON.stringify({
                action: "generate",
                params: {
                    topic: aiTopic,
                    grade_level: aiGrade,
                    difficulty: aiDifficulty,
                    question_count: aiQuestionCount,
                    due_date: aiDueDate ? new Date(aiDueDate).toISOString() : null,
                    subject_id: Number(aiSubjectId),
                    class_id: Number(aiClassId),
                    teacher_id: Number(localStorage.getItem('userId')) || 1
                }
            }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "info") {
                setGenerationLogs(prev => [...prev, `[INFO] ${data.message}`]);
            } else if (data.type === "progress") {
                const step = data.details.step;
                let msg = `[${step.toUpperCase()}] ${data.status}`;
                if (data.details.prompt_preview) {
                    msg += `\nPAYLOAD:\n${data.details.prompt_preview}`;
                }
                if (data.details.raw_content_preview) {
                    msg += `\nRESPONSE:\n${data.details.raw_content_preview}`;
                }
                setGenerationLogs(prev => [...prev, msg]);
            } else if (data.type === "completed") {
                setGenerationLogs(prev => [...prev, `[SUCCESS] ${data.message}`]);
                setTimeout(() => {
                    fetchData();
                    closeAIModal();
                    setIsGenerating(false);
                    alert("AI Draft generated successfully!");
                }, 2000);
                ws.close();
            } else if (data.type === "error") {
                setGenerationLogs(prev => [...prev, `[ERROR] ${data.message}`]);
                setIsGenerating(false); // keep modal open to see error
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            setGenerationLogs(prev => [...prev, "[ERROR] WebSocket connection failed."]);
            setIsGenerating(false);
        };

        ws.onclose = () => {
            console.log("WebSocket closed");
        };
    };

    // ... (rest of methods)

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this assignment?")) return;
        try {
            await api.delete(`/teacher/assignments/${id}`);
            fetchData();
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Failed to delete assignment.");
        }
    };

    const handlePublish = async (id: number) => {
        if (!confirm("Are you sure you want to publish this quiz? Students will be able to see it immediately.")) return;
        try {
            await api.put(`/teacher/assignments/${id}/publish`);
            fetchData();
            alert("Quiz published successfully!");
        } catch (error) {
            console.error("Failed to publish", error);
            alert("Failed to publish quiz.");
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewTitle('');
        setNewDesc('');
        setSelectedSubjectId('');
        setSelectedClassId('');
        setNewDueDate('');
    };

    const closeAIModal = () => {
        setIsAIModalOpen(false);
        setAiTopic('');
        setAiGrade('Grade 10');
        setAiDifficulty('Medium');
        setAiQuestionCount(10);
        setAiQuestionType('Multiple Choice');
        setAiDueDate('');
        setAiSubjectId('');
        setAiClassId('');
        setIsGenerating(false);
        setGenerationLogs([]);
    };

    // ... helper functions ...
    const getClassName = (id?: number | null) => {
        if (!id) return "N/A";
        const c = classes.find(c => c.id === id);
        return c ? `${c.name} (${c.section})` : "Unknown Class";
    };

    const getSubjectName = (id?: number | null) => {
        if (!id) return "General";
        const s = subjects.find(s => s.id === id);
        return s ? s.name : "Unknown Subject";
    };

    return (
        <div className="space-y-6">
            {/* ... (Header and Lists same as before) ... */}
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

            <div className="flex space-x-4 border-b border-slate-200">
                {['Draft', 'Published', 'All'].map((status) => (
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
                        {assignment.title.includes('AI') && (
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <span className="text-6xl">✨</span>
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${assignment.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {assignment.status}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">{getSubjectName(assignment.subject_id)}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10">{assignment.title}</h3>
                        <p className="text-slate-600 text-sm mb-4 line-clamp-2 relative z-10">{assignment.description}</p>
                        <div className="text-xs text-slate-500 space-y-1 relative z-10">
                            <p><strong>Due:</strong> {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No Due Date'}</p>
                            <p><strong>Assigned to:</strong> {getClassName(assignment.class_id)}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                            <div className="flex gap-2">
                                {assignment.status === 'DRAFT' && (
                                    <button
                                        onClick={() => handlePublish(assignment.id)}
                                        className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium transition-colors shadow-sm"
                                    >
                                        Publish
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(assignment.id)}
                                    className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-medium transition-colors shadow-sm"
                                >
                                    Delete
                                </button>
                            </div>
                            <Link
                                to={`/teacher/assignments/${assignment.id}/questions`}
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center ml-auto"
                            >
                                Manage Questions →
                            </Link>
                        </div>
                    </div>
                ))}
                {!loading && filteredAssignments.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500">
                        No assignments found.
                    </div>
                )}
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                    <select
                                        required
                                        value={selectedSubjectId}
                                        onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                                    <input type="date" required value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Assign To (Class)</label>
                                <select
                                    required
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">Select Class</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.section})</option>
                                    ))}
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

            {/* AI Modal */}
            {isAIModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden transition-all duration-300" style={{ maxWidth: isGenerating ? '700px' : '512px' }}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full blur-3xl -z-10 -mr-16 -mt-16"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -z-10 -ml-16 -mb-16"></div>

                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">✨</span>
                                <h2 className="text-xl font-bold text-slate-900">Generate Quiz with AI</h2>
                            </div>
                            <button onClick={closeAIModal} disabled={isGenerating} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">✕</button>
                        </div>

                        {isGenerating ? (
                            <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400 h-96 overflow-y-auto shadow-inner flex flex-col font-light">
                                <div className="mb-2 text-slate-400 border-b border-slate-700 pb-2">Live Generation Log</div>
                                {generationLogs.map((log, i) => (
                                    <div key={i} className="mb-1 whitespace-pre-wrap">{log}</div>
                                ))}
                                {/* Dummy div to scroll to bottom? */}
                                <div className="mt-auto pt-2 text-center text-slate-500 animate-pulse">Processing...</div>
                            </div>
                        ) : (
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                        <select
                                            required
                                            value={aiSubjectId}
                                            onChange={(e) => setAiSubjectId(Number(e.target.value))}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        >
                                            <option value="">Select Subject</option>
                                            {subjects.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                                        <select
                                            required
                                            value={aiClassId}
                                            onChange={(e) => {
                                                const id = Number(e.target.value);
                                                setAiClassId(id);
                                                // Auto-update grade level based on class if needed for prompt
                                                const cls = classes.find(c => c.id === id);
                                                if (cls) setAiGrade(cls.grade?.name || 'Grade 10');
                                            }}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        >
                                            <option value="">Select Class</option>
                                            {classes.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        {aiClassId && (
                                            <div className="mt-1 text-xs text-slate-500 flex gap-2">
                                                <span>Section: {classes.find(c => c.id === aiClassId)?.section}</span>
                                                <span>•</span>
                                                <span>Grade: {classes.find(c => c.id === aiClassId)?.grade?.name || 'N/A'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
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
                                </div>

                                <div className="grid grid-cols-2 gap-4">
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
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={aiDueDate}
                                            onChange={(e) => setAiDueDate(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        />
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
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherAssignments;
