import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

interface Country {
    id: number;
    name: string;
}

const Countries: React.FC = () => {
    const [countries, setCountries] = useState<Country[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [currentCountry, setCurrentCountry] = useState<Country | null>(null);
    const [formData, setFormData] = useState({ name: '' });

    const fetchCountries = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/super-admin/master/countries');
            setCountries(response.data);
        } catch (error) {
            console.error("Failed to fetch countries", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCountries();
    }, []);

    const handleCreate = () => {
        setModalMode('add');
        setCurrentCountry(null);
        setFormData({ name: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (country: Country) => {
        setModalMode('edit');
        setCurrentCountry(country);
        setFormData({ name: country.name });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this country?")) return;
        try {
            await api.delete(`/api/super-admin/master/countries/${id}`);
            fetchCountries();
            toast.success("Country deleted successfully");
        } catch (error: any) {
            console.error("Delete failed", error);
            toast.error("Failed to delete. " + (error.response?.data?.detail || "It might be in use."));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modalMode === 'add') {
                await api.post('/api/super-admin/master/countries', formData);
                toast.success("Country created successfully");
            } else {
                if (!currentCountry) return;
                await api.put(`/api/super-admin/master/countries/${currentCountry.id}`, formData);
                toast.success("Country updated successfully");
            }
            setIsModalOpen(false);
            fetchCountries();
        } catch (error: any) {
            console.error("Save failed", error);
            toast.error("Failed to save. " + (error.response?.data?.detail || ""));
        }
    };

    const filteredCountries = useMemo(() => {
        return countries.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [countries, searchTerm]);

    return (
        <div className="space-y-8">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Countries</h1>
                        <p className="text-indigo-100 text-lg">Manage supported countries and regions</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-xl shadow-md font-bold transition-all duration-200 flex items-center gap-2 hover:scale-105"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Country
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 p-5">
                <div className="relative w-full max-w-xl">
                    <svg className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search countries by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                </div>
            </div>

            {/* Enhanced Table */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b-2 border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">All Countries ({filteredCountries.length})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b-2 border-slate-200">
                                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-600 tracking-wider">Country Name</th>
                                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-600 tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={2} className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div></td></tr>
                            ) : filteredCountries.length === 0 ? (
                                <tr><td colSpan={2} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                            </svg>
                                        </div>
                                        <p className="text-slate-500 font-medium text-lg">No countries found</p>
                                    </div>
                                </td></tr>
                            ) : filteredCountries.map((country) => (
                                <tr key={country.id} className="hover:bg-indigo-50 transition-colors duration-150">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl p-3 font-bold text-lg shadow-md">
                                                {country.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-900 text-lg">{country.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(country)}
                                                className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-lg transition-all text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(country.id)}
                                                className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-lg transition-all text-red-600 bg-red-50 hover:bg-red-100 border border-red-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Enhanced Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8 border-2 border-slate-200">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-3">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">{modalMode === 'add' ? 'Add Country' : 'Edit Country'}</h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-2 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Country Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter country name"
                                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-4 pt-6 border-t-2 border-slate-200">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-all hover:shadow-md">Cancel</button>
                                <button type="submit" className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-bold shadow-lg hover:shadow-xl transition-all">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Countries;
