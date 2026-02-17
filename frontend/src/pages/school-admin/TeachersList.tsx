import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { DataTable } from '../../components/DataTable';
import { PaginationControls } from '../../components/PaginationControls';

interface Teacher {
    id: number;
    username: string; // Changed name to username
    email: string;
    // subject: string; // Not in User model
    status: 'Active' | 'Inactive'; // Mapped from active boolean
    // assignedGrades: string[]; // Not in User model
}

const TeachersList: React.FC = () => {
    const navigate = useNavigate();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    // const [newSubject, setNewSubject] = useState(''); // Kept for UI but not sent to API yet

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
            setNewUsername(''); setNewEmail(''); // setNewSubject('');
            toast.success("Teacher created successfully (Default password: password123)");
        } catch (error) {
            console.error("Failed to create teacher", error);
            toast.error("Failed to create teacher. Username/Email might be duplicate.");
        }
    };

    // Toggle Status Handler
    const toggleStatus = (id: number) => {
        console.log("Toggle status not implemented in backend", id);
    };

    const columns: ColumnDef<Teacher>[] = useMemo(
        () => [
            {
                header: 'Username',
                accessorKey: 'username',
                cell: (info) => (
                    <span className="font-medium text-slate-900">{info.getValue() as string}</span>
                ),
            },
            {
                header: 'Email',
                accessorKey: 'email',
                cell: (info) => (
                    <span className="text-slate-500">{info.getValue() as string}</span>
                ),
            },
            {
                header: 'Status',
                accessorKey: 'status',
                cell: (info) => {
                    const status = info.getValue() as string;
                    return (
                        <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                        >
                            {status}
                        </span>
                    );
                },
            },
            {
                header: 'Actions',
                id: 'actions',
                cell: (info) => {
                    const teacher = info.row.original;
                    return (
                        <div className="text-right space-x-2">
                            <button
                                onClick={() => toggleStatus(teacher.id)}
                                className={`text-xs font-medium ${
                                    teacher.status === 'Active' ? 'text-red-600' : 'text-green-600'
                                }`}
                            >
                                {teacher.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                                onClick={() => navigate(`/school-admin/teachers/${teacher.id}/classes`)}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                            >
                                Change class
                            </button>
                        </div>
                    );
                },
            },
        ],
        [navigate]
    );

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

            <DataTable
                data={paginated}
                columns={columns}
                isLoading={loading}
                emptyMessage="No teachers found."
            />

            {totalPages > 1 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filtered.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                    isLoading={loading}
                />
            )}

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
