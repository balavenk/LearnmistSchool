import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

interface Student {
    id: number;
    name: string;
    email?: string;
    grade_id?: number;
    class_id?: number | null;
    active: boolean;
    username?: string;
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
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editGradeId, setEditGradeId] = useState<number | string>('');
    const [editClassId, setEditClassId] = useState<number | string>('');
    const [editActive, setEditActive] = useState(true);

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
        setEditName(student.name);
        setEditEmail(student.email || '');
        setEditGradeId(student.grade_id || '');
        setEditClassId(student.class_id || '');
        setEditActive(student.active);
        setIsModalOpen(true);
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;
        try {
            await api.put(`/school-admin/students/${selectedStudent.id}`, {
                name: editName,
                email: editEmail || null,
                grade_id: editGradeId ? Number(editGradeId) : null,
                class_id: editClassId ? Number(editClassId) : null,
                active: editActive
            });
            fetchStudents();
            setIsModalOpen(false);
            toast.success("Student updated successfully");
        } catch (error) {
            console.error("Failed to update student", error);
            toast.error("Failed to update student.");
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

    // Add Student State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentEmail, setNewStudentEmail] = useState('');
    const [newStudentGradeId, setNewStudentGradeId] = useState<number | ''>('');
    const [newStudentClassId, setNewStudentClassId] = useState<number | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.post('/school-admin/students/', {
                name: newStudentName,
                email: newStudentEmail || null,
                grade_id: Number(newStudentGradeId),
                class_id: newStudentClassId ? Number(newStudentClassId) : null
            });
            fetchStudents();
            setIsAddModalOpen(false);
            setNewStudentName('');
            setNewStudentEmail('');
            setNewStudentGradeId('');
            setNewStudentClassId('');
            toast.success("Student created successfully!");
        } catch (error: any) {
            console.error("Failed to create student", error);
            toast.error(error.response?.data?.detail || "Failed to create student.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Students</h1>
                    <p className="text-slate-500 text-sm">Manage student enrollment.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm flex items-center gap-2"
                >
                    <span>+</span> Add Student
                </button>
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
                            <th className="px-6 py-4">Username</th>
                            <th className="px-6 py-4">Active</th>
                            <th className="px-6 py-4">Grade</th>
                            <th className="px-6 py-4">Class</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
                        ) : paginated.map(student => (
                            <tr key={student.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                                <td className="px-6 py-4 text-slate-600 font-mono text-xs">{student.username || '-'}</td>
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
                                        className="text-indigo-600 hover:text-indigo-800 font-medium text-xs px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!loading && paginated.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No students found.</td></tr>}
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

            {/* Add Student Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Add New Student</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newStudentName}
                                    onChange={(e) => setNewStudentName(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                    placeholder="e.g. John Doe"
                                />
                                <p className="text-xs text-slate-400 mt-1">Username will be auto-generated (e.g. johnd)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(Optional)</span></label>
                                <input
                                    type="email"
                                    value={newStudentEmail}
                                    onChange={(e) => setNewStudentEmail(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                    placeholder="student@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                                <select
                                    required
                                    value={newStudentGradeId}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : '';
                                        setNewStudentGradeId(val);
                                        setNewStudentClassId('');
                                    }}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                >
                                    <option value="">Select Grade</option>
                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Class (Optional)</label>
                                <select
                                    value={newStudentClassId}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : '';
                                        setNewStudentClassId(val);
                                    }}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500 disabled:bg-slate-100"
                                    disabled={!newStudentGradeId}
                                >
                                    <option value="">Select Class</option>
                                    {classes.filter(c => c.grade_id == newStudentGradeId).map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.section})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 font-medium">Cancel</button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md disabled:opacity-50"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Student'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {isModalOpen && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Edit Student</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleUpdateStudent} className="space-y-4">
                            <div className="text-xs text-slate-500 mb-2 font-mono bg-slate-50 p-2 rounded">
                                Username: {selectedStudent.username}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                    placeholder="student@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                                <select
                                    required
                                    value={editGradeId}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : '';
                                        setEditGradeId(val);
                                        setEditClassId(''); // Reset class if grade changes
                                    }}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500"
                                >
                                    <option value="">Select Grade</option>
                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                                <select
                                    value={editClassId}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : '';
                                        setEditClassId(val);
                                    }}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500 disabled:bg-slate-100"
                                    disabled={!editGradeId}
                                >
                                    <option value="">Unassigned</option>
                                    {classes.filter(c => c.grade_id == editGradeId).map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.section})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="block text-sm font-medium text-slate-700">Status:</label>
                                <button
                                    type="button"
                                    onClick={() => setEditActive(!editActive)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${editActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                >
                                    {editActive ? 'Active' : 'Inactive'}
                                </button>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentsList;
