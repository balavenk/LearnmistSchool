import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { jwtDecode } from "jwt-decode";
import logo from '../assets/logo.png';

interface TokenPayload {
    role: string;
    sub: string;
}

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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

            // Wait a moment purely for better UX feeling
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900">
            {/* Background decorative blobs */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
            <div className="absolute bottom-20 right-20 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>



            // ... (inside the component)

            <div className="relative z-10 bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg border border-white border-opacity-20 rounded-2xl shadow-2xl p-8 w-full max-w-md overflow-hidden flex flex-col items-center">
                <div className="text-center mb-8">
                    <img src={logo} alt="Learnmist Logo" className="h-20 w-auto mx-auto mb-4 rounded-full shadow-lg" />
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Learnmist</h1>
                    <p className="text-indigo-200">School Management System</p>
                </div>

                {error && (
                    <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded relative mb-4 text-center text-sm" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-indigo-100 text-sm font-bold mb-2 ml-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-gray-900 bg-opacity-40 border border-gray-600 focus:border-blue-500 focus:bg-gray-800 focus:outline-none text-white placeholder-gray-400 transition duration-200"
                            placeholder="Enter your username"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-indigo-100 text-sm font-bold mb-2 ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-gray-900 bg-opacity-40 border border-gray-600 focus:border-blue-500 focus:bg-gray-800 focus:outline-none text-white placeholder-gray-400 transition duration-200"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between text-sm text-indigo-200">
                        {/* Future feature: Forgot Password */}
                        <a href="#" className="hover:text-white transition">Forgot password?</a>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 px-4 rounded-lg text-white font-bold shadow-lg transition duration-300 transform hover:-translate-y-1 ${isLoading
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                            }`}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Signing In...
                            </div>
                        ) : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
