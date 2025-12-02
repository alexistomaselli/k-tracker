import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import SearchableSelect from '../ui/SearchableSelect';
import { useParticipants, useTaskActions, useAreas, useParticipantActions } from '../../hooks/useData';
import { Task } from '../../data/mockData';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    minuteId?: string;
    taskToEdit?: Task | null;
    onSuccess: () => void;
}

export default function TaskModal({
    isOpen,
    onClose,
    projectId,
    minuteId,
    taskToEdit,
    onSuccess,
}: TaskModalProps) {
    const { participants, reloadParticipants } = useParticipants();
    const { createTask, updateTask } = useTaskActions();
    const { updateParticipant } = useParticipantActions();
    const { areas } = useAreas();

    const [formData, setFormData] = useState({
        description: '',
        assigneeId: '',
        priority: 'medium',
        status: 'pending',
        dueDate: '',
        areaId: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [shouldUpdateParticipantArea, setShouldUpdateParticipantArea] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (taskToEdit) {
                setFormData({
                    description: taskToEdit.description,
                    assigneeId: taskToEdit.assignee_id || '',
                    priority: taskToEdit.priority,
                    status: taskToEdit.status,
                    dueDate: taskToEdit.due_date || '',
                    areaId: taskToEdit.area_id || '',
                });
            } else {
                setFormData({
                    description: '',
                    assigneeId: '',
                    priority: 'medium',
                    status: 'pending',
                    dueDate: '',
                    areaId: '',
                });
            }
            setShouldUpdateParticipantArea(false);
        }
    }, [isOpen, taskToEdit]);

    // Auto-set area when assignee changes
    const handleAssigneeChange = (assigneeId: string) => {
        const participant = participants.find(p => p.id === assigneeId);
        const participantAreaId = participant?.area_id || '';

        setFormData(prev => ({
            ...prev,
            assigneeId,
            areaId: participantAreaId || prev.areaId
        }));

        // If participant is selected but has no area, we flag that we might want to update them
        if (assigneeId && !participantAreaId) {
            setShouldUpdateParticipantArea(true);
        } else {
            setShouldUpdateParticipantArea(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // If we need to update the participant's area
            if (shouldUpdateParticipantArea && formData.assigneeId && formData.areaId) {
                await updateParticipant(formData.assigneeId, {
                    area_id: formData.areaId
                });
                await reloadParticipants(); // Reload to reflect changes
            }

            if (taskToEdit) {
                await updateTask(taskToEdit.id, {
                    description: formData.description,
                    assignee_id: formData.assigneeId || undefined,
                    priority: formData.priority,
                    status: formData.status,
                    due_date: formData.dueDate || undefined,
                    area_id: formData.areaId || undefined,
                });
            } else {
                await createTask({
                    project_id: projectId,
                    description: formData.description,
                    assignee_id: formData.assigneeId || undefined,
                    priority: formData.priority,
                    status: formData.status,
                    due_date: formData.dueDate || undefined,
                    minute_id: minuteId,
                    area_id: formData.areaId || undefined,
                });
            }

            onSuccess();
            onClose();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Error al guardar la tarea';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const getAreaName = (areaId: string) => {
        const area = areas.find(a => a.id === areaId);
        return area ? area.name : 'Sin Área asignada';
    };

    const selectedParticipant = participants.find(p => p.id === formData.assigneeId);
    const isAreaLocked = !!selectedParticipant?.area_id;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {taskToEdit ? 'Editar Tarea' : 'Nueva Tarea'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción *
                        </label>
                        <Input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                            placeholder="Descripción de la tarea"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Responsable
                            </label>
                            <SearchableSelect
                                options={participants.map(p => {
                                    const area = areas.find(a => a.id === p.area_id);
                                    return {
                                        value: p.id,
                                        label: `${p.first_name} ${p.last_name}`,
                                        description: p.title,
                                        badge: area ? { text: area.name, color: area.color } : undefined
                                    };
                                })}
                                value={formData.assigneeId}
                                onChange={handleAssigneeChange}
                                placeholder="Sin responsable"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Área
                            </label>
                            {!formData.assigneeId ? (
                                <div className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md text-gray-400 italic">
                                    Seleccionar responsable primero
                                </div>
                            ) : isAreaLocked ? (
                                <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-600">
                                    {getAreaName(formData.areaId)}
                                </div>
                            ) : (
                                <div>
                                    <select
                                        value={formData.areaId}
                                        onChange={(e) => setFormData({ ...formData, areaId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D8C] focus:border-transparent"
                                        required={!!formData.assigneeId} // Require area if assignee is selected
                                    >
                                        <option value="">Seleccionar área</option>
                                        {areas.map((area) => (
                                            <option key={area.id} value={area.id}>
                                                {area.name}
                                            </option>
                                        ))}
                                    </select>
                                    {shouldUpdateParticipantArea && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            Se asignará esta área al participante.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Prioridad
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D8C] focus:border-transparent"
                            >
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Estado
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D8C] focus:border-transparent"
                            >
                                <option value="pending">Pendiente</option>
                                <option value="in_progress">En Progreso</option>
                                <option value="completed">Completada</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de Vencimiento
                        </label>
                        <Input
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? 'Guardar' : (taskToEdit ? 'Guardar Cambios' : 'Crear Tarea')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
