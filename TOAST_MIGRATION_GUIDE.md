# Toast Notification Migration Guide

## Why Replace alert()?

❌ **Problems with alert():**
- Blocks the entire UI (prevents navigation)
- Looks outdated
- Stops JavaScript execution
- Can't be styled
- Poor UX

✅ **Benefits of Toast Notifications:**
- Non-blocking
- Professional appearance
- Auto-dismissible
- Stackable (multiple toasts)
- Can be styled to match your brand

---

## Quick Start

### Option 1: Use Custom Toast Utility (Already Created)

1. **Add CSS animations to `frontend/src/index.css`:**

```css
@keyframes slide-in {
  from { 
    transform: translateX(100%); 
    opacity: 0; 
  }
  to { 
    transform: translateX(0); 
    opacity: 1; 
  }
}

@keyframes slide-out {
  from { 
    transform: translateX(0); 
    opacity: 1; 
  }
  to { 
    transform: translateX(100%); 
    opacity: 0; 
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
```

2. **Usage in any component:**

```tsx
import { toast } from '../utils/toast';

// Replace alerts with:
alert('Success!') → toast.success('Success!');
alert('Error!') → toast.error('Error!');
alert('Warning!') → toast.warning('Warning!');
alert('Info!') → toast.info('Info!');
```

### Option 2: Use React-Hot-Toast (Industry Standard) ⭐ RECOMMENDED

1. **Install:**
```bash
npm install react-hot-toast
```

2. **Add to App.tsx:**
```tsx
import { Toaster } from 'react-hot-toast';

const App = () => {
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      {/* Your app routes */}
    </>
  );
};
```

3. **Usage:**
```tsx
import toast from 'react-hot-toast';

toast.success('Assignment created!');
toast.error('Failed to save');
toast.loading('Uploading...');
toast.promise(
  saveData(),
  {
    loading: 'Saving...',
    success: 'Saved!',
    error: 'Failed to save',
  }
);
```

---

## Migration Examples

### Before (Login.tsx):
```tsx
try {
  // ... login code
} catch (error) {
  alert("Login failed: " + error.message);
}
```

### After:
```tsx
import { toast } from '../utils/toast';

try {
  // ... login code
} catch (error) {
  toast.error(`Login failed: ${error.message}`);
}
```

---

## Files to Update (23 alerts found):

1. ✅ `pages/teacher/Grading.tsx` - Already fixed with inline errors
2. ⏳ `pages/Login.tsx` - 2 alerts
3. ⏳ `pages/teacher/UploadPdf.tsx` - 3 alerts
4. ⏳ `pages/teacher/Students.tsx` - 1 alert
5. ⏳ `pages/teacher/StudentGrading.tsx` - 2 alerts
6. ⏳ `pages/teacher/QuizDetails.tsx` - 4 alerts
7. ⏳ `pages/teacher/QuestionBank.tsx` - 2 alerts
8. ⏳ `pages/teacher/Assignments.tsx` - 6 alerts
9. ⏳ `pages/super-admin/UserManagement.tsx` - 1 alert
10. ⏳ `components/UploadMaterialModal.tsx` - 1 alert

---

## Best Practices

### ✅ DO:
- Use toast for temporary feedback
- Use toast.success() for successful operations
- Use toast.error() for failures
- Use inline errors for form validation
- Auto-dismiss after 3-5 seconds

### ❌ DON'T:
- Use alert() anymore
- Use toast for critical confirmations (use modal instead)
- Show too many toasts at once
- Make toasts persist forever

---

## Quick Migration Script

Replace all alerts with a single command pattern:

```bash
# Find all alerts:
grep -r "alert(" frontend/src --include="*.tsx"
```

Then replace manually or create a script to replace common patterns.

---

## Component Pattern: Inline Errors (for forms)

```tsx
const [error, setError] = useState('');

{error && (
  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-700 font-medium">{error}</p>
      </div>
      <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
        ✕
      </button>
    </div>
  </div>
)}
```

---

## Summary

**Recommended Approach:**
1. Install `react-hot-toast` for toast notifications
2. Use toasts for 90% of alerts
3. Keep inline errors for form validation (like Grading page)
4. Use modals only for critical confirmations

This gives you professional, non-blocking notifications that enhance UX significantly!
