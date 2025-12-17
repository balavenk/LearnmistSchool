import React, { useState, useMemo } from 'react';

interface Subject {
    id: number;
    name: string;
    code: string;
    status: 'Active' | 'Inactive';
}

const INITIAL_SUBJECTS: Subject[] = [
    { id: 1, name: 'Mathematics', code: 'MATH101', status: 'Active' },
    { id: 2, name: 'Science', code: 'SCI201', status: 'Active' },
    { id: 3, name: 'English Literature', code: 'ENG101', status: 'Active' },
    { id: 4, name: 'History', code: 'HIS101', status: 'Active' },
    { id: 5, name: 'Art & Design', code: 'ART101', status: 'Active' },
    { id: 6, name: 'Physical Education', code: 'PE101', status: 'Active' },
    { id: 7, name: 'Computer Science', code: 'CS101', status: 'Active' },
];

const SubjectsList: React.FC = () => {
    const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');

    const ITEMS_PER_PAGE = 8;

    const filtered = useMemo(() => {
        return subjects.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [subjects, searchTerm]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setSubjects([{
            id: Date.now(),
            name: newName,
            code: newCode,
            status: 'Active'
        }, ...subjects]);
        setIsModalOpen(false);
        setNewName(''); setNewCode('');
    };

    const toggleStatus = (id: number) => {
        setSubjects(subjects.map(s => s.id === id ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' } : s));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Subjects</h1>
                    <p className="text-slate-500 text-sm">Manage curriculum subjects.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    + Add Subject
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <input
                    type="text"
                    placeholder="Search subjects..."
                    className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Subject Name</th>
                            <th className="px-6 py-4">Code</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginated.map(subject => (
                            <tr key={subject.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{subject.name}</td>
                                <td className="px-6 py-4 text-slate-500">{subject.code}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${subject.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {subject.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => toggleStatus(subject.id)} className={`text-xs font-medium ${subject.status === 'Active' ? 'text-red-600' : 'text-green-600'}`}>
                                        {subject.status === 'Active' ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {paginated.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No subjects found.</td></tr>}
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
                        <h2 className="text-xl font-bold mb-4">Add Subject</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Subject Name (e.g. Math)" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Code (e.g. MATH101)" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
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

export default SubjectsList;
