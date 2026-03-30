import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ExtractProgress: React.FC = () => {
    const { fileId } = useParams<{ fileId: string }>();
    const navigate = useNavigate();
    const [logs, setLogs] = useState<string[]>([]);
    const [completed, setCompleted] = useState(false);
    const [progress, setProgress] = useState(0);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = import.meta.env.PROD ? window.location.host : '127.0.0.1:8000';
        const wsUrl = `${protocol}//${host}/upload/ws/extract/${fileId}`;

        console.log('[ExtractProgress] Connecting WebSocket to:', wsUrl);
        const socket = new WebSocket(wsUrl);
        ws.current = socket;

        socket.onopen = () => {
            console.log('[ExtractProgress] WebSocket connected.');
            addLog("Connected to extraction server...");
        };

        socket.onmessage = (event) => {
            const message = event.data;
            if (message === "DONE") {
                setCompleted(true);
                setProgress(100);
                addLog("✓ Extraction Completed Successfully!");
            } else if (message.startsWith("Error:")) {
                addLog(message);
            } else {
                addLog(message);
                // Progress increments
                setProgress((prev: number) => Math.min(98, prev + 2));
            }
        };

        socket.onerror = (error) => {
            console.error('[ExtractProgress] WebSocket Error:', error);
            addLog("Error: Connection failed.");
        };

        socket.onclose = () => {
            console.log('[ExtractProgress] WebSocket closed.');
            addLog(`Connection closed.`);
        };

        return () => {
            if (socket.readyState === 1) {
                socket.close();
            }
        };
    }, [fileId]);

    const addLog = (msg: string) => {
        setLogs((prev: string[]) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl shadow-lg p-8 text-white">
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
                        <h1 className="text-2xl font-bold">Extraction Progress</h1>
                        <p className="text-orange-100 text-lg mt-1">
                            {completed ? 'AI extraction finished!' : 'AI is extracting questions...'}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-5xl font-bold">{progress}%</div>
                        <div className="text-orange-100 text-sm mt-1">{completed ? 'Complete' : 'Processing'}</div>
                    </div>
                </div>
                <div className="mt-6 bg-white/20 rounded-full h-4 overflow-hidden backdrop-blur-sm">
                    <div
                        className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center gap-3">
                    <span className="text-slate-300 text-sm font-mono font-bold">Extraction Console</span>
                </div>
                <div className="bg-slate-950 text-slate-100 p-6 h-[500px] overflow-y-auto font-mono text-sm leading-relaxed">
                    {logs.map((log: string, i: number) => (
                        <div key={i} className="mb-1">{log}</div>
                    ))}
                    <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                </div>
            </div>

            <div className="flex justify-between items-center">
                <button
                    onClick={() => navigate('/manage-question-bank')}
                    className="px-6 py-3 text-sm font-bold rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
                >
                    Back to Question Bank
                </button>
                <button
                    onClick={() => navigate('/manage-question-bank')}
                    disabled={!completed}
                    className={`px-8 py-3 text-sm font-bold rounded-xl transition-all shadow-md ${completed
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {completed ? 'Finish & Return' : 'Ongoing...'}
                </button>
            </div>
        </div>
    );
};

export default ExtractProgress;
