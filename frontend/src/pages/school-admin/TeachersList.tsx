import React, { useState, useMemo } from 'react';

interface Teacher {
    id: number;
    name: string;
    email: string;
    subject: string;
    status: 'Active' | 'Inactive';
    assignedGrades: string[];
}

const INITIAL_TEACHERS: Teacher[] = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Teacher ${String.fromCharCode(65 + i)}`,
    email: `teacher${i + 1}@school.com`,
    subject: ['Math', 'Science', 'English', 'History', 'Art'][i % 5],
    status: 'Active',
    assignedGrades: []
}));

const AVAILABLE_GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

const TeachersList: React.FC = () => {
    const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newSubject, setNewSubject] = useState('');

    // Assign Grade Modal State
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
    const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
    const [selectedGrades, setSelectedGrades] = useState<string[]>([]);

    const ITEMS_PER_PAGE = 5;

    const filtered = useMemo(() => {
        return teachers.filter(t =>
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [teachers, searchTerm]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Create Handler
    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setTeachers([{
            id: Date.now(),
            name: newName,
            email: newEmail,
            subject: newSubject,
            status: 'Active',
            assignedGrades: []
        }, ...teachers]);
        setIsCreateModalOpen(false);
        setNewName(''); setNewEmail(''); setNewSubject('');
    };

    // Toggle Status Handler
    const toggleStatus = (id: number) => {
        setTeachers(teachers.map(t => t.id === id ? { ...t, status: t.status === 'Active' ? 'Inactive' : 'Active' } : t));
    };

    // Grade Assignment Handlers
    const openGradeModal = (teacher: Teacher) => {
        setSelectedTeacherId(teacher.id);
        setSelectedGrades(teacher.assignedGrades);
        setIsGradeModalOpen(true);
    };

    const toggleGradeSelection = (grade: string) => {
        if (selectedGrades.includes(grade)) {
            setSelectedGrades(selectedGrades.filter(g => g !== grade));
        } else {
            setSelectedGrades([...selectedGrades, grade]);
        }
    };

    const handleSaveGrades = () => {
        if (selectedTeacherId) {
            setTeachers(teachers.map(t =>
                t.id === selectedTeacherId ? { ...t, assignedGrades: selectedGrades } : t
            ));
        }
        setIsGradeModalOpen(false);
        setSelectedTeacherId(null);
        setSelectedGrades([]);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Teachers</h1>
                    <p className="text-slate-500 text-sm">Manage teaching staff.</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    + Add Teacher
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <input
                    type="text"
                    placeholder="Search teachers..."
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
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Subject</th>
                            <th className="px-6 py-4">Assigned Grades</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginated.map(teacher => (
                            <tr key={teacher.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{teacher.name}</td>
                                <td className="px-6 py-4 text-slate-500">{teacher.email}</td>
                                <td className="px-6 py-4 text-slate-600">{teacher.subject}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    {teacher.assignedGrades.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {teacher.assignedGrades.slice(0, 3).map(g => (
                                                <span key={g} className="px-2 py-0.5 bg-slate-100 rounded text-xs">{g}</span>
                                            ))}
                                            {teacher.assignedGrades.length > 3 && <span className="text-xs text-slate-400">+{teacher.assignedGrades.length - 3}</span>}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic">None</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${teacher.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {teacher.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button
                                        onClick={() => openGradeModal(teacher)}
                                        className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                                    >
                                        Assign Grade
                                    </button>
                                    <button onClick={() => toggleStatus(teacher.id)} className={`text-xs font-medium ${teacher.status === 'Active' ? 'text-red-600' : 'text-green-600'}`}>
                                        {teacher.status === 'Active' ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {paginated.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No teachers found.</td></tr>}
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

            {/* Create Teacher Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4">Add Teacher</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" type="email" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Grades Modal */}
            {isGradeModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-2">Assign Grades</h2>
                        <p className="text-sm text-slate-500 mb-4">Select grades to assign to this teacher.</p>

                        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border border-slate-100 rounded-lg">
                            {AVAILABLE_GRADES.map(grade => (
                                <label key={grade} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedGrades.includes(grade)}
                                        onChange={() => toggleGradeSelection(grade)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700">{grade}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-2 pt-6">
                            <button onClick={() => setIsGradeModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                            <button onClick={handleSaveGrades} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Assignments</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeachersList;
