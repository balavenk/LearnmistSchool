import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

interface Subject {
    id: number;
    name: string;
    code: string;
    status: 'Active' | 'Inactive';
}

// Removed mock data

const SubjectsList: React.FC = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');

    const ITEMS_PER_PAGE = 8;

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const response = await api.get('/school-admin/subjects/');
            // Backend returns {id, name, code, school_id}.
            // Map to frontend interface
            const data = response.data.map((s: any) => ({
                id: s.id,
                name: s.name,
                code: s.code || 'N/A',
                status: 'Active'     // Default for now as backend doesn't have status for Subject
            }));
            setSubjects(data);
        } catch (error) {
            console.error("Failed to fetch subjects", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
    }, []);

    const filtered = useMemo(() => {
        return subjects.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [subjects, searchTerm]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/school-admin/subjects/', {
                name: newName,
                code: newCode
            });
            // If success, refresh list
            fetchSubjects();
            setIsModalOpen(false);
            setNewName(''); setNewCode('');
        } catch (error) {
            console.error("Failed to create subject", error);
            toast.error("Failed to create subject. Might be duplicate.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this subject?")) return;
        try {
            await api.delete(`/school-admin/subjects/${id}`);
            fetchSubjects();
        } catch (error: any) {
            console.error("Delete failed", error);
            toast.error(error.response?.data?.detail || "Failed to delete subject");
        }
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
                        {loading ? <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr> : paginated.map(subject => (
                            <tr key={subject.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{subject.name}</td>
                                <td className="px-6 py-4 text-slate-500">{subject.code}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${subject.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {subject.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-3 items-center">
                                    <button onClick={() => toggleStatus(subject.id)} className={`text-xs font-medium ${subject.status === 'Active' ? 'text-red-600' : 'text-green-600'}`}>
                                        {subject.status === 'Active' ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button onClick={() => handleDelete(subject.id)} className="text-xs font-medium text-red-600 hover:text-red-800">
                                        Delete
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
