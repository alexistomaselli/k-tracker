import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Users, Mail, Phone, Briefcase } from 'lucide-react';
import { useParticipants, useParticipantActions, useAreas } from '../hooks/useData';
import { Participant } from '../data/mockData';
import ParticipantModal from '../components/hr/ParticipantModal';
import { useToast } from '../context/ToastContext';

export default function HumanResources() {
    const { participants, loading, error, reloadParticipants } = useParticipants();
    const { createParticipant, updateParticipant, deleteParticipant } = useParticipantActions();
    const { areas } = useAreas();
    const { addToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [participantToEdit, setParticipantToEdit] = useState<Participant | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const handleCreate = () => {
        setParticipantToEdit(null);
        setIsModalOpen(true);
    };

    const handleEdit = (participant: Participant) => {
        setParticipantToEdit(participant);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este participante?')) {
            try {
                setActionLoading(true);
                await deleteParticipant(id);
                await reloadParticipants();
                addToast('Participante eliminado correctamente', 'success');
            } catch (err) {
                console.error('Error deleting participant:', err);
                addToast('Error al eliminar el participante', 'error');
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleSave = async (data: Partial<Participant>) => {
        try {
            setActionLoading(true);
            if (participantToEdit) {
                await updateParticipant(participantToEdit.id, data);
                addToast('Participante actualizado correctamente', 'success');
            } else {
                await createParticipant(data as any);
                addToast('Participante creado correctamente', 'success');
            }
            await reloadParticipants();
            setIsModalOpen(false);
        } catch (err) {
            console.error('Error saving participant:', err);
            addToast('Error al guardar el participante', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const getAreaName = (areaId?: string) => {
        if (!areaId) return 'Sin Área';
        return areas.find(a => a.id === areaId)?.name || 'Sin Área';
    };

    const getAreaColor = (areaId?: string) => {
        if (!areaId) return '#9CA3AF';
        return areas.find(a => a.id === areaId)?.color || '#9CA3AF';
    };

    const filteredParticipants = participants.filter(p =>
        p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.role && p.role.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading && participants.length === 0) return <div className="p-8 text-center text-gray-500">Cargando participantes...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Recursos Humanos</h1>
                    <p className="text-gray-500">Gestiona el personal y los participantes de la empresa</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} />
                    <span>Nuevo Participante</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o cargo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Participante</th>
                                <th className="px-6 py-3">Contacto</th>
                                <th className="px-6 py-3">Cargo / Área</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredParticipants.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        No se encontraron participantes
                                    </td>
                                </tr>
                            ) : (
                                filteredParticipants.map((participant) => (
                                    <tr key={participant.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                                    {participant.first_name[0]}{participant.last_name[0]}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {participant.title} {participant.first_name} {participant.last_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {participant.active ? (
                                                            <span className="text-green-600 flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                                                                Activo
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                                                Inactivo
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <Mail size={14} className="mr-2" />
                                                    {participant.email}
                                                </div>
                                                {participant.phone && (
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <Phone size={14} className="mr-2" />
                                                        {participant.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center text-sm text-gray-900 font-medium">
                                                    <Briefcase size={14} className="mr-2 text-gray-400" />
                                                    {participant.role || 'Sin Cargo'}
                                                </div>
                                                <div className="flex items-center">
                                                    <span
                                                        className="px-2 py-0.5 text-xs rounded-full text-white"
                                                        style={{ backgroundColor: getAreaColor(participant.area_id) }}
                                                    >
                                                        {getAreaName(participant.area_id)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(participant)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(participant.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ParticipantModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleSave}
                participantToEdit={participantToEdit}
                loading={actionLoading}
            />
        </div>
    );
}
