import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const TrainFileDetails: React.FC = () => {
    const { fileId } = useParams<{ fileId: string }>();
    const navigate = useNavigate();
    const [file, setFile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [metadata, setMetadata] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
    const [aiAgent, setAiAgent] = useState('Open AI');
    const [model, setModel] = useState('GPT 4.1');
    const [training, setTraining] = useState(false);

    useEffect(() => {
        if (fileId) fetchFileDetails();
    }, [fileId]);

    const fetchFileDetails = async () => {
        try {
            const response = await api.get(`/upload/training-material/id/${fileId}`);
            setFile(response.data);
            if (response.data.file_metadata) {
                try {
                    const parsed = JSON.parse(response.data.file_metadata);
                    const metaArray = Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) }));
                    if (metaArray.length > 0) setMetadata(metaArray);
                } catch (e) {
                    console.error("Error parsing metadata", e);
                }
            }
        } catch (error) {
            console.error("Failed to fetch file details", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMetadataChange = (index: number, field: 'key' | 'value', value: string) => {
        const newMetadata = [...metadata];
        newMetadata[index][field] = value;
        setMetadata(newMetadata);
    };

    const addMetadataRow = () => {
        if (metadata.length < 10) {
            setMetadata([...metadata, { key: '', value: '' }]);
        }
    };

    const removeMetadataRow = (index: number) => {
        const newMetadata = metadata.filter((_, i) => i !== index);
        setMetadata(newMetadata);
    };

    const handleTrain = async () => {
        setTraining(true);
        // Convert metadata array to object
        const metaObject: any = {};
        metadata.forEach(item => {
            if (item.key.trim()) metaObject[item.key] = item.value;
        });

        // Add AI Agent and Model to metadata
        metaObject['ai_agent'] = aiAgent;
        metaObject['model'] = model;

        try {
            await api.post(`/upload/training-material/${fileId}/train`, {
                file_status: 'Trained',
                file_metadata: JSON.stringify(metaObject)
            });
            alert("Training initiated successfully!");
            navigate('/train-llm');
        } catch (error) {
            console.error("Training failed", error);
            alert("Failed to initiate training.");
        } finally {
            setTraining(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
    if (!file) return <div className="p-8 text-center text-red-500">File not found</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Train File Details</h1>
                <button onClick={() => navigate('/train-llm')} className="text-sm text-slate-500 hover:text-indigo-600">Back to List</button>
            </div>

            {/* File Info Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-2 gap-4">
                <div><span className="text-slate-500 block text-xs uppercase tracking-wide">File Name</span> <span className="font-medium">{file.original_filename}</span></div>
                <div><span className="text-slate-500 block text-xs uppercase tracking-wide">Size</span> <span>{(file.file_size / 1024).toFixed(1)} KB</span></div>
                <div><span className="text-slate-500 block text-xs uppercase tracking-wide">School</span> <span>{file.school_name}</span></div>
                <div><span className="text-slate-500 block text-xs uppercase tracking-wide">Grade</span> <span>{file.grade_name}</span></div>
                <div><span className="text-slate-500 block text-xs uppercase tracking-wide">Subject</span> <span>{file.subject_name}</span></div>
                <div><span className="text-slate-500 block text-xs uppercase tracking-wide">Status</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${file.file_status === 'Trained' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{file.file_status}</span>
                </div>
            </div>

            {/* Configurations */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                <h2 className="text-lg font-semibold text-slate-800">Training Configuration</h2>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">AI Agent</label>
                        <select
                            value={aiAgent}
                            onChange={(e) => setAiAgent(e.target.value)}
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        >
                            <option value="Open AI">Open AI</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        >
                            <option value="GPT 4.1">GPT 4.1</option>
                        </select>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-slate-700">Metadata (Max 10)</label>
                        <button onClick={addMetadataRow} disabled={metadata.length >= 10} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 disabled:opacity-50">+ Add Attribute</button>
                    </div>
                    <div className="space-y-2">
                        {metadata.map((item, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Key (e.g., Difficulty)"
                                    className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    value={item.key}
                                    onChange={(e) => handleMetadataChange(index, 'key', e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Value (e.g., Hard)"
                                    className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    value={item.value}
                                    onChange={(e) => handleMetadataChange(index, 'value', e.target.value)}
                                />
                                {metadata.length > 1 && (
                                    <button onClick={() => removeMetadataRow(index)} className="text-red-500 hover:text-red-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={handleTrain}
                        disabled={training}
                        className={`
                            px-6 py-2 rounded-lg text-white font-medium transition-colors shadow-sm
                            ${training ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
                        `}
                    >
                        {training ? 'Initiating Training...' : 'Train on this'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrainFileDetails;
