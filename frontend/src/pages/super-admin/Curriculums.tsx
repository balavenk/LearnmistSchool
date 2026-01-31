import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';

interface Curriculum {
    id: number;
    name: string;
    country_id: number;
}

interface Country {
    id: number;
    name: string;
}

const Curriculums: React.FC = () => {
    const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ name: '', country_id: '' });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [currRes, countryRes] = await Promise.all([
                api.get('/super-admin/master/curriculums'),
                api.get('/super-admin/master/countries')
            ]);
            setCurriculums(currRes.data);
            setCountries(countryRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = () => {
        setModalMode('add');
        setCurrentId(null);
        setFormData({ name: '', country_id: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (curr: Curriculum) => {
        setModalMode('edit');
        setCurrentId(curr.id);
        setFormData({ name: curr.name, country_id: curr.country_id.toString() });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this curriculum?")) return;
        try {
            await api.delete(`/super-admin/master/curriculums/${id}`);
            fetchData();
            alert("Curriculum deleted successfully");
        } catch (error: any) {
            console.error("Delete failed", error);
            alert("Failed to delete. " + (error.response?.data?.detail || "It might be in use."));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                country_id: parseInt(formData.country_id)
            };

            if (modalMode === 'add') {
                await api.post('/super-admin/master/curriculums', payload);
                alert("Curriculum created successfully");
            } else {
                if (!currentId) return;
                await api.put(`/super-admin/master/curriculums/${currentId}`, payload);
                alert("Curriculum updated successfully");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error("Save failed", error);
            alert("Failed to save. " + (error.response?.data?.detail || ""));
        }
    };

    const filteredList = useMemo(() => {
        return curriculums.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [curriculums, searchTerm]);

    const getCountryName = (id: number) => countries.find(c => c.id === id)?.name || 'Unknown';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Curriculums</h1>
                    <p className="text-slate-500 mt-1">Manage education curriculums by country.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg shadow-sm font-medium flex items-center"
                >
                    <span className="mr-2 text-xl leading-none">+</span> Add Curriculum
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div className="relative w-full max-w-md">
                    <input
                        type="text"
                        placeholder="Search curriculums..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Country</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={3} className="text-center py-8">Loading...</td></tr>
                        ) : filteredList.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 text-slate-900 font-medium">{item.name}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {getCountryName(item.country_id)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="text-red-600 hover:text-red-900 font-medium text-sm"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!loading && filteredList.length === 0 && (
                            <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No records found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">{modalMode === 'add' ? 'Add Curriculum' : 'Edit Curriculum'}</h2>
                            <button onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Curriculum Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                                <select
                                    required
                                    value={formData.country_id}
                                    onChange={(e) => setFormData({ ...formData, country_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">Select Country...</option>
                                    {countries.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Curriculums;
