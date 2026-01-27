import React, { useState, useEffect } from 'react';
import api from '../api/axios';

interface Material {
    id: number;
    filename: string;
    file_type: string;
    tags: string; // JSON string
    uploaded_by_id: number;
    file_path: string;
}

const SUBJECTS = ["Mathematics", "Physics", "Chemistry"];

const Materials: React.FC = () => {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [subject, setSubject] = useState<string>(SUBJECTS[0]);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const fetchMaterials = async () => {
        try {
            const response = await api.get('/materials/');
            setMaterials(response.data);
        } catch (error) {
            console.error("Failed to fetch materials", error);
        }
    };

    const [classNum, setClassNum] = useState('');
    const [category, setCategory] = useState('');
    const [board, setBoard] = useState('Central');
    const [language, setLanguage] = useState('English');
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        fetchMaterials();
        const role = localStorage.getItem('role') || '';
        setUserRole(role);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setMessage({ text: "Please select a file", type: 'error' });
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('subject', subject);

        // Construct extra_tags JSON
        const extraTags = {
            "Class": classNum,
            "Category": category,
            "Board": board,
            "Language": language
        };
        formData.append('extra_tags', JSON.stringify(extraTags));

        setUploading(true);
        setMessage(null);

        try {
            await api.post('/materials/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage({ text: "File uploaded successfully!", type: 'success' });
            setSelectedFile(null);
            setClassNum('');
            setCategory('');
            setBoard('Central');
            setLanguage('English');

            // Reset file input manually if needed or just let it be
            fetchMaterials();
        } catch (error) {
            console.error("Upload failed", error);
            setMessage({ text: "Upload failed. Please try again.", type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    // Helper to parse tags safely
    const getSubjectFromTags = (tagsJson: string) => {
        try {
            const parsed = JSON.parse(tagsJson);
            return parsed.subject || "Unknown";
        } catch (e) {
            return "Unknown";
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-8">Course Materials</h1>

            {/* Upload Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-100">
                <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center">
                    <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg mr-3">
                        📂
                    </span>
                    Upload New Material
                </h2>

                {message && (
                    <div className={`p-4 mb-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleUpload} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Subject</label>
                            <select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Class / Grade</label>
                            <input
                                type="text"
                                placeholder="e.g. 10, XII, Grade 5"
                                value={classNum}
                                onChange={(e) => setClassNum(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Category</label>
                            <input
                                type="text"
                                placeholder="e.g. Textbook, Chapter 1"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Board</label>
                            <select
                                value={board}
                                onChange={(e) => setBoard(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="Central">Central (CBSE/ICSE)</option>
                                <option value="State">State Board</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Language</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="English">English</option>
                                <option value="Hindi">Hindi</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">File</label>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                        </div>
                    </div>

                    <div className="self-end mt-2">
                        <button
                            type="submit"
                            disabled={uploading}
                            className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${uploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {uploading ? 'Uploading...' : 'Upload Material'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materials.map((material) => (
                    <div key={material.id} className="bg-white rounded-xl shadow-md p-6 border border-slate-100 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                {getSubjectFromTags(material.tags)}
                            </div>
                            <span className="text-xs text-slate-400 uppercase tracking-wide">{material.file_type}</span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-2 truncate" title={material.filename}>
                            {material.filename}
                        </h3>

                        <div className="mt-4 flex justify-between items-center">
                            <span className="text-sm text-slate-500">
                                ID: {material.id}
                            </span>
                            <a
                                href={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/${material.file_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Download ⬇
                            </a>
                        </div>

                        {/* Train Button (Super Admin) */}
                        {userRole && userRole.toUpperCase() === 'SUPER_ADMIN' && (
                            <div className="mt-3 border-t border-slate-100 pt-3 flex justify-end gap-2">
                                <button
                                    onClick={async () => {
                                        if (!window.confirm("Are you sure you want to delete this file? This cannot be undone.")) return;
                                        try {
                                            await api.delete(`/materials/${material.id}`);
                                            setMessage({ text: "File deleted successfully.", type: 'success' });
                                            fetchMaterials(); // Refresh list
                                        } catch (err: any) {
                                            console.error(err);
                                            setMessage({ text: "Failed to delete file.", type: 'error' });
                                        }
                                    }}
                                    className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-100 transition-colors flex items-center gap-1 border border-red-200"
                                >
                                    🗑 Delete
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            setMessage({ text: `Training model with ${material.filename}...`, type: 'success' }); // Info/Success hack
                                            const res = await api.post(`/materials/train/${material.id}`);
                                            const meta = res.data.metadata_used || {};
                                            // Handle cases where keys might be different case or missing
                                            const metaSubject = meta.subject || meta.Subject || 'Unknown';
                                            const metaClass = meta.Class || meta.class || 'Unknown';
                                            const metaCategory = meta.Category || meta.category || 'Unknown';

                                            setMessage({
                                                text: `Success! Trained ${res.data.chunks_processed} chunks. Metadata Used -> Subject: ${metaSubject}, Class: ${metaClass}, Category: ${metaCategory}`,
                                                type: 'success'
                                            });
                                        } catch (err: any) {
                                            console.error(err);
                                            const errorMsg = err.response?.data?.detail || "Training failed";
                                            setMessage({ text: errorMsg, type: 'error' });
                                        }
                                    }}
                                    className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-md hover:bg-slate-700 transition-colors flex items-center gap-1"
                                >
                                    🧠 Train AI
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {materials.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500">
                        No materials found. Upload some to get started!
                    </div>
                )}
            </div>
        </div >
    );
};

export default Materials;
