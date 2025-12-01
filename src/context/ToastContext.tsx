import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast, { ToastType } from '../components/ui/Toast';

interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    toast: {
        success: (message: string, duration?: number) => void;
        error: (message: string, duration?: number) => void;
        warning: (message: string, duration?: number) => void;
        info: (message: string, duration?: number) => void;
    };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((message: string, type: ToastType, duration?: number) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = {
        success: (message: string, duration?: number) => addToast(message, 'success', duration),
        error: (message: string, duration?: number) => addToast(message, 'error', duration),
        warning: (message: string, duration?: number) => addToast(message, 'warning', duration),
        info: (message: string, duration?: number) => addToast(message, 'info', duration),
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map((t) => (
                    <div key={t.id} className="pointer-events-auto">
                        <Toast
                            id={t.id}
                            message={t.message}
                            type={t.type}
                            duration={t.duration}
                            onClose={removeToast}
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context.toast;
}
