import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

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

interface Student {
    id: number;
    name: string;
    grade_id: number;
    class_id: number;
    active: boolean;
}

const TeacherGrading: React.FC = () => {
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
    const [loading, setLoading] = useState(true);
    const [fetchingStudents, setFetchingStudents] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [classesRes, subjectsRes] = await Promise.all([
                    api.get('/teacher/classes/'),
                    api.get('/teacher/subjects/')
                ]);
                setClasses(classesRes.data);
                setSubjects(subjectsRes.data);
            } catch (error) {
                console.error("Failed to fetch teacher data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleShowStudents = async () => {
        if (!selectedClassId) {
            alert("Please select a class first.");
            return;
        }
        if (!selectedSubjectId) {
            alert("Please select a subject.");
            return;
        }

        try {
            setFetchingStudents(true);
            const response = await api.get('/teacher/students/', {
                params: { class_id: selectedClassId }
            });
            setStudents(response.data);
        } catch (error) {
            console.error("Failed to fetch students", error);
            alert("Failed to fetch students.");
        } finally {
            setFetchingStudents(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Grading</h1>
                <p className="text-slate-500 mt-1">Select a class and subject to view students and manage grades.</p>
            </div>

            {/* Class Selection Panels */}
            <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-3">1. Select Class</h2>
                {loading ? (
                    <div className="text-slate-500">Loading classes...</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {classes.map((cls) => (
                            <div
                                key={cls.id}
                                onClick={() => {
                                    setSelectedClassId(cls.id);
                                    setStudents([]); // Clear previous students
                                    setSelectedSubjectId(''); // Reset subject
                                }}
                                className={`cursor-pointer rounded-xl border p-4 transition-all ${selectedClassId === cls.id
                                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200 shadow-md'
                                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className="text-2xl font-bold text-slate-800 mb-1">{cls.name}</div>
                                <div className="text-sm text-slate-500">Section {cls.section}</div>
                                {cls.grade && <div className="text-xs text-slate-400 mt-2">{cls.grade.name}</div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Subject Selection */}
            {selectedClassId && (
                <div className="max-w-md animate-fade-in-up">
                    <h2 className="text-lg font-semibold text-slate-800 mb-3">2. Select Subject</h2>
                    <div className="flex gap-4">
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">Choose Subject...</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleShowStudents}
                            disabled={!selectedSubjectId || fetchingStudents}
                            className={`px-6 py-2 rounded-lg font-medium text-white shadow-md transition-colors ${!selectedSubjectId
                                ? 'bg-slate-300 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                        >
                            {fetchingStudents ? 'Loading...' : 'Show Students'}
                        </button>
                    </div>
                </div>
            )}

            {/* Students Grid */}
            {students.length > 0 && (
                <div className="animate-fade-in-up">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex justify-between items-center">
                        <span>3. Student List</span>
                        <span className="text-sm font-normal text-slate-500">{students.length} Students found</span>
                    </h2>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                    {/* Add more columns like Current Grade, specific assignment columns later */}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {students.map((student) => (
                                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{student.name}</div>
                                            <div className="text-xs text-slate-400">ID: {student.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mr-4">View Profile</button>
                                            <a href={`/grading/${student.id}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Grade Assignments</a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!fetchingStudents && students.length === 0 && selectedClassId && selectedSubjectId && (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No students found for this class.
                </div>
            )}
        </div>
    );
};

export default TeacherGrading;
