import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';

// ─── Types ───────────────────────────────────────────────────────────────────

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
    visibility: 'system' | 'shared' | 'private';
    sections_config?: string;   // JSON string
    general_instructions?: string; // JSON string
    created_by_id?: number;
    created_by_role?: string;
    cloned_from_id?: number;
    created_at: string;
    updated_at?: string;
}

type TabKey = 'all' | 'system' | 'shared' | 'mine';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'system', label: 'System' },
    { key: 'shared', label: 'Shared' },
    { key: 'mine', label: 'My Templates' },
];

const BADGE_STYLES: Record<string, string> = {
    system: 'bg-purple-100 text-purple-700 border border-purple-200',
    shared: 'bg-green-100 text-green-700 border border-green-200',
    private: 'bg-blue-100 text-blue-700 border border-blue-200',
};

const BADGE_LABELS: Record<string, string> = {
    system: 'System',
    shared: 'Shared',
    private: 'Mine',
};

const DEFAULT_SECTIONS: SectionConfig[] = [
    { name: 'A', target_questions: 20, marks_per_question: 1 },
    { name: 'B', target_questions: 5, marks_per_question: 2 },
    { name: 'C', target_questions: 6, marks_per_question: 3 },
    { name: 'D', target_questions: 4, marks_per_question: 5 },
];

const DEFAULT_INSTRUCTIONS = [
    'This question paper comprises multiple sections.',
    'There is no overall choice.',
    'Use of calculators is not permitted.',
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function parseSections(raw?: string): SectionConfig[] {
    if (!raw) return [];
    try { 
        let parsed = JSON.parse(raw); 
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}

function parseInstructions(raw?: string): string[] {
    if (!raw) return [];
    try { 
        let parsed = JSON.parse(raw); 
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}

// ─── Main Component ───────────────────────────────────────────────────────────

const Templates: React.FC = () => {
    const navigate = useNavigate();
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string>('');

    // List state
    const [templates, setTemplates] = useState<PaperTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>('all');

    // Modal state: 'create' | 'edit' | 'preview' | null
    const [modal, setModal] = useState<'create' | 'edit' | 'preview' | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<PaperTemplate | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formVisibility, setFormVisibility] = useState<'private' | 'shared' | 'system'>('private');
    const [formDuration, setFormDuration] = useState('3 Hours');
    const [formSections, setFormSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
    const [formInstructions, setFormInstructions] = useState<string[]>(DEFAULT_INSTRUCTIONS);
    const [saving, setSaving] = useState(false);

    // ─── Data loading ─────────────────────────────────────────────────────────

    const fetchTemplates = useCallback(async (tab: TabKey) => {
        setLoading(true);
        try {
            const params = tab === 'all' ? {} : { visibility: tab === 'mine' ? 'private' : tab };
            const { data } = await api.get('/teacher/templates', { params });
            // For 'mine' tab, additionally filter client-side in case the server returns others
            setTemplates(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTemplates(activeTab);
    }, [activeTab, fetchTemplates]);

    useEffect(() => {
        // Pull current user info from JWT payload stored in localStorage
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                // Try id first, then sub if it looks like an ID, but since sub is username, this was wrong earlier
                // if `id` is a string, parsed to int.
                const userId = payload.id !== undefined ? parseInt(payload.id as string, 10) : null;
                console.log("DEBUG: Extracted payload from token:", payload);
                console.log("DEBUG: Extracted userId:", userId);
                setCurrentUserId(userId);
                setCurrentUserRole(payload.role ?? '');
            } catch { /* ignore */ }
        }
    }, []);

    // ─── Tab filtering (client-side for 'mine') ───────────────────────────────

    const visibleTemplates = activeTab === 'mine'
        ? templates.filter(t => t.visibility === 'private')
        : templates;

    // ─── CRUD Handlers ────────────────────────────────────────────────────────

    const openCreate = () => {
        setSelectedTemplate(null);
        setFormName('');
        setFormDescription('');
        setFormVisibility('private');
        setFormDuration('3 Hours');
        setFormSections(DEFAULT_SECTIONS);
        setFormInstructions(DEFAULT_INSTRUCTIONS);
        setModal('create');
    };

    const openEdit = (t: PaperTemplate) => {
        setSelectedTemplate(t);
        setFormName(t.name);
        setFormDescription(t.description ?? '');
        setFormVisibility(t.visibility as any);
        setFormDuration(t.duration ?? '3 Hours');
        setFormSections(parseSections(t.sections_config).length ? parseSections(t.sections_config) : DEFAULT_SECTIONS);
        setFormInstructions(parseInstructions(t.general_instructions).length ? parseInstructions(t.general_instructions) : DEFAULT_INSTRUCTIONS);
        setModal('edit');
    };

    const openPreview = (t: PaperTemplate) => {
        setSelectedTemplate(t);
        setModal('preview');
    };

    const handleSave = async () => {
        if (!formName.trim()) { toast.error('Name is required'); return; }
        setSaving(true);
        const payload = {
            name: formName.trim(),
            description: formDescription.trim() || undefined,
            visibility: formVisibility,
            duration: formDuration,
            total_marks: formSections.reduce((acc, s) => acc + s.target_questions * s.marks_per_question, 0),
            sections_config: JSON.stringify(formSections),
            general_instructions: JSON.stringify(formInstructions.filter(i => i.trim())),
        };
        try {
            if (modal === 'create') {
                await api.post('/teacher/templates', payload);
                toast.success('Template created!');
            } else if (modal === 'edit' && selectedTemplate) {
                await api.put(`/teacher/templates/${selectedTemplate.id}`, payload);
                toast.success('Template updated!');
            }
            setModal(null);
            fetchTemplates(activeTab);
        } catch (err: any) {
            toast.error(err.response?.data?.detail ?? 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleClone = async (t: PaperTemplate) => {
        try {
            toast.loading('Cloning…', { id: 'clone' });
            await api.post(`/teacher/templates/${t.id}/clone`);
            toast.success('Template cloned to My Templates!', { id: 'clone' });
            if (activeTab === 'mine' || activeTab === 'all') fetchTemplates(activeTab);
            else setActiveTab('mine');
        } catch (err: any) {
            toast.error(err.response?.data?.detail ?? 'Clone failed', { id: 'clone' });
        }
    };

    const handleDelete = async (t: PaperTemplate) => {
        if (!window.confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/teacher/templates/${t.id}`);
            toast.success('Template deleted');
            fetchTemplates(activeTab);
        } catch (err: any) {
            toast.error(err.response?.data?.detail ?? 'Delete failed');
        }
    };

    const canEdit = (t: PaperTemplate) =>
        t.created_by_id === currentUserId ||
        ['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(currentUserRole);

    // ─── Section Builder helpers ──────────────────────────────────────────────

    const updateSection = (idx: number, field: keyof SectionConfig, value: any) => {
        const next = [...formSections];
        next[idx] = { ...next[idx], [field]: value };
        setFormSections(next);
    };

    const addSection = () => {
        setFormSections([...formSections, {
            name: String.fromCharCode(65 + formSections.length),
            target_questions: 5,
            marks_per_question: 1,
        }]);
    };

    const removeSection = (idx: number) =>
        setFormSections(formSections.filter((_, i) => i !== idx));

    const totalMarks = formSections.reduce((a, s) => a + s.target_questions * s.marks_per_question, 0);

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* Page Header */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-indigo-900">Paper Templates</h1>
                    <p className="text-sm text-slate-500 mt-1">Reusable blueprints — structure only. No questions attached.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition shadow"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Template
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="flex border-b border-slate-200 px-4">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${activeTab === tab.key
                                ? 'border-indigo-600 text-indigo-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Template Cards */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-16 text-slate-400">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        </div>
                    ) : visibleTemplates.length === 0 ? (
                        <EmptyState
                            tab={activeTab}
                            onCreate={openCreate}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {visibleTemplates.map(t => (
                                <TemplateCard
                                    key={t.id}
                                    template={t}
                                    canEdit={canEdit(t)}
                                    canDelete={t.created_by_id === currentUserId}
                                    onUse={() => navigate(`/teacher/papers/new?templateId=${t.id}`)}
                                    onClone={() => handleClone(t)}
                                    onPreview={() => openPreview(t)}
                                    onEdit={() => openEdit(t)}
                                    onDelete={() => handleDelete(t)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Create / Edit Modal ─── */}
            {(modal === 'create' || modal === 'edit') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-900">
                                {modal === 'create' ? 'New Template' : `Edit: ${selectedTemplate?.name}`}
                            </h2>
                            <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 transition">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Name + Visibility */}
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-sm font-semibold text-slate-700">Template Name *</span>
                                    <input
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        placeholder="e.g. CBSE Standard 80 Marks"
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                    />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-sm font-semibold text-slate-700">Visibility</span>
                                    <select
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        value={formVisibility}
                                        onChange={e => setFormVisibility(e.target.value as any)}
                                    >
                                        <option value="private">Private (only me)</option>
                                        <option value="shared">Shared (school-wide)</option>
                                        {['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(currentUserRole) && (
                                            <option value="system">System (all schools)</option>
                                        )}
                                    </select>
                                </label>
                            </div>

                            {/* Description + Duration */}
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-sm font-semibold text-slate-700">Description</span>
                                    <input
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        placeholder="e.g. Standard CBSE board exam pattern"
                                        value={formDescription}
                                        onChange={e => setFormDescription(e.target.value)}
                                    />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-sm font-semibold text-slate-700">Duration</span>
                                    <input
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        placeholder="e.g. 3 Hours"
                                        value={formDuration}
                                        onChange={e => setFormDuration(e.target.value)}
                                    />
                                </label>
                            </div>

                            {/* Section Builder */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-slate-700 text-sm">Section Builder</h3>
                                    <button
                                        type="button"
                                        onClick={addSection}
                                        className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition"
                                    >
                                        + Add Section
                                    </button>
                                </div>
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="text-slate-500 border-b border-slate-200">
                                            <th className="pb-2 font-medium">Section</th>
                                            <th className="pb-2 font-medium">Qty</th>
                                            <th className="pb-2 font-medium">Marks/Q</th>
                                            <th className="pb-2 font-medium text-right">Subtotal</th>
                                            <th className="pb-2" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formSections.map((sec, idx) => (
                                            <tr key={idx} className="border-b border-white">
                                                <td className="py-1.5">
                                                    <input
                                                        className="w-12 p-1 border border-slate-300 rounded text-xs"
                                                        value={sec.name}
                                                        onChange={e => updateSection(idx, 'name', e.target.value)}
                                                    />
                                                </td>
                                                <td className="py-1.5">
                                                    <input
                                                        type="number" min="1"
                                                        className="w-16 p-1 border border-slate-300 rounded text-xs"
                                                        value={sec.target_questions}
                                                        onChange={e => updateSection(idx, 'target_questions', Math.max(1, parseInt(e.target.value) || 1))}
                                                    />
                                                </td>
                                                <td className="py-1.5">
                                                    <input
                                                        type="number" min="1"
                                                        className="w-16 p-1 border border-slate-300 rounded text-xs"
                                                        value={sec.marks_per_question}
                                                        onChange={e => updateSection(idx, 'marks_per_question', Math.max(1, parseInt(e.target.value) || 1))}
                                                    />
                                                </td>
                                                <td className="py-1.5 text-right font-semibold text-slate-700">
                                                    {sec.target_questions * sec.marks_per_question}
                                                </td>
                                                <td className="py-1.5 pl-2">
                                                    <button
                                                        onClick={() => removeSection(idx)}
                                                        className="text-red-400 hover:text-red-600 transition text-xs"
                                                    >✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td colSpan={3} className="pt-3 text-right font-bold text-slate-700 text-xs pr-2">
                                                Total Marks:
                                            </td>
                                            <td className="pt-3 text-right font-bold text-indigo-700">
                                                {totalMarks}
                                            </td>
                                            <td />
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Instructions */}
                            <label className="flex flex-col gap-1">
                                <span className="text-sm font-semibold text-slate-700">General Instructions (one per line)</span>
                                <textarea
                                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono h-28 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                    value={formInstructions.join('\n')}
                                    onChange={e => setFormInstructions(e.target.value.split('\n'))}
                                />
                            </label>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
                            <button
                                onClick={() => setModal(null)}
                                className="px-5 py-2 text-slate-600 font-medium rounded-lg hover:bg-slate-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-60 shadow"
                            >
                                {saving ? 'Saving…' : (modal === 'create' ? 'Create Template' : 'Update Template')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Preview Modal ─── */}
            {modal === 'preview' && selectedTemplate && (
                <PreviewModal
                    template={selectedTemplate}
                    onClose={() => setModal(null)}
                    onUse={() => navigate(`/teacher/papers/new?templateId=${selectedTemplate.id}`)}
                />
            )}
        </div>
    );
};

// ─── Template Card ────────────────────────────────────────────────────────────

interface TemplateCardProps {
    template: PaperTemplate;
    canEdit: boolean;
    canDelete: boolean;
    onUse: () => void;
    onClone: () => void;
    onPreview: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template: t, canEdit, canDelete, onUse, onClone, onPreview, onEdit, onDelete }) => {
    const sections = parseSections(t.sections_config);

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col">
            {/* Card Header */}
            <div className="p-4 border-b border-slate-100">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${BADGE_STYLES[t.visibility] ?? BADGE_STYLES.private}`}>
                        {BADGE_LABELS[t.visibility] ?? t.visibility}
                    </span>
                    {t.cloned_from_id && (
                        <span className="text-xs text-slate-400 italic">cloned</span>
                    )}
                </div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight mb-1">{t.name}</h3>
                {t.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                )}
            </div>

            {/* Metadata */}
            <div className="px-4 py-3 flex items-center gap-3 text-xs text-slate-600 border-b border-slate-100">
                {t.total_marks != null && (
                    <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t.total_marks} Marks
                    </span>
                )}
                {t.duration && (
                    <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t.duration}
                    </span>
                )}
            </div>

            {/* Section chips */}
            {sections.length > 0 && (
                <div className="px-4 py-3 flex flex-wrap gap-1.5 border-b border-slate-100">
                    {sections.map((s, i) => (
                        <span
                            key={i}
                            className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono"
                        >
                            {s.name} · {s.target_questions}×{s.marks_per_question}
                        </span>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="p-3 flex flex-wrap gap-2 mt-auto">
                <button
                    onClick={onUse}
                    className="flex-1 bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                    Use Template
                </button>
                <button
                    onClick={onClone}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                    title="Clone to My Templates"
                >
                    Clone
                </button>
                <button
                    onClick={onPreview}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                    Preview
                </button>
                {canEdit && (
                    <>
                        <button
                            onClick={onEdit}
                            className="px-3 py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition"
                        >
                            Edit
                        </button>
                        {canDelete && (
                            <button
                                onClick={onDelete}
                                className="px-3 py-2 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
                            >
                                Delete
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// ─── Preview Modal ────────────────────────────────────────────────────────────

const PreviewModal: React.FC<{ template: PaperTemplate; onClose: () => void; onUse: () => void }> = ({ template: t, onClose, onUse }) => {
    const sections = parseSections(t.sections_config);
    const instructions = parseInstructions(t.general_instructions);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900">Preview: {t.name}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Meta */}
                    <div className="flex flex-wrap gap-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${BADGE_STYLES[t.visibility] ?? BADGE_STYLES.private}`}>
                            {BADGE_LABELS[t.visibility] ?? t.visibility}
                        </span>
                        {t.total_marks != null && (
                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">{t.total_marks} Marks</span>
                        )}
                        {t.duration && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{t.duration}</span>
                        )}
                    </div>

                    {t.description && (
                        <p className="text-sm text-slate-600">{t.description}</p>
                    )}

                    {/* Sections table */}
                    {sections.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-slate-800 mb-2 text-sm">Sections</h4>
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-xs">
                                        <th className="text-left px-3 py-2 border border-slate-200">Section</th>
                                        <th className="text-left px-3 py-2 border border-slate-200">Questions</th>
                                        <th className="text-left px-3 py-2 border border-slate-200">Marks/Q</th>
                                        <th className="text-right px-3 py-2 border border-slate-200">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sections.map((s, i) => (
                                        <tr key={i} className="border-b border-slate-100">
                                            <td className="px-3 py-2 font-semibold border border-slate-200">Section {s.name}</td>
                                            <td className="px-3 py-2 border border-slate-200">{s.target_questions}</td>
                                            <td className="px-3 py-2 border border-slate-200">{s.marks_per_question}</td>
                                            <td className="px-3 py-2 text-right font-semibold text-indigo-700 border border-slate-200">{s.target_questions * s.marks_per_question}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-indigo-50">
                                        <td colSpan={3} className="px-3 py-2 text-right font-bold text-slate-800 border border-slate-200">Total</td>
                                        <td className="px-3 py-2 text-right font-bold text-indigo-700 border border-slate-200">
                                            {sections.reduce((a, s) => a + s.target_questions * s.marks_per_question, 0)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Instructions */}
                    {instructions.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-slate-800 mb-2 text-sm">General Instructions</h4>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                                {instructions.map((ins, i) => ins.trim() && <li key={i}>{ins}</li>)}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
                    <button onClick={onClose} className="px-5 py-2 text-slate-600 font-medium rounded-lg hover:bg-slate-100 transition">
                        Close
                    </button>
                    <button
                        onClick={onUse}
                        className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition shadow"
                    >
                        Use This Template
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ tab: TabKey; onCreate: () => void }> = ({ tab, onCreate }) => (
    <div className="flex flex-col items-center py-16 text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
        </div>
        <h3 className="text-slate-700 font-semibold text-lg mb-1">No templates found</h3>
        <p className="text-slate-400 text-sm mb-6">
            {tab === 'system' ? 'No system templates have been created by an admin yet.' :
                tab === 'shared' ? 'No shared templates from your school yet.' :
                    tab === 'mine' ? 'You haven\'t created any private templates yet.' :
                        'No templates available. Create your first one!'}
        </p>
        {(tab === 'all' || tab === 'mine') && (
            <button
                onClick={onCreate}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition shadow"
            >
                + Create Template
            </button>
        )}
    </div>
);

export default Templates;
