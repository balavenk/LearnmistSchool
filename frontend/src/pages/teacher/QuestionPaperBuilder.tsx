import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface SectionConfig {
    name: string;
    target_questions: number;
    marks_per_question: number;
}

interface PaperTemplate {
    id: number;
    name: string;
    description?: string;
    total_marks?: number;
    duration?: string;
    visibility: string;
    sections_config?: string;
    general_instructions?: string;
    created_by_id?: number;
    cloned_from_id?: number;
}

interface PaperConfig {
    title: string;
    board: string;
    grade: string;
    subject: string;
    exam_type: string;
    academic_year: string;
    total_marks: number;
    duration: string;
    set_number: string;
    sections_config: SectionConfig[];
    general_instructions: string[];
}

interface Question {
    id: number;
    text: string;
    points: number;
    question_type: string;
    difficulty_level: string;
    source_year?: string;
    source_type?: string;
    options: { text: string; is_correct: boolean }[];
}

const DEFAULT_CONFIG: PaperConfig = {
    title: '',
    board: 'CBSE',
    grade: '',
    subject: '',
    exam_type: 'Terminal',
    academic_year: '2024-25',
    total_marks: 80,
    duration: '3 Hours',
    set_number: '1',
    sections_config: [
        { name: 'A', target_questions: 20, marks_per_question: 1 },
        { name: 'B', target_questions: 5, marks_per_question: 2 },
        { name: 'C', target_questions: 6, marks_per_question: 3 },
        { name: 'D', target_questions: 4, marks_per_question: 5 },
    ],
    general_instructions: [
        'This question paper comprises multiple sections.',
        'There is no overall choice.',
        'Use of calculators is not permitted.',
    ],
};

const BADGE_STYLES: Record<string, string> = {
    system: 'bg-purple-100 text-purple-700',
    shared: 'bg-green-100 text-green-700',
    private: 'bg-blue-100 text-blue-700',
};
const BADGE_LABELS: Record<string, string> = {
    system: 'System',
    shared: 'Shared',
    private: 'Mine',
};

function parseSections(raw?: string): SectionConfig[] {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
}
function parseInstructions(raw?: string): string[] {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
}

// ─── Wizard step labels ───────────────────────────────────────────────────────
const STEP_LABELS = ['Pick Template', 'Paper Details', 'Questions', 'Preview / Export'];

// ─── Main Component ───────────────────────────────────────────────────────────

const QuestionPaperBuilder: React.FC = () => {
    const navigate = useNavigate();
    const { paperId } = useParams<{ paperId: string }>();
    const [searchParams] = useSearchParams();
    const preselectedTemplateId = searchParams.get('templateId');
    const isEditMode = !!paperId;

    const [currentStep, setCurrentStep] = useState(1);

    // Step 1 State — Template picker
    const [templates, setTemplates] = useState<PaperTemplate[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templateSearch, setTemplateSearch] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<PaperTemplate | null>(null);
    const [templateTab, setTemplateTab] = useState<'all' | 'system' | 'shared' | 'mine'>('all');

    // Step 2 State — Config
    const [config, setConfig] = useState<PaperConfig>(DEFAULT_CONFIG);
    const [templateId, setTemplateId] = useState<number | null>(null);

    // Metadata for dropdowns
    const [examTypes, setExamTypes] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);

    // Step 3 State — Question Filters
    const [availableYears, setAvailableYears] = useState<any[]>([]);
    const [filterYear, setFilterYear] = useState<string>('');
    const [filterSubjectId, setFilterSubjectId] = useState<number | ''>('');
    const [filterGradeId, setFilterGradeId] = useState<number | ''>('');
    const [filterDifficulty, setFilterDifficulty] = useState<string>('');
    const [filterPoints, setFilterPoints] = useState<number | ''>('');
    const [filterSourceType, setFilterSourceType] = useState<string>('');

    // Step 4 State — Questions
    const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
    const [mappedQuestions, setMappedQuestions] = useState<any[]>([]);
    const [createdPaperId, setCreatedPaperId] = useState<number | null>(null);
    const [questionsLoading, setQuestionsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // ─── Initial data fetching ─────────────────────────────────────────────────

    useEffect(() => {
        const fetchTemplates = async () => {
            setTemplatesLoading(true);
            try {
                const { data } = await api.get('/teacher/templates');
                setTemplates(data);
            } catch (e) { console.error(e); }
            finally { setTemplatesLoading(false); }
        };

        const fetchMetadata = async () => {
            try {
                const [examData, gradesData, subjectsData] = await Promise.all([
                    api.get('/teacher/exam-types/'),
                    api.get('/teacher/grades/'),
                    api.get('/teacher/subjects/'),
                ]);
                setExamTypes(examData.data);
                setGrades(gradesData.data);
                setSubjects(subjectsData.data);
                setConfig(prev => ({
                    ...prev,
                    grade: gradesData.data[0]?.name ?? prev.grade,
                    subject: subjectsData.data[0]?.name ?? prev.subject,
                }));
            } catch (e) { console.error(e); }
        };

        const fetchYears = async () => {
            try {
                const { data } = await api.get('/teacher/questions/years');
                setAvailableYears(data);
            } catch (e) { console.error(e); }
        };

        fetchTemplates();
        fetchMetadata();
        fetchYears();
    }, []);

    // Auto-select template from query param and skip to Step 2
    useEffect(() => {
        if (preselectedTemplateId && templates.length > 0) {
            const t = templates.find(t => t.id === parseInt(preselectedTemplateId));
            if (t) {
                applyTemplate(t, true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preselectedTemplateId, templates]);

    // ─── Load existing paper when editing ─────────────────────────────────────
    useEffect(() => {
        if (!isEditMode || !paperId) return;
        const loadPaper = async () => {
            try {
                toast.loading('Loading paper…', { id: 'load_paper' });
                const { data } = await api.get(`/teacher/papers/${paperId}`);
                // Populate config
                setCreatedPaperId(data.id);
                setConfig({
                    title: data.title || '',
                    board: data.board || 'CBSE',
                    grade: data.grade || '',
                    subject: data.subject || '',
                    exam_type: data.exam_type || 'Terminal',
                    academic_year: data.academic_year || '2024-25',
                    total_marks: data.total_marks || 80,
                    duration: data.duration || '3 Hours',
                    set_number: data.set_number || '1',
                    sections_config: parseSections(data.sections_config),
                    general_instructions: parseInstructions(data.general_instructions),
                });
                if (data.template_id) setTemplateId(data.template_id);
                // Load mapped questions
                if (data.mappings && data.mappings.length > 0) {
                    setMappedQuestions(data.mappings);
                }
                // Jump straight to step 3 (Questions)
                setCurrentStep(3);
                toast.success('Paper loaded!', { id: 'load_paper' });
            } catch (e) {
                console.error(e);
                toast.error('Failed to load paper', { id: 'load_paper' });
            }
        };
        loadPaper();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paperId, isEditMode]);

    // ─── Template application ──────────────────────────────────────────────────

    const applyTemplate = (t: PaperTemplate, skipToStep2 = false) => {
        setSelectedTemplate(t);
        setTemplateId(t.id);
        const secs = parseSections(t.sections_config);
        const instr = parseInstructions(t.general_instructions);
        setConfig(prev => ({
            ...prev,
            duration: t.duration ?? prev.duration,
            total_marks: t.total_marks ?? prev.total_marks,
            sections_config: secs.length ? secs : prev.sections_config,
            general_instructions: instr.length ? instr : prev.general_instructions,
        }));
        if (skipToStep2) setCurrentStep(2);
    };

    const handlePickTemplate = (t: PaperTemplate) => {
        applyTemplate(t, true);
        toast.success(`Template "${t.name}" applied!`);
    };

    const handleSkipTemplate = () => {
        setSelectedTemplate(null);
        setTemplateId(null);
        setConfig(DEFAULT_CONFIG);
        setCurrentStep(2);
    };

    // ─── Paper creation (Step 2 → 3) ──────────────────────────────────────────

    const handleCreatePaper = async () => {
        if (!config.title || !config.grade || !config.subject) {
            toast.error('Please fill required fields: Title, Grade, Subject');
            return;
        }
        try {
            toast.loading('Creating paper…', { id: 'create_paper' });
            const sum = config.sections_config.reduce(
                (acc, s) => acc + s.target_questions * s.marks_per_question, 0
            );
            const payload = {
                ...config,
                total_marks: sum,
                template_id: templateId,
                sections_config: JSON.stringify(config.sections_config),
                general_instructions: JSON.stringify(config.general_instructions),
            };
            const { data } = await api.post('/teacher/papers', payload);
            setCreatedPaperId(data.id);
            toast.success('Paper draft created!', { id: 'create_paper' });
            setCurrentStep(3);
            setCurrentPage(1);
            fetchQuestionsForSelection(1);
        } catch (error) {
            console.error(error);
            toast.error('Failed to create paper', { id: 'create_paper' });
        }
    };

    // ─── Questions (Step 4) ────────────────────────────────────────────────────

    const fetchQuestionsForSelection = useCallback(async (pageStr = 1) => {
        try {
            setQuestionsLoading(true);
            const params: any = { search: searchQuery, page: pageStr, page_size: 20 };
            
            if (filterSubjectId) params.subject_id = filterSubjectId;
            if (filterGradeId) params.grade_id = filterGradeId;
            if (filterDifficulty) params.difficulty = filterDifficulty;
            if (filterYear && filterYear !== '__custom__') params.source_year = filterYear;
            if (filterSourceType) params.source_type = filterSourceType;
            if (filterPoints !== '') params.points = filterPoints;

            const { data } = await api.get('/teacher/questions/', { params });
            setAvailableQuestions(data.items);
            setCurrentPage(data.page);
            setTotalPages(data.total_pages || data.pages || 1);
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch questions');
        } finally {
            setQuestionsLoading(false);
        }
    }, [searchQuery, filterSubjectId, filterGradeId, filterDifficulty, filterYear, filterPoints, filterSourceType]);

    const handleProceedToPreview = async () => {
        if (!createdPaperId) return;
        try {
            toast.loading('Loading preview details…', { id: 'preview_load' });
            const { data } = await api.get(`/teacher/papers/${createdPaperId}`);
            // Update mappedQuestions with the detailed mappings from server
            setMappedQuestions(data.mappings || []);
            toast.success('Preview ready!', { id: 'preview_load' });
            setCurrentStep(4);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load paper details', { id: 'preview_load' });
        }
    };

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;

        if (source.droppableId === 'bank' && destination.droppableId.startsWith('section-')) {
            const sectionName = destination.droppableId.split('-')[1];
            const qId = parseInt(draggableId.split('-')[1]);
            if (!createdPaperId) return;

            // 1. Check Section Limit
            const sectionConfig = config.sections_config.find(s => s.name === sectionName);
            const currentQuestionsCount = mappedQuestions.filter(mq => mq.section_name === sectionName).length;

            if (sectionConfig && currentQuestionsCount >= sectionConfig.target_questions) {
                toast.error(`Section ${sectionName} is full (${sectionConfig.target_questions} questions max)`);
                return;
            }

            try {
                toast.loading('Mapping question…', { id: 'map_q' });
                const { data } = await api.post(`/teacher/papers/${createdPaperId}/map-question`, {
                    question_id: qId,
                    section_name: sectionName,
                    order_in_section: destination.index,
                });
                setMappedQuestions([...mappedQuestions, data]);
                setAvailableQuestions(availableQuestions.filter(q => q.id !== qId));
                toast.success('Question mapped!', { id: 'map_q' });
            } catch (error) {
                console.error(error);
                toast.error('Failed to map question', { id: 'map_q' });
            }
        }

        if (source.droppableId.startsWith('section-') && destination.droppableId === 'bank') {
            const mappingId = parseInt(draggableId.split('-')[1]);
            const mapping = mappedQuestions.find(m => m.id === mappingId);
            if (!mapping || !createdPaperId) return;
            try {
                toast.loading('Removing…', { id: 'unmap_q' });
                await api.delete(`/teacher/papers/${createdPaperId}/map-question/${mapping.id}`);
                setMappedQuestions(mappedQuestions.filter(m => m.id !== mapping.id));
                toast.success('Question removed', { id: 'unmap_q' });
            } catch (error) {
                console.error(error);
                toast.error('Failed to remove question', { id: 'unmap_q' });
            }
        }
    };

    const unmapQuestion = async (qId: number) => {
        const mapping = mappedQuestions.find(m => m.question_id === qId);
        if (!mapping || !createdPaperId) return;
        try {
            await api.delete(`/teacher/papers/${createdPaperId}/map-question/${mapping.id}`);
            setMappedQuestions(mappedQuestions.filter(m => m.id !== mapping.id));
            fetchQuestionsForSelection(currentPage);
        } catch (error) { console.error(error); }
    };

    // ─── PDF Export (Step 5) ───────────────────────────────────────────────────

    const generatePdfAndFinish = async () => {
        if (!createdPaperId) return;
        try {
            toast.loading('Generating PDF…', { id: 'pdf_gen' });
            const response = await api.post(`/teacher/papers/${createdPaperId}/export`, {}, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${config.title || 'Question_Paper'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            toast.success('PDF Downloaded!', { id: 'pdf_gen' });
            setCurrentStep(5);
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate PDF', { id: 'pdf_gen' });
        }
    };

    // ─── Section builder helper ────────────────────────────────────────────────

    const updateSection = (index: number, field: string, value: any) => {
        const newSecs = [...config.sections_config];
        newSecs[index] = { ...newSecs[index], [field]: value };
        setConfig({ ...config, sections_config: newSecs });
    };

    // ─── Filtered templates for Step 1 ────────────────────────────────────────

    const filteredTemplates = templates.filter(t => {
        const matchesTab =
            templateTab === 'all' ? true :
                templateTab === 'system' ? t.visibility === 'system' :
                    templateTab === 'shared' ? t.visibility === 'shared' :
                        t.visibility === 'private';
        const matchesSearch = !templateSearch.trim() ||
            t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
            (t.description ?? '').toLowerCase().includes(templateSearch.toLowerCase());
        return matchesTab && matchesSearch;
    });

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* Wizard Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100 flex items-center justify-between mb-4 mb-6">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">Question Paper Builder</h1>
                    <button
                        onClick={() => navigate('/teacher/papers')}
                        className="text-slate-500 hover:text-slate-700 font-medium"
                    >
                        Cancel
                    </button>
                </div>

                {/* Stepper */}
                <div className="flex items-center justify-between">
                    {STEP_LABELS.map((label, idx) => {
                        const step = idx + 1;
                        const isDone = currentStep > step;
                        const isActive = currentStep === step;
                        const canClick = isDone; // only completed steps are clickable
                        return (
                            <div key={step} className="flex flex-col items-center flex-1">
                                <button
                                    onClick={() => canClick ? setCurrentStep(step) : undefined}
                                    disabled={!canClick}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all
                                        ${isDone ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-110 cursor-pointer ring-2 ring-indigo-200' :
                                        isActive ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 cursor-default' :
                                        'bg-slate-100 text-slate-400 cursor-default'}
                                    `}
                                    title={canClick ? `Go back to ${label}` : undefined}
                                >
                                    {isDone ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : step}
                                </button>
                                <span className={`text-xs mt-2 font-medium text-center leading-tight ${
                                    isDone || isActive ? 'text-indigo-900' : 'text-slate-400'
                                }`}>
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">

                {/* ── STEP 1: Pick Template ── */}
                {currentStep === 1 && (
                    <div className="flex flex-col h-full">
                        {/* Step header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Pick a Template</h2>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    Select a blueprint — sections will auto-fill in the next step. You can tweak everything.
                                </p>
                            </div>
                            <button
                                onClick={handleSkipTemplate}
                                className="text-sm text-slate-500 hover:text-slate-700 font-medium border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition"
                            >
                                Start from Scratch →
                            </button>
                        </div>

                        {/* Tab + Search bar */}
                        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-4">
                            <div className="flex gap-1">
                                {(['all', 'system', 'shared', 'mine'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setTemplateTab(tab)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${templateTab === tab
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        {tab === 'mine' ? 'My Templates' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <input
                                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                placeholder="Search templates…"
                                value={templateSearch}
                                onChange={e => setTemplateSearch(e.target.value)}
                            />
                        </div>

                        {/* Template grid */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {templatesLoading ? (
                                <div className="flex justify-center py-16">
                                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                </div>
                            ) : filteredTemplates.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <p className="text-lg font-medium mb-1">No templates found</p>
                                    <p className="text-sm">
                                        Create one on the{' '}
                                        <button
                                            onClick={() => navigate('/teacher/templates')}
                                            className="text-indigo-500 underline"
                                        >
                                            Templates page
                                        </button>
                                        , or start from scratch.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredTemplates.map(t => {
                                        const secs = parseSections(t.sections_config);
                                        const isSelected = selectedTemplate?.id === t.id;
                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedTemplate(t)}
                                                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${isSelected
                                                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                                        : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm bg-white'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLES[t.visibility] ?? BADGE_STYLES.private}`}>
                                                        {BADGE_LABELS[t.visibility] ?? t.visibility}
                                                    </span>
                                                    {isSelected && (
                                                        <span className="text-indigo-600">
                                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="font-bold text-slate-900 text-sm mb-1 leading-tight">{t.name}</h3>
                                                {t.description && (
                                                    <p className="text-xs text-slate-500 line-clamp-1 mb-2">{t.description}</p>
                                                )}
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                                    {t.total_marks != null && <span className="font-semibold text-indigo-700">{t.total_marks} Marks</span>}
                                                    {t.duration && <span>· {t.duration}</span>}
                                                </div>
                                                {secs.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {secs.map((s, i) => (
                                                            <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full shadow-sm">
                                                                <span className="font-bold text-indigo-500">{s.name}</span>: {s.target_questions} Qs ({s.marks_per_question}M)
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="mt-4 flex justify-end">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-indigo-600' : 'text-slate-400 opacity-0 group-hover:opacity-100 transition'}`}>
                                                        {isSelected ? 'Selected blueprint' : 'Click to select blueprint'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Step 1 Footer */}
                        <div className="p-6 border-t border-slate-100 flex items-center justify-between">
                            <div className="text-sm text-slate-500">
                                {selectedTemplate
                                    ? <span>Selected: <strong className="text-slate-700">{selectedTemplate.name}</strong></span>
                                    : <span className="italic">No template selected</span>
                                }
                            </div>
                            <button
                                onClick={() => selectedTemplate ? handlePickTemplate(selectedTemplate) : handleSkipTemplate()}
                                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition shadow"
                            >
                                {selectedTemplate ? 'Use This Template →' : 'Start from Scratch →'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Paper Details ── */}
                {currentStep === 2 && (
                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">
                        {/* Left Panel: Paper meta */}
                        <div className="p-6 flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900">Paper Details</h2>
                                {selectedTemplate && (
                                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                                        📐 From: {selectedTemplate.name}
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col">
                                    <span className="text-sm font-medium mb-1">Title *</span>
                                    <input
                                        className="border border-slate-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                        value={config.title}
                                        onChange={e => setConfig({ ...config, title: e.target.value })}
                                        placeholder="e.g. Half Yearly 2025"
                                    />
                                </label>
                                <label className="flex flex-col">
                                    <span className="text-sm font-medium mb-1">Exam Type</span>
                                    <select
                                        className="border border-slate-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                        value={config.exam_type}
                                        onChange={e => setConfig({ ...config, exam_type: e.target.value })}
                                    >
                                        <option value="">Select Type</option>
                                        <option value="Terminal">Terminal</option>
                                        <option value="Half Yearly">Half Yearly</option>
                                        {examTypes.map(et => (
                                            <option key={et.id} value={et.name}>{et.name}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col">
                                    <span className="text-sm font-medium mb-1">Grade *</span>
                                    <select
                                        className="border border-slate-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                        value={config.grade}
                                        onChange={e => setConfig({ ...config, grade: e.target.value })}
                                    >
                                        <option value="">Select Grade</option>
                                        {grades.map(g => (
                                            <option key={g.id} value={g.name}>{g.name}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex flex-col">
                                    <span className="text-sm font-medium mb-1">Subject *</span>
                                    <select
                                        className="border border-slate-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                        value={config.subject}
                                        onChange={e => setConfig({ ...config, subject: e.target.value })}
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <label className="flex flex-col">
                                    <span className="text-sm font-medium mb-1">Duration</span>
                                    <input
                                        type="text"
                                        className={`border border-slate-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${!!selectedTemplate ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                                        value={config.duration}
                                        onChange={e => setConfig({ ...config, duration: e.target.value })}
                                        placeholder="e.g. 3 Hours"
                                        disabled={!!selectedTemplate}
                                    />
                                </label>
                                <label className="flex flex-col">
                                    <span className="text-sm font-medium mb-1">Academic Year</span>
                                    <input
                                        className="border border-slate-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                        value={config.academic_year}
                                        onChange={e => setConfig({ ...config, academic_year: e.target.value })}
                                        placeholder="e.g. 2024-25"
                                    />
                                </label>
                                <label className="flex flex-col">
                                    <span className="text-sm font-medium mb-1">Set Number</span>
                                    <input
                                        className="border border-slate-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                        value={config.set_number}
                                        onChange={e => setConfig({ ...config, set_number: e.target.value })}
                                        placeholder="e.g. 1"
                                    />
                                </label>
                            </div>
                            <label className="flex flex-col pt-2">
                                <span className="text-sm font-medium mb-1">General Instructions (one per line)</span>
                                <textarea
                                    className={`border border-slate-300 p-2 rounded-lg font-mono text-sm h-32 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none ${!!selectedTemplate ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                                    value={config.general_instructions.join('\n')}
                                    onChange={e => setConfig({ ...config, general_instructions: e.target.value.split('\n') })}
                                    disabled={!!selectedTemplate}
                                />
                            </label>
                        </div>

                        {/* Right Panel: Section Builder */}
                        <div className="p-6 flex-1 bg-slate-50 space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-900">Section Builder</h2>
                                {!selectedTemplate && (
                                    <button
                                        className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition"
                                        onClick={() => setConfig({
                                            ...config,
                                            sections_config: [
                                                ...config.sections_config,
                                                { name: String.fromCharCode(65 + config.sections_config.length), target_questions: 5, marks_per_question: 1 }
                                            ]
                                        })}
                                    >
                                        + Add Section
                                    </button>
                                )}
                            </div>

                            <table className="w-full text-left text-sm mb-4">
                                <thead>
                                    <tr className="text-slate-500 border-b">
                                        <th className="pb-2">Section</th>
                                        <th className="pb-2">Qty</th>
                                        <th className="pb-2">Marks/Q</th>
                                        <th className="pb-2 text-right">Subtotal</th>
                                        <th className="pb-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {config.sections_config.map((sec, idx) => (
                                        <tr key={idx} className="border-b border-white">
                                            <td className="py-2">
                                                <input className={`w-12 p-1 border rounded ${!!selectedTemplate ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} value={sec.name} onChange={e => updateSection(idx, 'name', e.target.value)} disabled={!!selectedTemplate} />
                                            </td>
                                            <td className="py-2">
                                                <input type="number" min="1" className={`w-16 p-1 border rounded ${!!selectedTemplate ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} value={sec.target_questions} onChange={e => updateSection(idx, 'target_questions', Math.max(1, parseInt(e.target.value) || 1))} disabled={!!selectedTemplate} />
                                            </td>
                                            <td className="py-2">
                                                <input type="number" min="1" className={`w-16 p-1 border rounded ${!!selectedTemplate ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} value={sec.marks_per_question} onChange={e => updateSection(idx, 'marks_per_question', Math.max(1, parseInt(e.target.value) || 1))} disabled={!!selectedTemplate} />
                                            </td>
                                            <td className="py-2 text-right font-medium text-slate-700">
                                                {sec.target_questions * sec.marks_per_question}
                                            </td>
                                            <td className="py-2 pl-2">
                                                {!selectedTemplate && (
                                                    <button
                                                        onClick={() => setConfig({ ...config, sections_config: config.sections_config.filter((_, i) => i !== idx) })}
                                                        className="text-red-400 hover:text-red-600 transition"
                                                        title="Remove section"
                                                    >✕</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={3} className="py-4 text-right font-bold text-slate-800">Total Marks Expected:</td>
                                        <td className="py-4 text-right font-bold text-indigo-700 text-lg">
                                            {config.sections_config.reduce((acc, s) => acc + s.target_questions * s.marks_per_question, 0)}
                                        </td>
                                        <td />
                                    </tr>
                                </tbody>
                            </table>

                            <div className="flex items-center justify-between pt-4">
                                <button
                                    onClick={() => setCurrentStep(1)}
                                    className="px-4 py-2 text-slate-600 font-medium rounded-lg hover:bg-slate-100 transition text-sm"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={handleCreatePaper}
                                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition"
                                >
                                    Save & Continue →
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Questions & Filters ── */}
                {currentStep === 3 && (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex h-[calc(100vh-200px)] min-h-[600px] divide-x border-t w-full">
                            {/* Left Pane: Filtered Bank */}
                            <div className="w-1/2 flex flex-col bg-slate-50 border-r border-slate-200">
                                <div className="p-4 bg-white border-b border-slate-200 space-y-3 shadow-sm z-10">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800">Question Bank</h3>
                                        <input
                                            className="text-sm p-1.5 border border-slate-300 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            placeholder="Search questions…"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && fetchQuestionsForSelection(1)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-xs">
                                        <div className="space-y-1">
                                            <label className="font-bold text-slate-500 uppercase text-[9px]">Subject</label>
                                            <select
                                                className="w-full border border-slate-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 bg-white shadow-sm"
                                                value={filterSubjectId}
                                                onChange={e => setFilterSubjectId(e.target.value ? parseInt(e.target.value) : '')}
                                            >
                                                <option value="">All Subjects</option>
                                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="font-bold text-slate-500 uppercase text-[9px]">Grade</label>
                                            <select
                                                className="w-full border border-slate-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 bg-white shadow-sm"
                                                value={filterGradeId}
                                                onChange={e => setFilterGradeId(e.target.value ? parseInt(e.target.value) : '')}
                                            >
                                                <option value="">All Grades</option>
                                                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="font-bold text-slate-500 uppercase text-[9px]">Difficulty</label>
                                            <select
                                                className="w-full border border-slate-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 bg-white shadow-sm"
                                                value={filterDifficulty}
                                                onChange={e => setFilterDifficulty(e.target.value)}
                                            >
                                                <option value="">All Diff.</option>
                                                <option value="Easy">Easy</option>
                                                <option value="Medium">Medium</option>
                                                <option value="Hard">Hard</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="font-bold text-slate-500 uppercase text-[9px]">Year</label>
                                            <select
                                                className="w-full border border-slate-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 bg-white shadow-sm"
                                                value={filterYear === '__custom__' ? '' : filterYear}
                                                onChange={e => setFilterYear(e.target.value)}
                                            >
                                                <option value="">All Years</option>
                                                {availableYears.map(y => (
                                                    <option key={y.year} value={y.year}>{y.year}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="font-bold text-slate-500 uppercase text-[9px]">Marks</label>
                                            <select
                                                className="w-full border border-slate-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 bg-white shadow-sm"
                                                value={filterPoints}
                                                onChange={e => setFilterPoints(e.target.value ? parseInt(e.target.value) : '')}
                                            >
                                                <option value="">All Marks</option>
                                                {[1, 2, 3, 4, 5, 10].map(m => (
                                                    <option key={m} value={m}>{m} M</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="font-bold text-slate-500 uppercase text-[9px]">Source</label>
                                            <select
                                                className="w-full border border-slate-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 bg-white shadow-sm"
                                                value={filterSourceType}
                                                onChange={e => setFilterSourceType(e.target.value)}
                                            >
                                                <option value="">All Src.</option>
                                                <option value="AI">AI Gen.</option>
                                                <option value="Manual">Man.</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => fetchQuestionsForSelection(1)}
                                        className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 py-1.5 rounded-lg font-bold text-xs hover:bg-indigo-100 focus:ring-2 focus:ring-indigo-400 transition"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                                <Droppable droppableId="bank">
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 min-h-0 relative">
                                            {questionsLoading ? (
                                                <div className="flex items-center justify-center p-8 text-slate-400 animate-pulse">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                        Loading questions…
                                                    </div>
                                                </div>
                                            ) : availableQuestions.length === 0 ? (
                                                <div className="p-8 text-center text-slate-400 italic">No questions found matching criteria.</div>
                                            ) : availableQuestions.map((q, index) => {
                                                const isMapped = mappedQuestions.some(m => m.question_id === q.id);
                                                return (
                                                    <Draggable key={`bank-${q.id}`} draggableId={`q-${q.id}`} index={index} isDragDisabled={isMapped}>
                                                        {(prov) => (
                                                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                                                className={`p-3 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors ${isMapped ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:border-indigo-300'}`}>
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{q.points} Marks</span>
                                                                    <div className="flex gap-2 text-[10px] font-medium items-center">
                                                                        {isMapped && <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Already Added</span>}
                                                                        {q.difficulty_level && <span className="text-slate-500 uppercase tracking-wider">{q.difficulty_level}</span>}
                                                                        {q.source_year && <span className="text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{q.source_year}</span>}
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm text-slate-800 line-clamp-3 mb-2">{q.text}</p>
                                                                
                                                                {q.options && q.options.length > 0 && (
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 border-t pt-2 border-slate-100">
                                                                        {q.options.map((opt, idx) => (
                                                                            <div key={idx} className="flex gap-1.5 items-start text-[11px] text-slate-500">
                                                                                <span className="font-bold text-indigo-400">{String.fromCharCode(97 + idx)})</span>
                                                                                <span className="truncate">{opt.text}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            })}
                                            {provided.placeholder}
                                            {totalPages > 1 && (
                                                <div className="flex justify-between items-center p-3 mt-4 border-t border-slate-200 bg-white sticky bottom-0 rounded-b-lg shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                                                    <button 
                                                        onClick={() => fetchQuestionsForSelection(currentPage - 1)} 
                                                        disabled={currentPage <= 1}
                                                        className="px-3 py-1.5 text-xs font-bold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                                    >
                                                        ← Prev
                                                    </button>
                                                    <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded">
                                                        Page {currentPage} of {totalPages}
                                                    </span>
                                                    <button 
                                                        onClick={() => fetchQuestionsForSelection(currentPage + 1)} 
                                                        disabled={currentPage >= totalPages}
                                                        className="px-3 py-1.5 text-xs font-bold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                                    >
                                                        Next →
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>

                            {/* Right Pane: Paper Layout */}
                            <div className="w-1/2 flex flex-col bg-white">
                                <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white shadow-sm z-10">
                                    <h3 className="font-bold text-indigo-900">Your Paper ({mappedQuestions.length} Qs)</h3>
                                    <button onClick={handleProceedToPreview} className="bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 transition hover:shadow-lg flex items-center gap-1">
                                        Preview / Export <span className="text-indigo-200">→</span>
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 min-h-0">
                                    {config.sections_config.map((sec) => {
                                        const secMappings = mappedQuestions.filter(m => m.section_name === sec.name).sort((a, b) => a.order_in_section - b.order_in_section);
                                        const targetMarks = sec.target_questions * sec.marks_per_question;
                                        const currentMarks = secMappings.length * sec.marks_per_question;
                                        const isComplete = secMappings.length >= sec.target_questions;
                                        return (
                                            <div key={sec.name} className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:border-slate-300">
                                                <div className="bg-slate-100 p-3 border-b flex justify-between items-center">
                                                    <h4 className="font-bold text-slate-700">Section {sec.name}</h4>
                                                    <div className="text-xs font-bold flex gap-3">
                                                        <span className={isComplete ? 'text-green-600 bg-green-50 px-2 rounded-full py-0.5 border border-green-200' : 'text-slate-600 bg-slate-200 px-2 rounded-full py-0.5 border border-slate-300'}>
                                                            {secMappings.length} / {sec.target_questions} Qs
                                                        </span>
                                                        <span className={currentMarks >= targetMarks ? 'text-green-600 bg-green-50 px-2 rounded-full py-0.5 border border-green-200' : 'text-slate-600 bg-slate-200 px-2 rounded-full py-0.5 border border-slate-300'}>
                                                            {currentMarks} / {targetMarks} Marks
                                                        </span>
                                                    </div>
                                                </div>
                                                <Droppable droppableId={`section-${sec.name}`}>
                                                    {(provided) => (
                                                        <div ref={provided.innerRef} {...provided.droppableProps} className="p-3 min-h-[120px] space-y-2 bg-slate-50 relative">
                                                            {secMappings.map((m, idx) => (
                                                                <Draggable key={`map-${m.id}`} draggableId={`mapped-${m.id}`} index={idx}>
                                                                    {(prov) => (
                                                                        <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                                                            className="p-2 border border-slate-200 rounded-lg bg-white flex justify-between items-center group cursor-grab active:cursor-grabbing hover:border-indigo-300 shadow-sm transition">
                                                                            <span className="text-xs font-bold w-6 text-slate-400 bg-slate-100 rounded text-center py-0.5 mr-2">Q{idx + 1}</span>
                                                                            <span className="text-xs flex-1 truncate text-slate-700 pr-2">
                                                                                {m.question?.text || `Question #${m.question_id}`}
                                                                            </span>
                                                                            <button onClick={() => unmapQuestion(m.question_id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition" title="Remove question">
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {secMappings.length === 0 && (
                                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                    <div className="text-center text-slate-400 text-sm italic font-medium bg-slate-100/50 px-4 py-2 rounded-lg border border-slate-200 border-dashed">
                                                                        Drop questions here
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </DragDropContext>
                )}

                {/* ── STEP 4: Preview Paper ── */}
                {currentStep === 4 && (
                    <div className="p-8 bg-slate-100 border-t min-h-screen">
                        <div className="max-w-[21cm] mx-auto bg-white p-[2cm] shadow-2xl border border-slate-300 min-h-[29.7cm] relative">
                            {/* Watermark or subtle board indicator could go here */}
                            <div className="text-center mb-10 border-b-2 pb-6 border-slate-900">
                                <h1 className="text-2xl font-black uppercase tracking-[0.2em] mb-1 text-slate-900">BRINYMIST SCHOOL</h1>
                                <div className="w-24 h-1 bg-slate-900 mx-auto mb-4"></div>
                                <h2 className="text-xl font-bold mb-1 text-slate-800">{config.exam_type} - {config.academic_year}</h2>
                                <h3 className="font-semibold text-slate-600">Class: {config.grade} | Subject: {config.subject}</h3>
                                
                                <div className="grid grid-cols-3 mt-8 pt-4 border-t border-slate-200 font-bold text-sm text-slate-700">
                                    <div className="text-left">Time: {config.duration} Mins</div>
                                    <div className="text-center italic">Set: {config.set_number}</div>
                                    <div className="text-right">Max Marks: {config.sections_config.reduce((a, s) => a + s.target_questions * s.marks_per_question, 0)}</div>
                                </div>
                            </div>

                            <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                <h4 className="font-bold underline mb-3 text-slate-900 uppercase text-xs tracking-wider">General Instructions:</h4>
                                <ul className="list-decimal pl-5 space-y-1.5 text-xs text-slate-700 leading-relaxed">
                                    {config.general_instructions.map((inst, i) => inst.trim() && <li key={i}>{inst}</li>)}
                                    <li>All questions are compulsory.</li>
                                    <li>Draw neat diagrams wherever necessary.</li>
                                </ul>
                            </div>

                            {config.sections_config.map(sec => {
                                const sectionMappings = mappedQuestions
                                    .filter(m => m.section_name === sec.name)
                                    .sort((a, b) => a.order_in_section - b.order_in_section);
                                
                                if (sectionMappings.length === 0) return null;

                                return (
                                    <div key={sec.name} className="mb-10">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="flex-1 h-px bg-slate-200"></div>
                                            <h3 className="font-black text-slate-900 text-sm tracking-[0.3em] uppercase">SECTION - {sec.name}</h3>
                                            <div className="flex-1 h-px bg-slate-200"></div>
                                        </div>
                                        
                                        <div className="space-y-8">
                                            {sectionMappings.map((m, i) => (
                                                <div key={i} className="relative pl-8">
                                                    {/* Question Numbering */}
                                                    <span className="absolute left-0 top-0 font-bold text-slate-900">Q{i + 1}.</span>
                                                    
                                                    {/* Question Content */}
                                                    <div className="flex justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="text-[13px] text-slate-900 leading-relaxed font-medium mb-3">
                                                                {m.question?.text || "[Missing Question Text]"}
                                                            </div>

                                                            {/* Options Rendering */}
                                                            {m.question?.options && m.question.options.length > 0 && (
                                                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4 ml-2">
                                                                    {m.question.options.map((opt: any, optIdx: number) => (
                                                                        <div key={optIdx} className="flex gap-2 items-start text-xs text-slate-700">
                                                                            <span className="font-bold">({String.fromCharCode(97 + optIdx)})</span>
                                                                            <span>{opt.text}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Marks */}
                                                        <div className="text-right pt-0.5">
                                                            <span className="font-bold text-slate-900 text-sm">[{sec.marks_per_question}]</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-center mt-8 gap-4 pb-8">
                            <button onClick={() => setCurrentStep(3)} className="px-6 py-3 font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm">
                                ← Back to Editing
                            </button>
                            <button onClick={generatePdfAndFinish} className="px-8 py-3 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-lg flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Generate PDF
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 5 (success state shown after export) ── */}
                {currentStep === 5 && (
                    <div className="p-16 text-center space-y-8 flex flex-col items-center">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-500">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Paper Ready!</h2>
                            <p className="text-slate-500 text-lg">Your PDF has been exported and saved to history.</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={generatePdfAndFinish} className="px-6 py-2 border rounded-lg hover:bg-slate-50 font-medium text-slate-700">Download Again</button>
                            <button onClick={() => navigate('/teacher/papers')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-md">Go to History</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionPaperBuilder;
