import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Mail, Phone, Briefcase, MessageCircle, AlertCircle } from 'lucide-react';
import { useParticipants, useParticipantActions, useAreas, useCurrentUser } from '../hooks/useData';
import { Participant } from '../data/mockData';
import ParticipantModal from '../components/hr/ParticipantModal';
import { useToast } from '../context/ToastContext';

export default function HumanResources() {
    const { participants, loading, error, reloadParticipants } = useParticipants();
    const { createParticipant, updateParticipant, deleteParticipant } = useParticipantActions();
    const { areas } = useAreas();
    const { user } = useCurrentUser();
    const toast = useToast();

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

    const [deleteId, setDeleteId] = useState<string | null>(null);

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            setActionLoading(true);
            await deleteParticipant(deleteId);
            await reloadParticipants();
            toast.success('Participante eliminado correctamente');
        } catch (err) {
            console.error('Error deleting participant:', err);
            toast.error('Error al eliminar el participante');
        } finally {
            setActionLoading(false);
            setDeleteId(null);
        }
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
    };

    const handleSave = async (data: Partial<Participant>) => {
        try {
            setActionLoading(true);
            if (participantToEdit) {
                // If editing self, filter out restricted fields to avoid RLS errors
                let updateData = { ...data };
                if (user && participantToEdit.id === user.id) {
                    // Filter out role, active, email, and company_id for self-update
                    // Email usually requires auth flow to change
                    const { role, active, email, company_id, ...rest } = data as any;
                    updateData = rest;
                }

                // Fix area_id type mismatch: convert null to undefined if necessary
                if (updateData.area_id === null) {
                    updateData.area_id = undefined;
                }

                await updateParticipant(participantToEdit.id, updateData);
                toast.success('Participante actualizado correctamente');
            } else {
                // Fix area_id type mismatch for create
                const createData = { ...data } as any;
                if (createData.area_id === null) {
                    createData.area_id = undefined;
                }

                const result = await createParticipant(createData as Omit<Participant, 'id' | 'created_at'>);
                if (result && result.inviteSent) {
                    toast.success('Participante creado y correo de invitación enviado');
                } else {
                    toast.success('Participante creado correctamente (sin invitación enviada)');
                }
            }
            await reloadParticipants();
            setIsModalOpen(false);
        } catch (err: any) {
            console.error('Error saving participant:', err);
            // Supabase errors are not always instances of Error, but have a message property
            const errorMessage = err.message || (err instanceof Error ? err.message : 'Error desconocido');
            toast.error(`Error: ${errorMessage}`);
        } finally {
            setActionLoading(false);
        }
    };

    const getAreaName = (areaId?: string | null) => {
        if (!areaId) return 'Sin Área';
        return areas.find(a => a.id === areaId)?.name || 'Sin Área';
    };

    const getAreaColor = (areaId?: string | null) => {
        if (!areaId) return '#9CA3AF';
        return areas.find(a => a.id === areaId)?.color || '#9CA3AF';
    };

    const filteredParticipants = participants.filter(p =>
        p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.role && p.role.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading && participants.length === 0) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando participantes...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recursos Humanos</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gestiona el personal y los participantes de la empresa</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} />
                    <span>Nuevo Participante</span>
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o cargo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Participante</th>
                                <th className="px-6 py-3">Contacto</th>
                                <th className="px-6 py-3">Cargo / Área</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredParticipants.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No se encontraron participantes
                                    </td>
                                </tr>
                            ) : (
                                filteredParticipants.map((participant) => (
                                    <tr key={participant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                                                    {participant.first_name[0]}{participant.last_name[0]}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {participant.title} {participant.first_name} {participant.last_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {participant.active ? (
                                                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></span>
                                                                Activo
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></span>
                                                                Inactivo
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                    <Mail size={14} className="mr-2" />
                                                    {participant.email}
                                                </div>
                                                {participant.phone ? (
                                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                        <Phone size={14} className="mr-2" />
                                                        {participant.phone}
                                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400" title="WhatsApp Configurado">
                                                            <MessageCircle size={10} className="mr-1" />
                                                            WhatsApp
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center text-sm text-amber-600 dark:text-amber-500" title="Falta configurar WhatsApp">
                                                        <AlertCircle size={14} className="mr-2" />
                                                        Sin WhatsApp
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center text-sm text-gray-900 dark:text-white font-medium">
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
                                                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(participant.id)}
                                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar eliminación</h3>
                        <p className="text-gray-600 mb-6">
                            ¿Estás seguro de que deseas eliminar este participante? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                disabled={actionLoading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
