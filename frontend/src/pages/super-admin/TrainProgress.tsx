import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { getWebSocketUrl } from '../../config/api';

const TrainProgress: React.FC = () => {
    const { fileId } = useParams<{ fileId: string }>();
    const navigate = useNavigate();
    const role = localStorage.getItem('role');
    const returnPath = role === 'TEACHER' ? '/teacher/upload' : '/train-llm';
    const [logs, setLogs] = useState<string[]>([]);
    const [completed, setCompleted] = useState(false);
    const [progress, setProgress] = useState(0);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Connect to same host as page (production) or localhost:8000 (dev)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = import.meta.env.PROD ? window.location.host : '127.0.0.1:8000';
        const wsUrl = `${protocol}//${host}/upload/ws/train/${fileId}`;

        console.log('[TrainProgress] Connecting WebSocket to:', wsUrl);
        const socket = new WebSocket(wsUrl);
        ws.current = socket;

        socket.onopen = () => {
            console.log('[TrainProgress] WebSocket connected.');
            addLog("Connected to training server...");
        };

        socket.onmessage = (event) => {
            const message = event.data;
            if (message === "DONE") {
                const markComplete = async () => {
                    try {
                        await api.put(`/upload/training-material/${fileId}/status`, { file_status: 'Trained' });
                    } catch (error) {
                        console.error('Failed to mark file as trained', error);
                    } finally {
                        setCompleted(true);
                        setProgress(100);
                        addLog("✓ Training Completed Successfully!");
                    }
                };
                void markComplete();
            } else {
                addLog(message);
                // Simulate progress based on log count (rough estimation)
                setProgress(prev => Math.min(95, prev + 5));
            }
        };

        socket.onerror = (error) => {
            console.error('[TrainProgress] WebSocket Error:', error);
            addLog("Error: Connection failed. Check browser console for details.");
        };

        socket.onclose = (event) => {
            console.log('[TrainProgress] WebSocket closed. Code:', event.code, 'Reason:', event.reason);
            addLog(`Connection closed (code: ${event.code}).`);
        };

        return () => {
            if (socket.readyState === 1) { // OPEN
                socket.close();
            }
        };
    }, [fileId]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    return (
        <div className="space-y-6">
            {/* Gradient Header with Progress */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                        {completed ? (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold">Training Progress</h1>
                        <p className="text-indigo-100 text-lg mt-1">
                            {completed ? 'Training completed successfully!' : 'Training in progress...'}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-5xl font-bold">{progress}%</div>
                        <div className="text-indigo-100 text-sm mt-1">{completed ? 'Complete' : 'Processing'}</div>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="mt-6 bg-white/20 rounded-full h-4 overflow-hidden backdrop-blur-sm">
                    <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                        style={{ width: `${progress}%` }}
                    >
                        {progress > 10 && (
                            <span className="text-xs font-bold text-white drop-shadow-md">{progress}%</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Enhanced Terminal/Log Display */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center gap-3">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex-1 text-center">
                        <span className="text-slate-300 text-sm font-mono font-bold">Training Console - File #{fileId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="font-mono">LIVE</span>
                    </div>
                </div>
                <div className="bg-slate-950 text-slate-100 p-6 h-[500px] overflow-y-auto font-mono text-sm leading-relaxed">
                    {logs.map((log, i) => (
                        <div
                            key={i}
                            className="mb-2 pb-2 border-b border-slate-800/50 last:border-0 hover:bg-slate-900/50 px-2 py-1 rounded transition-colors"
                        >
                            {log}
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-indigo-500"></div>
                            <div className="text-slate-500 italic text-center">
                                <div className="text-lg font-semibold">Initializing connection...</div>
                                <div className="text-xs mt-2">Waiting for training server response</div>
                            </div>
                        </div>
                    )}
                    {/* Auto-scroll anchor */}
                    <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                </div>
            </div>

            {/* Enhanced Action Buttons */}
            <div className="flex justify-between items-center">
                <button
                    onClick={() => navigate(returnPath)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-md hover:shadow-lg"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to List
                </button>
                <button
                    onClick={() => navigate(returnPath)}
                    disabled={!completed}
                    className={`inline-flex items-center gap-2 px-8 py-3 text-sm font-bold rounded-xl transition-all shadow-md ${completed
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:shadow-lg hover:scale-105'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    {completed ? (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Finish & Return
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Training in Progress...
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default TrainProgress;
