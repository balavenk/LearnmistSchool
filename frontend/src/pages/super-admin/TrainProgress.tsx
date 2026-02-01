import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TrainProgress: React.FC = () => {
    const { fileId } = useParams<{ fileId: string }>();
    const navigate = useNavigate();
    const [logs, setLogs] = useState<string[]>([]);
    const [completed, setCompleted] = useState(false);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Initialize WebSocket
        // Connect to same host as API but ws protocol
        // Assuming API is proxied via vite or absolute URL
        // In local dev main.py runs on localhost:8000
        const wsUrl = `ws://localhost:8000/upload/ws/train/${fileId}`;

        const socket = new WebSocket(wsUrl);
        ws.current = socket;

        socket.onopen = () => {
            addLog("Connected to training server...");
        };

        socket.onmessage = (event) => {
            const message = event.data;
            if (message === "DONE") {
                setCompleted(true);
                addLog("Training Completed Successfully!");
            } else {
                addLog(message);
            }
        };

        socket.onerror = (error) => {
            console.error("WebSocket Error:", error);
            addLog("Error: Connection failed.");
        };

        socket.onclose = () => {
            addLog("Connection closed.");
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
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Training Progress</h1>

            <div className="bg-slate-900 text-slate-100 p-6 rounded-xl shadow-lg h-[500px] overflow-y-auto font-mono text-sm leading-relaxed border border-slate-700">
                {logs.map((log, i) => (
                    <div key={i} className="mb-1 border-b border-slate-800 pb-1 last:border-0">{log}</div>
                ))}
                {logs.length === 0 && <div className="text-slate-500 italic">Initializing connection...</div>}

                {/* Auto-scroll anchor */}
                <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
            </div>

            <div className="flex justify-end gap-4">
                <button
                    onClick={() => navigate('/train-llm')}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors shadow-sm ${completed ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                    disabled={!completed}
                >
                    {completed ? 'Finish & Back to List' : 'Training in Progress...'}
                </button>
            </div>
        </div>
    );
};

export default TrainProgress;
