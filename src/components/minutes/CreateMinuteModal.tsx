import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface CreateMinuteModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectCode: string;
    onSuccess: (minuteId: string, minuteNumber: string) => void;
}

export default function CreateMinuteModal({
    isOpen,
    onClose,
    projectId,
    projectCode,
    onSuccess,
}: CreateMinuteModalProps) {
    const [formData, setFormData] = useState({
        meetingDate: new Date().toISOString().split('T')[0],
        location: '',
        startTime: '',
        endTime: '',
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { useMinuteActions } = await import('../../hooks/useData');
            const { createMinute } = useMinuteActions();

            const result = await createMinute(
                projectId,
                formData.meetingDate,
                formData.location || undefined,
                formData.startTime || undefined,
                formData.endTime || undefined,
                formData.notes || undefined
            );

            if (result) {
                onSuccess(result.minute_id, result.minute_number);
                setFormData({
                    meetingDate: new Date().toISOString().split('T')[0],
                    location: '',
                    startTime: '',
                    endTime: '',
                    notes: '',
                });
            }
        } catch (err: any) {
            setError(err.message || 'Error al crear el acta');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Nueva Acta</h2>
                        <p className="text-sm text-gray-600 mt-1">Proyecto: {projectCode}</p>
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
                            Fecha de Reunión *
                        </label>
                        <Input
                            type="date"
                            value={formData.meetingDate}
                            onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ubicación
                        </label>
                        <Input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Ej: Oficina Central, Sala de Reuniones"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hora de Inicio
                            </label>
                            <Input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hora de Fin
                            </label>
                            <Input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notas
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D8C] focus:border-transparent"
                            rows={4}
                            placeholder="Notas adicionales sobre la reunión..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? 'Creando...' : 'Crear Acta'}
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
