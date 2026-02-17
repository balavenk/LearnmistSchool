import axios from 'axios';
import API_CONFIG from '../config/api';

const api = axios.create({
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    withCredentials: API_CONFIG.withCredentials,
});

// Add a request interceptor to include the JWT token
// Add a request interceptor to include the JWT token and Log Requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`🌐 [Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    return config;
});

// Add a response interceptor to handle 401 Unauthorized errors and Log Responses
api.interceptors.response.use(
    (response) => {
        console.log(`✅ [Response] ${response.status} ${response.config.url}`, response.data);
        return response;
    },
    (error) => {
        console.error(`❌ [Error] ${error.response?.status} ${error.config?.url}`, error.response?.data || error.message);

        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
