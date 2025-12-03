import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Participant } from '../../data/mockData';
import { useAreas } from '../../hooks/useData';
import { getSupabase } from '../../lib/supabase';

interface ParticipantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (participant: Partial<Participant>) => void;
    participantToEdit?: Participant | null;
    loading?: boolean;
}

export default function ParticipantModal({
    isOpen,
    onClose,
    onConfirm,
    participantToEdit,
    loading = false,
}: ParticipantModalProps) {
    const { areas } = useAreas();
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Participant>>({
        first_name: '',
        last_name: '',
        email: '',
        title: '',
        role: '',
        phone: '',
        area_id: '',
    });

    useEffect(() => {
        if (isOpen) {
            setError(null); // Clear errors on open
            if (participantToEdit) {
                setFormData({
                    first_name: participantToEdit.first_name,
                    last_name: participantToEdit.last_name,
                    email: participantToEdit.email,
                    title: participantToEdit.title || '',
                    role: participantToEdit.role || '',
                    phone: participantToEdit.phone || '',
                    area_id: participantToEdit.area_id || '',
                });
            } else {
                setFormData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    title: '',
                    role: '',
                    phone: '',
                    area_id: '',
                });
            }
        }
    }, [isOpen, participantToEdit]);

    if (!isOpen) return null;

    const validatePhone = (phone: string) => {
        // Allow empty phone (optional)
        if (!phone) return true;

        // Remove non-digits to check length
        const digits = phone.replace(/\D/g, '');

        // Check length (11-15 to enforce country code)
        // Argentina: 54 + 10 digits = 12
        // US: 1 + 10 digits = 11
        // Most countries with code are > 10
        if (digits.length < 11 || digits.length > 15) {
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate Phone Format
        if (formData.phone && !validatePhone(formData.phone)) {
            setError('El número debe incluir el código de país (mínimo 11 dígitos). Ej: 519...');
            return;
        }

        // Sanitize Phone: Remove everything except digits
        const sanitizedPhone = formData.phone ? formData.phone.replace(/\D/g, '') : '';

        // Sanitize Payload
        const sanitizedData = {
            ...formData,
            phone: sanitizedPhone,
            // Convert empty string area_id to null to avoid UUID error
            area_id: formData.area_id === '' ? null : formData.area_id,
        };

        // Check for Duplicate Phone
        if (sanitizedPhone) {
            const supabase = getSupabase();
            if (!supabase) {
                setError('Error de conexión. Intente nuevamente.');
                return;
            }
            let query = supabase
                .from('participants')
                .select('id')
                .or(`phone.eq.${sanitizedPhone},phone.eq.+${sanitizedPhone}`);

            // If editing, exclude current participant
            if (participantToEdit) {
                query = query.neq('id', participantToEdit.id);
            }

            const { data: existingParticipants, error: queryError } = await query;

            if (queryError) {
                console.error('Error checking duplicate phone:', queryError);
                setError('Error al validar el número de teléfono. Intente nuevamente.');
                return;
            }

            if (existingParticipants && existingParticipants.length > 0) {
                setError('El número de WhatsApp ya está registrado por otro usuario.');
                return;
            }
        }

        onConfirm(sanitizedData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {participantToEdit ? 'Editar Participante' : 'Nuevo Participante'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Ej. Juan"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Apellido *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Ej. Pérez"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Título
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Ej. Ing., Arq."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cargo
                            </label>
                            <input
                                type="text"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Ej. Gerente de Proyecto"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="juan.perez@empresa.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Teléfono
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Ej. 51912345678 (con código país)"
                        />
                        <p className="text-xs text-gray-500 mt-1">Ingresa el número con código de país (ej: 51 para Perú).</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Área
                        </label>
                        <select
                            value={formData.area_id || ''}
                            onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                            <option value="">Seleccionar Área</option>
                            {areas.map((area) => (
                                <option key={area.id} value={area.id}>
                                    {area.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <span>{participantToEdit ? 'Guardar Cambios' : 'Crear Participante'}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
