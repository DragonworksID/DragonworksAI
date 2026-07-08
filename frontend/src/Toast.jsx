import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

// Lightweight toast stack — no external deps. showToast(message, type) queues
// a dismissable notification that auto-clears after ~4.5s. Used in place of
// inline error banners for transient, action-triggered feedback (a failed
// login, a failed generation) so those don't permanently occupy layout space
// the way a persistent inline banner would.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)

  const dismiss = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'error') => {
    counter.current += 1
    const id = counter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), 4500)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            onClick={() => dismiss(t.id)}
            title="Click to dismiss"
          >
            <span>{t.type === 'success' ? '✅' : t.type === 'info' ? 'ℹ️' : '⚠️'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
