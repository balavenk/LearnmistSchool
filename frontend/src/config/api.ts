/**
 * Centralized API Configuration
 * 
 * Manages environment-specific API endpoints and settings.
 * Uses Vite's import.meta.env for environment variables.
 */

// Validate required environment variables
if (!import.meta.env.VITE_API_URL) {
    console.warn('⚠️  VITE_API_URL is not defined. Using fallback URL.');
}

if (!import.meta.env.VITE_WS_URL) {
    console.warn('⚠️  VITE_WS_URL is not defined. Using fallback URL.');
}

/**
 * API Configuration Object
 */
export const API_CONFIG = {
    /** Base URL for REST API calls */
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    
    /** Base URL for WebSocket connections */
    wsURL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
    
    /** Request timeout in milliseconds */
    timeout: 30000,
    
    /** Whether to send cookies with cross-origin requests */
    withCredentials: false,
} as const;

/**
 * Environment Information
 */
export const ENV = {
    /** Is running in development mode */
    isDevelopment: import.meta.env.MODE === 'development',
    
    /** Is running in staging mode */
    isStaging: import.meta.env.MODE === 'staging',
    
    /** Is running in production mode */
    isProduction: import.meta.env.MODE === 'production',
    
    /** Current environment mode */
    mode: import.meta.env.MODE as 'development' | 'staging' | 'production',
    
    /** Is development environment (Vite's built-in check) */
    isDev: import.meta.env.DEV,
    
    /** Is production build */
    isProd: import.meta.env.PROD,
} as const;

/**
 * Helper function to construct WebSocket URLs
 * 
 * @param path - WebSocket endpoint path (e.g., '/upload/ws/train/123')
 * @returns Complete WebSocket URL
 * 
 * @example
 * const wsUrl = getWebSocketUrl('/upload/ws/train/123');
 * // Returns: 'ws://localhost:8000/upload/ws/train/123'
 */
export const getWebSocketUrl = (path: string): string => {
    const wsBase = API_CONFIG.wsURL.replace(/\/$/, ''); // Remove trailing slash
    const wsPath = path.startsWith('/') ? path : `/${path}`; // Ensure leading slash
    return `${wsBase}${wsPath}`;
};

/**
 * Helper function to log configuration in development
 */
if (ENV.isDevelopment) {
    console.log('🔧 API Configuration:', {
        baseURL: API_CONFIG.baseURL,
        wsURL: API_CONFIG.wsURL,
        mode: ENV.mode,
    });
}

export default API_CONFIG;
