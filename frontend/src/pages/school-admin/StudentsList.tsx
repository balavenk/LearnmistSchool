import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';

interface Student {
    id: number;
    name: string;
    email?: string;
    grade_id?: number;
    class_id?: number | null;
    active: boolean;
}

const StudentsList: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [grades, setGrades] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);

    // Edit Modal State
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [newGradeId, setNewGradeId] = useState<number | string>('');
    const [newClassId, setNewClassId] = useState<number | string>('');

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchStudents();
        fetchOptions();
    }, []);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const res = await api.get('/school-admin/students/');
            setStudents(res.data);
        } catch (error) {
            console.error("Failed to fetch students", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const [gRes, cRes] = await Promise.all([
                api.get('/school-admin/grades/'),
                api.get('/school-admin/classes/')
            ]);
            setGrades(gRes.data);
            setClasses(cRes.data);
        } catch (error) {
            console.error("Failed to fetch options", error);
        }
    };

    const openEditModal = (student: Student) => {
        setSelectedStudent(student);
        setNewGradeId(student.grade_id || '');
        setNewClassId(student.class_id || '');
        setIsModalOpen(true);
    };

    const handleSaveClass = async () => {
        if (!selectedStudent) return;
        try {
            await api.put(`/school-admin/students/${selectedStudent.id}`, {
                grade_id: newGradeId ? Number(newGradeId) : null,
                class_id: newClassId ? Number(newClassId) : null
            });
            fetchStudents();
            setIsModalOpen(false);
            alert("Student updated successfully");
        } catch (error) {
            console.error("Failed to update student", error);
            alert("Failed to update student.");
        }
    };

    const handleDeleteClass = async () => {
        // Keeps grade, removes class (sets to null)
        if (!selectedStudent) return;
        if (!confirm("Are you sure you want to remove this student from their class?")) return;

        try {
            await api.put(`/school-admin/students/${selectedStudent.id}`, {
                grade_id: selectedStudent.grade_id, // Keep grade? Or does deleting class mean unassigning completely? 
                // Request says "delete the current class". Usually implies unsetting class_id.
                class_id: null
            });
            fetchStudents();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to remove class", error);
        }
    };

    const filtered = useMemo(() => {
        return students.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Helpers for display
    const getGradeName = (id?: number) => grades.find(g => g.id === id)?.name || id;
    const getClassName = (id?: number | null) => {
        if (!id) return 'Unassigned';
        const c = classes.find(c => c.id === id);
        return c ? `${c.name} (${c.section})` : id;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Students</h1>
                    <p className="text-slate-500 text-sm">Manage student enrollment.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <input
                    type="text"
                    placeholder="Search students..."
                    className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Active</th>
                            <th className="px-6 py-4">Grade</th>
                            <th className="px-6 py-4">Class</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
                        ) : paginated.map(student => (
                            <tr key={student.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${student.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {student.active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {getGradeName(student.grade_id)}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {getClassName(student.class_id)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => openEditModal(student)}
                                        className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                                    >
                                        Change class
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!loading && paginated.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No students found.</td></tr>}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 flex justify-between items-center text-sm">
                        <span className="text-slate-500">Page {currentPage} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Change Class Modal */}
            {isModalOpen && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Manage Class for {selectedStudent.name}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p><strong>Current Assignment:</strong></p>
                                <p>Grade: {getGradeName(selectedStudent.grade_id)}</p>
                                <p>Class: {getClassName(selectedStudent.class_id)}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Grade</label>
                                <select
                                    value={newGradeId}
                                    onChange={(e) => { setNewGradeId(e.target.value); setNewClassId(''); }}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                >
                                    <option value="">Select Grade</option>
                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Class</label>
                                <select
                                    value={newClassId}
                                    onChange={(e) => setNewClassId(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500 disabled:bg-slate-100"
                                    disabled={!newGradeId}
                                >
                                    <option value="">Select Class</option>
                                    {classes.filter(c => c.grade_id == newGradeId).map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.section})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-slate-100 mt-4">
                                <button
                                    onClick={handleDeleteClass}
                                    className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Delete Current Class
                                </button>
                                <div className="flex-1"></div>
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-slate-50 text-sm font-medium">Cancel</button>
                                <button onClick={handleSaveClass} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentsList;
