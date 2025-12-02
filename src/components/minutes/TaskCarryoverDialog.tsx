import { AlertCircle } from 'lucide-react';
import Button from '../ui/Button';

interface TaskCarryoverDialogProps {
    isOpen: boolean;
    pendingTasksCount: number;
    onConfirm: () => void;
    onSkip: () => void;
}

export default function TaskCarryoverDialog({
    isOpen,
    pendingTasksCount,
    onConfirm,
    onSkip,
}: TaskCarryoverDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Tareas Pendientes Detectadas
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Se encontraron <strong>{pendingTasksCount}</strong> {pendingTasksCount === 1 ? 'tarea pendiente' : 'tareas pendientes'} o en progreso de actas anteriores.
                            </p>
                            <p className="text-gray-600 mb-6">
                                ¿Deseas asignar estas tareas a la nueva acta para darles continuidad?
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    variant="primary"
                                    onClick={onConfirm}
                                    className="flex-1"
                                >
                                    Sí, asignar tareas
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={onSkip}
                                    className="flex-1"
                                >
                                    No, continuar sin asignar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
