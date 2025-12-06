import { X, AlertTriangle } from 'lucide-react';
import Button from './Button';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
    loading = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const colors = {
        danger: {
            icon: 'text-red-600 bg-red-100',
            button: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
        },
        warning: {
            icon: 'text-amber-600 bg-amber-100',
            button: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500'
        },
        info: {
            icon: 'text-blue-600 bg-blue-100',
            button: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl transform transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-full ${colors[variant].icon}`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {title}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    {message}
                </p>

                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelText}
                    </Button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${colors[variant].button}`}
                    >
                        {loading ? 'Procesando...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
