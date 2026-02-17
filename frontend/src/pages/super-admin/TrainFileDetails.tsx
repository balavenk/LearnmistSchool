import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
                file_status: 'Processing', // Set to Processing initially
                file_metadata: JSON.stringify(metaObject)
            });
            // Navigate to progress screen to start actual training
            navigate(`/train-llm/${fileId}/progress`);
        } catch (error) {
            console.error("Training failed", error);
            toast.error("Failed to initiate training.");
        } finally {
            setTraining(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium text-lg">Loading file details...</p>
            </div>
        </div>
    );
    
    if (!file) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <svg className="w-20 h-20 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 font-bold text-xl">File not found</p>
                <button
                    onClick={() => navigate('/train-llm')}
                    className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                    Back to List
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-4 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Train File Details</h1>
                            <p className="text-indigo-100 text-md mt-1">Configure training parameters and metadata</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/train-llm')} 
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-xl font-bold transition-all border-2 border-white/30 text-white"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to List
                    </button>
                </div>
            </div>

            {/* Enhanced File Info Card */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b-2 border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        File Information
                    </h2>
                </div>
                <div className="p-6 grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <span className="text-slate-500 text-xs uppercase tracking-wide font-bold">File Name</span>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="bg-red-100 rounded-lg p-2">
                                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span className="font-semibold text-slate-900">{file.original_filename}</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-slate-500 text-xs uppercase tracking-wide font-bold">File Size</span>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="bg-blue-100 rounded-lg p-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="font-semibold text-slate-900">{(file.file_size / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-slate-500 text-xs uppercase tracking-wide font-bold">School</span>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="bg-indigo-100 rounded-lg p-2">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="font-semibold text-slate-900">{file.school_name}</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-slate-500 text-xs uppercase tracking-wide font-bold">Grade</span>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="bg-purple-100 rounded-lg p-2">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <span className="font-semibold text-slate-900">{file.grade_name}</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-slate-500 text-xs uppercase tracking-wide font-bold">Subject</span>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="bg-green-100 rounded-lg p-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <span className="font-semibold text-slate-900">{file.subject_name}</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-slate-500 text-xs uppercase tracking-wide font-bold">Status</span>
                        <div className="mt-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 ${
                                file.file_status === 'Trained' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${file.file_status === 'Trained' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                                {file.file_status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Configuration Card */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b-2 border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Training Configuration
                    </h2>
                </div>
                <div className="p-6 space-y-6">

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AI Agent
                        </label>
                        <select
                            value={aiAgent}
                            onChange={(e) => setAiAgent(e.target.value)}
                            className="w-full rounded-xl border-2 border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm p-3 font-medium text-slate-900"
                        >
                            <option value="Open AI">Open AI</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                            Model
                        </label>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full rounded-xl border-2 border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm p-3 font-medium text-slate-900"
                        >
                            <option value="GPT 4.1">GPT 4.1</option>
                        </select>
                    </div>
                </div>

                    <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            Metadata 
                            <span className="text-slate-500 font-normal text-xs">(Max 10 attributes)</span>
                        </label>
                        <button 
                            onClick={addMetadataRow} 
                            disabled={metadata.length >= 10} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-indigo-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Attribute
                        </button>
                    </div>
                    <div className="space-y-3">
                        {metadata.map((item, index) => (
                            <div key={index} className="flex gap-3 items-center group">
                                <input
                                    type="text"
                                    placeholder="Key (e.g., Difficulty)"
                                    className="flex-1 rounded-xl border-2 border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm p-3 font-medium text-slate-900"
                                    value={item.key}
                                    onChange={(e) => handleMetadataChange(index, 'key', e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Value (e.g., Hard)"
                                    className="flex-1 rounded-xl border-2 border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm p-3 font-medium text-slate-900"
                                    value={item.value}
                                    onChange={(e) => handleMetadataChange(index, 'value', e.target.value)}
                                />
                                {metadata.length > 1 && (
                                    <button 
                                        onClick={() => removeMetadataRow(index)} 
                                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove attribute"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                <div className="pt-6 border-t-2 border-slate-200 flex justify-end">
                    <button
                        onClick={handleTrain}
                        disabled={training}
                        className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white font-bold transition-all shadow-md text-sm ${
                            training 
                                ? 'bg-slate-400 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg hover:scale-105'
                        }`}
                    >
                        {training ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Initiating Training...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Start Training
                            </>
                        )}
                    </button>
                </div>
                </div>
            </div>
        </div>
    );
};

export default TrainFileDetails;
