import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    onClose: (id: string) => void;
}

export default function Toast({ id, message, type, duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        const timer = setTimeout(() => {
            setIsVisible(false);
            // Wait for exit animation to finish before removing
            setTimeout(() => onClose(id), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, id, onClose]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300);
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />
    };

    const bgColors = {
        success: 'bg-white border-green-100',
        error: 'bg-white border-red-100',
        warning: 'bg-white border-amber-100',
        info: 'bg-white border-blue-100'
    };

    return (
        <div
            className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border
        transition-all duration-300 transform
        ${bgColors[type]}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
            role="alert"
        >
            <div className="flex-shrink-0">
                {icons[type]}
            </div>
            <p className="text-sm font-medium text-gray-800">{message}</p>
            <button
                onClick={handleClose}
                className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
