import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode intentionally double-invokes useEffect in development
// to help detect side effects and bugs. This is expected behavior.
// Production builds do NOT have this double-invocation.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
