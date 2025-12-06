import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { useParticipants, useAreas } from '../../hooks/useData';
import { useToast } from '../../context/ToastContext';
import { ProjectRoutine } from '../../data/mockData';

interface CreateRoutineModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    companyId: string;
    routineToEdit?: ProjectRoutine | null;
    onSuccess: (routine: any) => Promise<void>;
}

export default function CreateRoutineModal({ isOpen, onClose, projectId, companyId, routineToEdit, onSuccess }: CreateRoutineModalProps) {
    const [description, setDescription] = useState('');
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'event'>('daily');
    const [assigneeId, setAssigneeId] = useState('');
    const [loading, setLoading] = useState(false);

    const { participants } = useParticipants();
    const { getAreaById } = useAreas();
    const toast = useToast();

    useEffect(() => {
        if (isOpen && routineToEdit) {
            setDescription(routineToEdit.description);
            setFrequency(routineToEdit.frequency);
            setAssigneeId(routineToEdit.assignee_id || '');
        } else if (isOpen) {
            setDescription('');
            setFrequency('daily');
            setAssigneeId('');
        }
    }, [isOpen, routineToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const routineData = {
                project_id: projectId,
                company_id: companyId,
                description,
                frequency,
                assignee_id: assigneeId || null,
            };

            if (routineToEdit) {
                await onSuccess({ ...routineData, id: routineToEdit.id });
            } else {
                await onSuccess(routineData);
            }

            onClose();
            setDescription('');
            setFrequency('daily');
            setAssigneeId('');
        } catch (error) {
            console.error('Error saving routine:', error);
            toast.error(routineToEdit ? 'Error al actualizar la rutina' : 'Error al crear la rutina');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {routineToEdit ? 'Editar Rutina' : 'Nueva Rutina de Proyecto'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción
                        </label>
                        <input
                            type="text"
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D8C]"
                            placeholder="Ej: Regar camino de acceso"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Frecuencia
                        </label>
                        <select
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D8C]"
                        >
                            <option value="daily">Diaria</option>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensual</option>
                            <option value="event">Por Evento</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Responsable (Opcional)
                        </label>
                        <select
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D8C]"
                        >
                            <option value="">Sin asignar</option>
                            {participants.map((p) => {
                                const area = getAreaById(p.area_id || '');
                                return (
                                    <option key={p.id} value={p.id}>
                                        {p.first_name} {p.last_name} ({area?.name || p.title || 'Sin área'})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? 'Guardando...' : (routineToEdit ? 'Guardar Cambios' : 'Crear Rutina')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
