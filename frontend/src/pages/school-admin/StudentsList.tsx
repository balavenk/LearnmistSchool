import React, { useState, useMemo } from 'react';

interface Student {
    id: number;
    name: string;
    email: string;
    grade: string;
    status: 'Active' | 'Inactive';
}

const INITIAL_STUDENTS: Student[] = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    name: `Student ${String.fromCharCode(65 + (i % 26))}${i}`,
    email: `student${i + 1}@school.com`,
    grade: `${(i % 12) + 1}th Grade`,
    status: 'Active'
}));

const StudentsList: React.FC = () => {
    const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newGrade, setNewGrade] = useState('');

    const ITEMS_PER_PAGE = 8;

    const filtered = useMemo(() => {
        return students.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setStudents([{
            id: Date.now(),
            name: newName,
            email: newEmail,
            grade: newGrade,
            status: 'Active'
        }, ...students]);
        setIsModalOpen(false);
        setNewName(''); setNewEmail(''); setNewGrade('');
    };

    const toggleStatus = (id: number) => {
        setStudents(students.map(s => s.id === id ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' } : s));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Students</h1>
                    <p className="text-slate-500 text-sm">Manage student enrollment.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    + Add Student
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
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Grade</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginated.map(student => (
                            <tr key={student.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                                <td className="px-6 py-4 text-slate-500">{student.email}</td>
                                <td className="px-6 py-4 text-slate-600">{student.grade}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${student.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {student.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => toggleStatus(student.id)} className={`text-xs font-medium ${student.status === 'Active' ? 'text-red-600' : 'text-green-600'}`}>
                                        {student.status === 'Active' ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {paginated.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No students found.</td></tr>}
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Add Student</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" type="email" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <input value={newGrade} onChange={e => setNewGrade(e.target.value)} placeholder="Grade (e.g. 10th)" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg">Add</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentsList;
