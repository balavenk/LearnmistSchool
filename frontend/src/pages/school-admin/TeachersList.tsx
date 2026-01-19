import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';

interface Teacher {
    id: number;
    username: string; // Changed name to username
    email: string;
    // subject: string; // Not in User model
    status: 'Active' | 'Inactive'; // Mapped from active boolean
    // assignedGrades: string[]; // Not in User model
}

const TeachersList: React.FC = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');

    // Assign Grade Modal State (Placeholder implementation)
    // const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);

    const ITEMS_PER_PAGE = 5;

    const fetchTeachers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/school-admin/teachers/');
            const data = response.data.map((t: any) => ({
                id: t.id,
                username: t.username,
                email: t.email || "",
                status: t.active ? 'Active' : 'Inactive'
            }));
            setTeachers(data);
        } catch (error) {
            console.error("Failed to fetch teachers", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeachers();
    }, []);

    const filtered = useMemo(() => {
        return teachers.filter(t =>
            t.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [teachers, searchTerm]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Create Handler
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/school-admin/teachers/', {
                username: newUsername,
                email: newEmail,
                password: 'password123', // Default password
                role: 'TEACHER'
            });
            fetchTeachers();
            setIsCreateModalOpen(false);
            setNewUsername(''); setNewEmail('');
            alert("Teacher created successfully (Default password: password123)");
        } catch (error) {
            console.error("Failed to create teacher", error);
            alert("Failed to create teacher. Username/Email might be duplicate.");
        }
    };

    // Toggle Status Handler
    const toggleStatus = (_id: number) => {
        // Implement API call to toggle status
        console.log("Toggle status not implemented in backend yet");
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
                            <th className="px-6 py-4">Username</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
                        ) : paginated.map(teacher => (
                            <tr key={teacher.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{teacher.username}</td>
                                <td className="px-6 py-4 text-slate-500">{teacher.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${teacher.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {teacher.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => toggleStatus(teacher.id)} className={`text-xs font-medium ${teacher.status === 'Active' ? 'text-red-600' : 'text-green-600'}`}>
                                        {teacher.status === 'Active' ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!loading && paginated.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No teachers found.</td></tr>}
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
                            <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Username" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" type="email" required className="w-full px-4 py-2 border rounded-lg outline-none focus:border-indigo-500" />
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeachersList;
