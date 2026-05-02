import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toastMethods = {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info')
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl pointer-events-auto animate-[fade-in-down_0.3s_ease-out] min-w-[300px] max-w-sm ${t.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                t.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
              }`}
          >
            <div className="shrink-0">
              {t.type === 'success' && <FaCheckCircle size={20} />}
              {t.type === 'error' && <FaExclamationCircle size={20} />}
              {t.type === 'info' && <FaInfoCircle size={20} />}
            </div>
            <p className="flex-1 text-sm font-semibold text-white drop-shadow-md">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-white transition-colors">
              <FaTimes size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
