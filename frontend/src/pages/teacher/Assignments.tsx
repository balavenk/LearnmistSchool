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

        // Dynamic WS URL (Production vs Local)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = import.meta.env.PROD ? window.location.host : '127.0.0.1:8000';
        const wsUrl = `${protocol}//${host}/ws/generate-quiz/${clientId}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setGenerationLogs(prev => [...prev, "Connected to server.", "Sending generation request..."]);
            ws.send(JSON.stringify({
                action: "generate",
                params: {
                    topic: aiTopic,
                    grade_level: aiGrade,
                    difficulty: aiDifficulty,
                    question_count: aiQuestionCount,
                    question_type: aiQuestionType,
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

    const getSubjectColor = (id?: number | null) => {
        const colors = [
            'bg-blue-50 text-blue-700 border-blue-200',
            'bg-green-50 text-green-700 border-green-200',
            'bg-purple-50 text-purple-700 border-purple-200',
            'bg-orange-50 text-orange-700 border-orange-200',
            'bg-pink-50 text-pink-700 border-pink-200',
            'bg-teal-50 text-teal-700 border-teal-200'
        ];
        return id ? colors[id % colors.length] : 'bg-gray-50 text-gray-700 border-gray-200';
    };

    const getStatusCount = (status: string) => {
        if (status === 'All') return assignments.length;
        return assignments.filter(a => a.status === status.toUpperCase()).length;
    };

    return (
        <div className="space-y-6">
            {/* Header with gradient background */}
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Assignments & Quizzes</h1>
                        <p className="text-slate-600 mt-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Create, manage, and track all your assignments
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsAIModalOpen(true)}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl font-medium transition-all duration-200 flex items-center gap-2 transform hover:scale-105"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI Generate Quiz
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 px-6 py-3 rounded-xl shadow-md hover:shadow-lg font-medium transition-all duration-200 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Manually
                        </button>
                    </div>
                </div>
            </div>

            {/* Enhanced filter tabs with count badges */}
            <div className="flex space-x-2 bg-white rounded-xl p-2 shadow-sm border border-slate-200">
                {['Draft', 'Published', 'All'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-200 relative flex items-center justify-center gap-2 ${
                            filter === status
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md transform scale-105'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                        {status === 'Draft' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        )}
                        {status === 'Published' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        {status === 'All' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                        <span>{status}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            filter === status ? 'bg-white/20' : 'bg-slate-200 text-slate-700'
                        }`}>
                            {getStatusCount(status)}
                        </span>
                    </button>
                ))}
            </div>

            {/* Enhanced Assignments Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAssignments.map((assignment) => (
                    <div key={assignment.id} className="group bg-white rounded-2xl shadow-md border-2 border-slate-200 hover:border-indigo-300 p-6 hover:shadow-xl transition-all duration-300 relative overflow-hidden transform hover:-translate-y-1">
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-300 -mr-16 -mt-16"></div>
                        
                        {assignment.title.includes('AI') && (
                            <div className="absolute top-0 right-0 p-3">
                                <div className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-lg px-2 py-1 text-xs font-bold shadow-lg flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    AI
                                </div>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 ${
                                assignment.status === 'PUBLISHED' 
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                                    : 'bg-gradient-to-r from-gray-400 to-slate-400 text-white'
                            }`}>
                                {assignment.status === 'PUBLISHED' ? (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                )}
                                {assignment.status}
                            </span>
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getSubjectColor(assignment.subject_id)}`}>
                                {getSubjectName(assignment.subject_id)}
                            </span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-900 mb-2 relative z-10 group-hover:text-indigo-600 transition-colors">{assignment.title}</h3>
                        <p className="text-slate-600 text-sm mb-4 line-clamp-2 relative z-10 leading-relaxed">{assignment.description}</p>
                        
                        <div className="space-y-2 relative z-10 mb-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium">Due:</span>
                                <span className="text-slate-700 font-semibold">{assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No deadline'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <span className="font-medium">Class:</span>
                                <span className="text-slate-700 font-semibold">{getClassName(assignment.class_id)}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t-2 border-slate-100 flex flex-col gap-2 relative z-10">
                            <Link
                                to={`/teacher/assignments/${assignment.id}/questions`}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Manage Questions
                                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                            <div className="flex gap-2">
                                {assignment.status === 'DRAFT' && (
                                    <button
                                        onClick={() => handlePublish(assignment.id)}
                                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Publish
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(assignment.id)}
                                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {!loading && filteredAssignments.length === 0 && (
                    <div className="col-span-full py-16">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4">
                                <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No {filter.toLowerCase()} assignments yet</h3>
                            <p className="text-slate-500 mb-6">Get started by creating your first assignment</p>
                            <button
                                onClick={() => setIsAIModalOpen(true)}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl font-medium transition-all duration-200 inline-flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Create with AI
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Enhanced Create Manual Assignment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-8 relative overflow-hidden transform animate-slideUp">
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-100 to-cyan-100 rounded-full blur-3xl opacity-50 -ml-20 -mb-20"></div>
                        
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Create Assignment</h2>
                            </div>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateAssignment} className="space-y-5 relative z-10">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                    </svg>
                                    Assignment Title
                                </label>
                                <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Enter assignment title..." className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                    </svg>
                                    Description
                                </label>
                                <textarea required rows={3} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Describe the assignment..." className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                        Subject
                                    </label>
                                    <select
                                        required
                                        value={selectedSubjectId}
                                        onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Due Date
                                    </label>
                                    <input type="date" required value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    Assign To (Class)
                                </label>
                                <select
                                    required
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(Number(e.target.value))}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="">Select Class</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.section})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-6 border-t-2 border-slate-100 mt-6">
                                <button type="button" onClick={closeModal} className="flex-1 px-6 py-3 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold transition-all flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Create Assignment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Enhanced AI Modal */}
            {isAIModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full shadow-2xl p-8 relative overflow-hidden transition-all duration-300 transform animate-slideUp" style={{ maxWidth: isGenerating ? '800px' : '600px' }}>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-200 rounded-full blur-3xl opacity-40 -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-200 rounded-full blur-3xl opacity-40 -ml-20 -mb-20"></div>
                        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-pink-200 rounded-full blur-3xl opacity-30 transform -translate-x-1/2 -translate-y-1/2"></div>

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-purple-500 to-indigo-500 p-2.5 rounded-xl shadow-lg">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">AI Quiz Generator</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Powered by advanced AI</p>
                                </div>
                            </div>
                            <button onClick={closeAIModal} disabled={isGenerating} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors disabled:opacity-50">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {isGenerating ? (
                            <div className="relative z-10">
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 font-mono text-sm text-green-400 h-96 overflow-y-auto shadow-2xl flex flex-col border border-slate-700">
                                    <div className="mb-3 flex items-center justify-between text-slate-300 border-b border-slate-700 pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="font-semibold">Live Generation Log</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        </div>
                                    </div>
                                    {generationLogs.map((log, i) => (
                                        <div key={i} className="mb-1.5 whitespace-pre-wrap leading-relaxed animate-fadeIn">{log}</div>
                                    ))}
                                    <div className="mt-auto pt-3 text-center">
                                        <div className="inline-flex items-center gap-2 text-slate-400">
                                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping"></div>
                                            <span className="animate-pulse font-semibold">AI is working...</span>
                                        </div>
                                    </div>
                                </div>
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

                                <div className="flex gap-3 pt-6 border-t-2 border-slate-100 mt-6">
                                    <button type="button" onClick={closeAIModal} className="flex-1 px-6 py-3 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold transition-all flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex justify-center items-center gap-2 transform hover:scale-105"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Generate Quiz
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
