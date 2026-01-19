import React, { useState } from 'react';
import api from '../api/axios';

const SUBJECTS = ["Mathematics", "Physics", "Chemistry"];

interface Question {
    id: number;
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
}

const QuizGenerator: React.FC = () => {
    const [subject, setSubject] = useState(SUBJECTS[0]);
    const [numQuestions, setNumQuestions] = useState(5);
    const [customInstructions, setCustomInstructions] = useState('');
    const [limitClass, setLimitClass] = useState('');
    const [limitCategory, setLimitCategory] = useState('');
    const [loading, setLoading] = useState(false);
    const [quiz, setQuiz] = useState<Question[]>([]);
    const [error, setError] = useState('');

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setQuiz([]);

        try {
            const response = await api.post('/quiz/generate', {
                subject,
                num_questions: numQuestions,
                custom_instructions: customInstructions,
                limit_to_class: limitClass,
                limit_to_category: limitCategory
            });
            setQuiz(response.data);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to generate quiz. Make sure you have trained materials and a valid API Key.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">✨ AI Quiz Generator</h1>

            {/* Config Panel */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-100">
                <form onSubmit={handleGenerate} className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="w-full md:w-1/3">
                            <label className="block text-sm font-medium text-slate-600 mb-2">Subject</label>
                            <select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="w-full md:w-1/4">
                            <label className="block text-sm font-medium text-slate-600 mb-2">Number of Questions</label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={numQuestions}
                                onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Strict Filtering Section */}
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                        <h3 className="text-sm font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                            🔒 Strict Context Filtering (Optional)
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="w-full md:w-1/2">
                                <label className="block text-xs font-medium text-indigo-600 mb-1">Limit to Class/Grade</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 10"
                                    value={limitClass}
                                    onChange={(e) => setLimitClass(e.target.value)}
                                    className="w-full px-3 py-2 rounded border border-indigo-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="w-full md:w-1/2">
                                <label className="block text-xs font-medium text-indigo-600 mb-1">Limit to Category</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mechanics"
                                    value={limitCategory}
                                    onChange={(e) => setLimitCategory(e.target.value)}
                                    className="w-full px-3 py-2 rounded border border-indigo-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-indigo-400 mt-2">
                            * If set, AI will ONLY use content that exactly matches these tags + Subject.
                        </p>
                    </div>

                    <div className="w-full">
                        <label className="block text-sm font-medium text-slate-600 mb-2">
                            System Instructions / Focus Area <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <textarea
                            value={customInstructions}
                            onChange={(e) => setCustomInstructions(e.target.value)}
                            placeholder="e.g. Focus specifically on Chapter 3: Thermodynamics, or 'Create harder questions involving calculations'."
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 text-sm"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md'}`}
                        >
                            {loading ? 'Generating...' : 'Generate Quiz 🪄'}
                        </button>
                    </div>
                </form>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm">
                        {error}
                    </div>
                )}
            </div>

            {/* Quiz Display */}
            <div className="space-y-6">
                {quiz.map((q, index) => (
                    <div key={q.id} className="bg-white rounded-xl shadow-md p-6 border border-slate-100 animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="flex items-start gap-4">
                            <span className="bg-indigo-100 text-indigo-700 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                {index + 1}
                            </span>
                            <div className="w-full">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">{q.question}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {q.options.map((opt, i) => (
                                        <div key={i} className={`p-3 rounded-lg border ${opt === q.correct_answer ? 'bg-green-50 border-green-200 ring-1 ring-green-400' : 'bg-slate-50 border-slate-200'}`}>
                                            <span className="text-sm text-slate-700">{opt}</span>
                                            {opt === q.correct_answer && <span className="ml-2 text-green-600 text-xs font-bold">✓ Answer</span>}
                                        </div>
                                    ))}
                                </div>
                                {q.explanation && (
                                    <div className="mt-4 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                                        <strong>Explanation:</strong> {q.explanation}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QuizGenerator;
