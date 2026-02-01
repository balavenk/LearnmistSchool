import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

interface Assignment {
    id: number;
    subject: { id: number; name: string };
    grade: { id: number; name: string };
    class_?: { id: number; name: string; section: string };
}

interface Option {
    id: number;
    name: string;
    section?: string; // For classes
}

const TeacherClasses: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [teacherName, setTeacherName] = useState('');

    // Form Data
    const [grades, setGrades] = useState<Option[]>([]);
    const [classes, setClasses] = useState<Option[]>([]);
    const [subjects, setSubjects] = useState<Option[]>([]);

    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
        fetchOptions();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Ideally we also fetch teacher details to show name
            const [assignmentsRes, teachersRes] = await Promise.all([
                api.get(`/school-admin/teachers/${id}/assignments`),
                api.get('/school-admin/teachers/') // Lazy way to get name, optimization possible
            ]);

            setAssignments(assignmentsRes.data);
            const teacher = teachersRes.data.find((t: any) => t.id === Number(id));
            if (teacher) setTeacherName(teacher.username);

        } catch (error) {
            console.error("Failed to fetch assignments", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const [gRes, cRes, sRes] = await Promise.all([
                api.get('/school-admin/grades/'),
                api.get('/school-admin/classes/'),
                api.get('/school-admin/subjects/')
            ]);
            setGrades(gRes.data);
            setClasses(cRes.data);
            setSubjects(sRes.data);
        } catch (error) {
            console.error("Failed to fetch options", error);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/school-admin/teachers/${id}/assignments`, {
                grade_id: Number(selectedGrade),
                class_id: selectedClass ? Number(selectedClass) : null,
                subject_id: Number(selectedSubject)
            });
            fetchData();
            setIsAddModalOpen(false);
            setSelectedGrade(''); setSelectedClass(''); setSelectedSubject('');
        } catch (error) {
            console.error("Failed to assign class", error);
            alert("Failed to assign. Check if already exists.");
        }
    };

    const handleDelete = async (assignmentId: number) => {
        if (!confirm("Remove this class assignment?")) return;
        try {
            await api.delete(`/school-admin/assignments/${assignmentId}`);
            setAssignments(prev => prev.filter(a => a.id !== assignmentId));
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    // Filter classes by grade
    const availableClasses = classes.filter(c => c.grade_id === Number(selectedGrade)); // Schema might vary slightly, treating c as any for safety if needed
    // Actually schema for Class has grade_id

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <button onClick={() => navigate('/school-admin/teachers')} className="text-indigo-600 hover:underline text-sm mb-2">← Back to Teachers</button>
                    <h1 className="text-2xl font-bold text-slate-900">Assigned Classes for {teacherName || 'Teacher'}</h1>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                    + Assign New Class
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Grade</th>
                            <th className="px-6 py-4">Class / Section</th>
                            <th className="px-6 py-4">Subject</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
                        ) : assignments.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 text-slate-900 font-medium">{a.grade?.name || 'N/A'}</td>
                                <td className="px-6 py-4 text-slate-500">
                                    {a.class_ ? `${a.class_.name} (${a.class_.section})` : 'All Classes'}
                                </td>
                                <td className="px-6 py-4 text-slate-700">{a.subject?.name || 'N/A'}</td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDelete(a.id)}
                                        className="text-red-600 hover:text-red-800 font-medium text-xs"
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!loading && assignments.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No classes assigned yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Assign Class</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Grade</label>
                                <select
                                    value={selectedGrade}
                                    onChange={(e) => { setSelectedGrade(e.target.value); setSelectedClass(''); }}
                                    required
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                >
                                    <option value="">Select Grade</option>
                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Class (Optional)</label>
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500 disabled:bg-slate-100"
                                    disabled={!selectedGrade}
                                >
                                    <option value="">All Classes (or Specific)</option>
                                    {/* Need to filter classes by grade. Assuming 'classes' has grade_id or we fetch by grade */}
                                    {/* In fetchOptions we got all classes. Assuming client side filter works if schema has grade_id */}
                                    {classes.filter((c: any) => c.grade_id == selectedGrade).map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.section})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
                                </select>
                            </div>

                            <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 mt-2">
                                Assign
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherClasses;
