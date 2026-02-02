import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

interface Subject {
    id: number;
    name: string;
    code: string;
}

interface Grade {
    id: number;
    name: string;
    subjects: Subject[];
}

const GradeSubjects: React.FC = () => {
    const { gradeId } = useParams<{ gradeId: string }>();
    const navigate = useNavigate();

    const [grade, setGrade] = useState<Grade | null>(null);
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (gradeId) {
            fetchData();
        }
    }, [gradeId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch All Subjects
            const subjectsRes = await api.get('/school-admin/subjects/');
            setAllSubjects(subjectsRes.data);

            // Fetch Grade Subjects
            const gradeRes = await api.get(`/school-admin/grades/${gradeId}/subjects`);
            // Assuming this endpoint returns list of subjects associated with the grade
            const currentSubjects: Subject[] = gradeRes.data;

            // Getting grade details might require separate endpoint or we just assume IDs if not returned
            // Let's assume we can get grade name from previous screen or fetch it.
            // For now, let's just use the ID or fetch grade details if we had an endpoint.
            // Since we don't have a direct "get grade" endpoint in the snippets viewed, 
            // I'll fetch lists and filter (not efficient but checking snippets).
            // Actually, I can fetch grades list and find.
            const gradesRes = await api.get('/school-admin/grades/');
            const foundGrade = gradesRes.data.find((g: any) => g.id === parseInt(gradeId!));

            setGrade({ ...foundGrade, subjects: currentSubjects });
            setSelectedSubjectIds(currentSubjects.map(s => s.id));

        } catch (error) {
            console.error("Failed to fetch data", error);
            alert("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSubject = (subjectId: number) => {
        setSelectedSubjectIds(prev =>
            prev.includes(subjectId)
                ? prev.filter(id => id !== subjectId)
                : [...prev, subjectId]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post(`/school-admin/grades/${gradeId}/subjects`, {
                subject_ids: selectedSubjectIds
            });
            alert("Subjects linked successfully!");
            navigate('/school-admin/grades');
        } catch (error) {
            console.error("Failed to save", error);
            alert("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
    if (!grade) return <div className="p-8 text-center text-red-500">Grade not found</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/school-admin/grades')}
                    className="text-slate-500 hover:text-slate-700"
                >
                    ← Back
                </button>
                <h1 className="text-2xl font-bold text-slate-900">
                    Manage Subjects for {grade.name}
                </h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <p className="mb-4 text-slate-600">Select the subjects that are taught in this grade.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allSubjects.map(subject => (
                        <div
                            key={subject.id}
                            onClick={() => handleToggleSubject(subject.id)}
                            className={`
                                cursor-pointer p-4 rounded-lg border flex items-center gap-3 transition-all
                                ${selectedSubjectIds.includes(subject.id)
                                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                }
                            `}
                        >
                            <div className={`
                                w-5 h-5 rounded border flex items-center justify-center
                                ${selectedSubjectIds.includes(subject.id)
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }
                            `}>
                                {selectedSubjectIds.includes(subject.id) && (
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <div className="font-medium text-slate-900">{subject.name}</div>
                                <div className="text-xs text-slate-500">{subject.code}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={() => navigate('/school-admin/grades')}
                        className="px-4 py-2 border rounded-lg hover:bg-slate-50 text-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GradeSubjects;
