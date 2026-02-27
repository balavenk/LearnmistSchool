import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';

// Types
interface Assignment {
    id: number;
    title: string;
    description: string;
    subject_id?: number | null;
    grade_id?: number | null;
    class_id?: number | null;
    grade_name?: string;
    subject_name?: string;
    due_date?: string;
    status: 'PUBLISHED' | 'DRAFT';
    assignedTo?: string;
}

interface GradeOption {
    id: number;
    name: string;
}

interface SubjectOption {
    id: number;
    name: string;
}

// Performance Optimized Sub-components
interface AssignmentCardProps {
    assignment: Assignment;
    getSubjectName: (assignment: Assignment) => string;
    getSubjectColor: (id?: number | null) => string;
    getGradeName: (assignment: Assignment) => string;
    openEditModal: (assignment: Assignment) => void;
    handlePublish: (id: number) => void;
    handleDelete: (id: number) => void;
}

const AssignmentCard = React.memo(({
    assignment,
    getSubjectName,
    getSubjectColor,
    getGradeName,
    openEditModal,
    handlePublish,
    handleDelete
}: AssignmentCardProps) => {
    return (
        <div className="group bg-white rounded-2xl shadow-md border-2 border-slate-200 hover:border-indigo-300 p-6 hover:shadow-xl transition-all duration-300 relative overflow-hidden transform hover:-translate-y-1">
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
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 ${assignment.status === 'PUBLISHED'
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
                    {getSubjectName(assignment)}
                </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2 relative z-10 group-hover:text-indigo-600 transition-colors">{assignment.title}</h3>
            <p className="text-slate-600 text-sm mb-4 line-clamp-2 relative z-10 leading-relaxed">{assignment.description}</p>

            <div className="space-y-2 relative z-10 mb-4">
                <div
                    onClick={() => assignment.status === 'DRAFT' && openEditModal(assignment)}
                    className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 transition-all duration-200 ${assignment.status === 'DRAFT'
                        ? 'bg-indigo-50 text-indigo-700 cursor-pointer hover:bg-indigo-100 hover:shadow-sm border border-transparent hover:border-indigo-200 group/date'
                        : 'text-slate-600 bg-slate-50'
                        }`}
                    title={assignment.status === 'DRAFT' ? 'Click to edit due date' : ''}
                >
                    <svg className={`w-4 h-4 ${assignment.status === 'DRAFT' ? 'text-indigo-600' : 'text-indigo-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Due:</span>
                    <span className={`font-semibold ${assignment.status === 'DRAFT' ? 'text-indigo-900 group-hover/date:underline' : 'text-slate-700'}`}>
                        {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No deadline'}
                    </span>
                    {assignment.status === 'DRAFT' && (
                        <svg className="w-3 h-3 ml-auto opacity-0 group-hover/date:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    )}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="font-medium">Grade:</span>
                    <span className="text-slate-700 font-semibold">{getGradeName(assignment)}</span>
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
                <div className="flex flex-col sm:flex-row gap-2">
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
    );
});

const TeacherAssignments: React.FC = () => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [grades, setGrades] = useState<GradeOption[]>([]);
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [filter, setFilter] = useState('Draft');

    // Form State (Manual)
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
    const [selectedGradeId, setSelectedGradeId] = useState<number | ''>('');
    const [newDueDate, setNewDueDate] = useState('');

    // Form State (AI)
    const [aiTopic, setAiTopic] = useState('');
    const [aiGradeLevel, setAiGradeLevel] = useState('Grade 10');
    const [aiDifficulty, setAiDifficulty] = useState('Medium');
    const [aiQuestionCount, setAiQuestionCount] = useState(10);
    const [aiQuestionType, setAiQuestionType] = useState('Multiple Choice');
    const [aiDueDate, setAiDueDate] = useState('');
    const [aiSubjectId, setAiSubjectId] = useState<number | ''>('');
    const [aiGradeId, setAiGradeId] = useState<number | ''>('');
    const [aiUsePdfContext, setAiUsePdfContext] = useState(false);

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [editDueDate, setEditDueDate] = useState('');


    // Fetch Data
    const fetchData = React.useCallback(async () => {
        try {
            setLoading(true);
            const [assignmentsRes, gradesRes, subjectsRes] = await Promise.all([
                api.get('/teacher/assignments/'),
                api.get('/teacher/grades/'),
                api.get('/teacher/subjects/')
            ]);
            setAssignments(assignmentsRes.data);
            setGrades(gradesRes.data);
            setSubjects(subjectsRes.data);
        } catch (error) {
            console.error("Failed to fetch teacher data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
                grade_id: selectedGradeId !== '' ? Number(selectedGradeId) : null,
                subject_id: selectedSubjectId !== '' ? Number(selectedSubjectId) : null
            });
            fetchData();
            closeModal();
            toast.success("Assignment created successfully!");
        } catch (error) {
            console.error("Failed to create assignment", error);
            toast.error("Failed to create assignment.");
        }
    };

    const [isGenerating, setIsGenerating] = useState(false);

    const handleAIGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("🚀 [AI GEN] Generate Quiz button clicked");
        setIsGenerating(true);

        if (aiSubjectId === '' || aiGradeId === '') {
            toast.error("Please select a subject and grade first.");
            setIsGenerating(false);
            return;
        }

        const payload = {
            topic: aiTopic,
            grade_level: aiGradeLevel,
            difficulty: aiDifficulty,
            question_count: aiQuestionCount,
            question_type: aiQuestionType,
            due_date: aiDueDate ? new Date(aiDueDate).toISOString() : null,
            subject_id: Number(aiSubjectId),
            grade_id: Number(aiGradeId),
            use_pdf_context: aiUsePdfContext
        };

        console.log("🌐 [AI GEN] Calling API /teacher/assignments/ai-generate with payload:", payload);

        try {
            const response = await api.post('/teacher/assignments/ai-generate', payload);
            console.log("✅ [AI GEN] API Call Successful. Data:", response.data);

            toast.success("AI Draft generated successfully!");

            console.log("🔄 [AI GEN] Refreshing assignment list...");
            fetchData();

            console.log("✨ [AI GEN] Generation Complete. Closing modal.");
            setTimeout(() => {
                closeAIModal();
            }, 1000);
        } catch (error: any) {
            console.error("❌ [AI GEN] Failed", error.response?.data || error.message);
            toast.error(error.response?.data?.detail || "Failed to generate AI quiz.");
            setIsGenerating(false);
        }
    };

    const handleUpdateDueDate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAssignment) return;

        try {
            await api.patch(`/teacher/assignments/${editingAssignment.id}`, {
                due_date: editDueDate ? new Date(editDueDate).toISOString() : null
            });
            toast.success("Assignment updated successfully!");
            fetchData();
            closeEditModal();
        } catch (error) {
            console.error("Failed to update assignment", error);
            toast.error("Failed to update assignment.");
        }
    };

    const openEditModal = React.useCallback((assignment: Assignment) => {
        setEditingAssignment(assignment);
        // Format YYYY-MM-DD for input[type=date]
        if (assignment.due_date) {
            setEditDueDate(new Date(assignment.due_date).toISOString().split('T')[0]);
        } else {
            setEditDueDate('');
        }
        setIsEditModalOpen(true);
    }, []);

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingAssignment(null);
        setEditDueDate('');
    };

    // ... (rest of methods)

    const handleDelete = React.useCallback(async (id: number) => {
        if (!confirm("Are you sure you want to delete this assignment?")) return;
        try {
            await api.delete(`/teacher/assignments/${id}`);
            fetchData();
        } catch (error) {
            console.error("Failed to delete", error);
            toast.error("Failed to delete assignment.");
        }
    }, [fetchData]);

    const handlePublish = React.useCallback(async (id: number) => {
        if (!confirm("Are you sure you want to publish this quiz? Students will be able to see it immediately.")) return;
        try {
            await api.put(`/teacher/assignments/${id}/publish`);
            fetchData();
            toast.success("Quiz published successfully!");
        } catch (error) {
            console.error("Failed to publish", error);
            toast.error("Failed to publish quiz.");
        }
    }, [fetchData]);

    const closeModal = () => {
        setIsModalOpen(false);
        setNewTitle('');
        setNewDesc('');
        setSelectedSubjectId('');
        setSelectedGradeId('');
        setNewDueDate('');
    };

    const closeAIModal = () => {
        setIsAIModalOpen(false);
        setAiTopic('');
        setAiGradeLevel('Grade 10');
        setAiDifficulty('Medium');
        setAiQuestionCount(10);
        setAiQuestionType('Multiple Choice');
        setAiDueDate('');
        setAiSubjectId('');
        setAiGradeId('');
        setAiUsePdfContext(false);
        setIsGenerating(false);
    };

    // Memoized Lookups for O(1) performance
    const gradesMap = useMemo(() => {
        const map: Record<number, string> = {};
        grades.forEach(g => { map[g.id] = g.name; });
        return map;
    }, [grades]);

    const subjectsMap = useMemo(() => {
        const map: Record<number, string> = {};
        subjects.forEach(s => { map[s.id] = s.name; });
        return map;
    }, [subjects]);

    const statusCounts = useMemo(() => ({
        Draft: assignments.filter(a => a.status === 'DRAFT').length,
        Published: assignments.filter(a => a.status === 'PUBLISHED').length,
        All: assignments.length
    }), [assignments]);

    const getGradeName = (assignment: Assignment) => {
        if (assignment.grade_name && assignment.grade_name !== "N/A") return assignment.grade_name;
        const id = assignment.grade_id || assignment.class_id;
        if (!id) return "N/A";
        return gradesMap[id] || `Grade #${id}`;
    };

    const getSubjectName = (assignment: Assignment) => {
        if (assignment.subject_name && assignment.subject_name !== "General") return assignment.subject_name;
        if (!assignment.subject_id) return "General";
        return subjectsMap[assignment.subject_id] || "Unknown Subject";
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
                        className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-200 relative flex items-center justify-center gap-2 ${filter === status
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
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${filter === status ? 'bg-white/20' : 'bg-slate-200 text-slate-700'
                            }`}>
                            {statusCounts[status as keyof typeof statusCounts]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Enhanced Assignments Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAssignments.map((assignment) => (
                    <AssignmentCard
                        key={assignment.id}
                        assignment={assignment}
                        getSubjectName={getSubjectName}
                        getSubjectColor={getSubjectColor}
                        getGradeName={getGradeName}
                        openEditModal={openEditModal}
                        handlePublish={handlePublish}
                        handleDelete={handleDelete}
                    />
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
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                    </svg>
                                    Assign To (Grade)
                                </label>
                                <select
                                    required
                                    value={selectedGradeId}
                                    onChange={(e) => setSelectedGradeId(Number(e.target.value))}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="">Select Grade</option>
                                    {grades.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
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
                            <div className="relative z-10 flex flex-col items-center justify-center py-12">
                                <div className="mb-8 relative">
                                    {/* Spinner */}
                                    <div className="w-24 h-24 border-4 border-slate-100 border-t-purple-600 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <svg className="w-10 h-10 text-purple-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Generating Your Quiz</h3>
                                <p className="text-slate-500 text-center max-w-xs mb-6">
                                    Our AI is crafting specialized questions for <strong>{aiTopic}</strong>. This usually takes 20-40 seconds.
                                </p>
                                <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-medium animate-pulse border border-purple-100">
                                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-ping"></div>
                                    AI Brainstorming...
                                </div>
                                <p className="mt-8 text-xs text-slate-400">Check the browser console for detailed status.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleAIGenerate} className="space-y-5">

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                        <select
                                            required
                                            value={aiSubjectId}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const subId = val === "" ? "" : Number(val);
                                                setAiSubjectId(subId);
                                                const subject = subjects.find(s => s.id === subId);
                                                const grade = grades.find(g => g.id === aiGradeId);
                                                if (subject && grade) {
                                                    setAiTopic(`${subject.name} - ${grade.name}`);
                                                } else if (subject) {
                                                    setAiTopic(subject.name);
                                                }
                                            }}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        >
                                            <option value="">Select Subject</option>
                                            {subjects.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                                        <select
                                            required
                                            value={aiGradeId}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const id = val === "" ? "" : Number(val);
                                                setAiGradeId(id);
                                                // Auto-update grade level based on selected grade
                                                const grade = grades.find(g => g.id === id);
                                                if (grade) {
                                                    setAiGradeLevel(grade.name);
                                                    const subject = subjects.find(s => s.id === aiSubjectId);
                                                    if (subject) {
                                                        setAiTopic(`${subject.name} - ${grade.name}`);
                                                    } else {
                                                        setAiTopic(grade.name);
                                                    }
                                                }
                                            }}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        >
                                            <option value="">Select Grade</option>
                                            {grades.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
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
                                {/* PDF Context Checkbox */}
                                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="usePdfContext"
                                        checked={aiUsePdfContext}
                                        onChange={(e) => setAiUsePdfContext(e.target.checked)}
                                        className="mt-1 w-5 h-5 text-purple-600 border-purple-300 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                                    />
                                    <label htmlFor="usePdfContext" className="flex-1 cursor-pointer">
                                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Generate from Trained PDF/Book
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">
                                            Use questions from uploaded textbooks and PDFs. If unchecked, generates from general.
                                        </p>
                                    </label>
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
            {/* Edit Due Date Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8 relative overflow-hidden transform animate-slideUp">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-50 -mr-16 -mt-16"></div>

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-lg">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Edit Due Date</h2>
                            </div>
                            <button onClick={closeEditModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleUpdateDueDate} className="space-y-6 relative z-10">
                            <div>
                                <p className="text-sm text-slate-500 mb-4">
                                    Update the deadline for <strong>{editingAssignment?.title}</strong>.
                                </p>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">New Due Date</label>
                                <input
                                    type="date"
                                    required
                                    value={editDueDate}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <button type="button" onClick={closeEditModal} className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition-all">
                                    Save Changes
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
