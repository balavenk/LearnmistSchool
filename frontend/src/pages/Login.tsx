import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            console.log("Attempting login with", { username, url: '/token' });

            // Use URLSearchParams for application/x-www-form-urlencoded
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            const response = await api.post('/api/token', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 5000 // 5 second timeout
            });

            console.log("Login response", response);

            const { access_token, role, username: returnedUsername, school_name } = response.data;

            if (access_token) {
                localStorage.setItem('token', access_token);
                localStorage.setItem('role', role);
                localStorage.setItem('username', returnedUsername || username);
                if (school_name) localStorage.setItem('schoolName', school_name);
                if (response.data.id) localStorage.setItem('userId', response.data.id);


                // Redirect based on role
                if (role.toUpperCase() === 'SUPER_ADMIN') navigate('/super-admin');
                else if (role.toUpperCase() === 'SCHOOL_ADMIN') navigate('/school-admin');
                else if (role.toUpperCase() === 'TEACHER') navigate('/teacher');
                else if (role.toUpperCase() === 'STUDENT') navigate('/student');
                else if (role.toUpperCase() === 'INDIVIDUAL') navigate('/individual');
                else navigate('/');
            } else {
                toast.error("Login failed: No access token received");
            }

        } catch (error: any) {
            console.error("Login failed", error);
            const errorMessage = error.response?.data?.detail || error.message || "Login failed";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex w-full">
            {/* Left Side - Hero Section */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 z-10" />
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />

                <div className="relative z-20 text-center px-12">
                    <h1 className="text-5xl font-bold text-white mb-6">Learnmist School</h1>
                    <p className="text-xl text-indigo-200">Empowering the next generation of learners.</p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
                <div className="w-full max-w-md">
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
                        <p className="text-slate-500">Please enter your details to sign in.</p>
                        <div className="mt-4 p-4 bg-indigo-50 rounded-lg text-xs text-indigo-800">
                            <p className="font-bold mb-1">Mock Login Hints:</p>
                            <p>Username containing "super" - Super Admin</p>
                            <p>Username containing "school" - School Admin</p>
                            <p>Username containing "teacher" - Teacher</p>
                            <p>Otherwise - Student</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all placeholder-slate-400"
                                placeholder="Enter your username"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all placeholder-slate-400"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                <label className="ml-2 text-sm text-slate-600">Remember me</label>
                            </div>
                            <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">Forgot password?</a>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-slate-600">
                        Don't have an account? <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-800">Sign up for free</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
