import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { jwtDecode } from "jwt-decode";


interface TokenPayload {
    role: string;
    sub: string;
}

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const response = await api.post('/token', formData);
            const { access_token } = response.data;

            localStorage.setItem('token', access_token);

            const decoded = jwtDecode<TokenPayload>(access_token);
            const role = decoded.role;

            setTimeout(() => {
                if (role === 'SUPER_ADMIN') navigate('/super-admin');
                else if (role === 'SCHOOL_ADMIN') navigate('/school-admin');
                else if (role === 'TEACHER') navigate('/teacher');
                else if (role === 'STUDENT') navigate('/student');
                else navigate('/');
            }, 500);

        } catch (err: any) {
            setError(err.response?.status === 401 ? 'Invalid username or password' : 'Login failed. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 animate-gradient-x p-4 sm:p-0">
            {/* Overlay for better contrast/texture if needed */}
            <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-md mx-auto transform transition-all duration-300 hover:scale-[1.01]">
                {/* Glassmorphism Card */}
                <div className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 sm:p-12 overflow-hidden">

                    {/* Header Section */}
                    <div className="text-center mb-10 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -z-10"></div>

                        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">
                            Welcome Back
                        </h1>
                        <p className="text-gray-500 font-medium">
                            Sign in to access your dashboard
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 mx-2 animate-pulse">
                            <div className="bg-red-50/80 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-center text-sm font-semibold shadow-sm backdrop-blur-sm">
                                {error}
                            </div>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="group">
                            <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-2 ml-1 transition-colors group-focus-within:text-indigo-600">
                                Username
                            </label>
                            <div className={`relative transition-all duration-300 rounded-xl ${focusedInput === 'username' ? 'ring-4 ring-indigo-500/20 transform scale-[1.02]' : ''}`}>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onFocus={() => setFocusedInput('username')}
                                    onBlur={() => setFocusedInput(null)}
                                    className="w-full px-5 py-4 rounded-xl bg-gray-50/50 border border-gray-200 text-gray-900 placeholder-gray-400 font-medium focus:bg-white focus:outline-none focus:border-indigo-500 transition-all duration-200 shadow-sm"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="group">
                            <div className="flex justify-between items-center mb-2 ml-1">
                                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider transition-colors group-focus-within:text-indigo-600">
                                    Password
                                </label>
                                <a href="#" className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors">
                                    Forgot password?
                                </a>
                            </div>
                            <div className={`relative transition-all duration-300 rounded-xl ${focusedInput === 'password' ? 'ring-4 ring-indigo-500/20 transform scale-[1.02]' : ''}`}>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedInput('password')}
                                    onBlur={() => setFocusedInput(null)}
                                    className="w-full px-5 py-4 rounded-xl bg-gray-50/50 border border-gray-200 text-gray-900 placeholder-gray-400 font-medium focus:bg-white focus:outline-none focus:border-indigo-500 transition-all duration-200 shadow-sm"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg shadow-indigo-500/30 transition-all duration-300 transform ${isLoading
                                ? 'bg-gray-400 cursor-not-allowed scale-[0.98]'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-[0.98]'
                                }`}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Signing In...</span>
                                </div>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-10 text-center">
                        <p className="text-sm text-gray-500 font-medium">
                            Don't have an account?
                            <a href="#" className="ml-1 text-indigo-600 hover:text-indigo-800 font-bold hover:underline transition-all">
                                Sign up
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
