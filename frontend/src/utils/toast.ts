/**
 * Toast notification utility
 * Simple wrapper that can be replaced with react-hot-toast later
 */

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

class ToastManager {
  private toasts: Map<string, HTMLDivElement> = new Map();

  show(message: string, type: ToastType = 'info', options: ToastOptions = {}) {
    const { duration = 3000, position = 'top-right' } = options;
    
    // Create toast element
    const toast = document.createElement('div');
    const id = Date.now().toString();
    
    // Style based on type
    const styles = {
      success: 'bg-green-50 border-green-500 text-green-800',
      error: 'bg-red-50 border-red-500 text-red-800',
      warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
      info: 'bg-blue-50 border-blue-500 text-blue-800'
    };

    const icons = {
      success: `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
      error: `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
      warning: `<svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
      info: `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    };

    // Position classes
    const positionClasses = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2'
    };

    toast.className = `fixed ${positionClasses[position]} z-50 max-w-md ${styles[type]} border-l-4 p-4 rounded-lg shadow-lg animate-slide-in flex items-center gap-3`;
    toast.innerHTML = `
      ${icons[type]}
      <p class="font-medium flex-1">${message}</p>
      <button onclick="this.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;

    document.body.appendChild(toast);
    this.toasts.set(id, toast);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }

    return id;
  }

  remove(id: string) {
    const toast = this.toasts.get(id);
    if (toast) {
      toast.style.animation = 'slide-out 0.3s ease-out';
      setTimeout(() => {
        toast.remove();
        this.toasts.delete(id);
      }, 300);
    }
  }

  success(message: string, options?: ToastOptions) {
    return this.show(message, 'success', options);
  }

  error(message: string, options?: ToastOptions) {
    return this.show(message, 'error', options);
  }

  warning(message: string, options?: ToastOptions) {
    return this.show(message, 'warning', options);
  }

  info(message: string, options?: ToastOptions) {
    return this.show(message, 'info', options);
  }
}

// Export singleton instance
export const toast = new ToastManager();

// Add required CSS animations to your global CSS or index.css
// @keyframes slide-in {
//   from { transform: translateX(100%); opacity: 0; }
//   to { transform: translateX(0); opacity: 1; }
// }
// @keyframes slide-out {
//   from { transform: translateX(0); opacity: 1; }
//   to { transform: translateX(100%); opacity: 0; }
// }
