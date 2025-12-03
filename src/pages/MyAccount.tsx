import { Link } from 'react-router-dom';
import { User, Mail, Building, Shield, Key, Building2, Phone, MessageCircle, AlertCircle } from 'lucide-react';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useCurrentUser } from '../hooks/useData';
import CompanyProfileForm from '../components/forms/CompanyProfileForm';
import ParticipantModal from '../components/hr/ParticipantModal';
import { useParticipantActions } from '../hooks/useData';
import { useToast } from '../context/ToastContext';
import { useState } from 'react';

export default function MyAccount() {
    const { user, participant, isAdmin, company, loading } = useCurrentUser();
    const { updateParticipant } = useParticipantActions();
    const toast = useToast();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleUpdateProfile = async (data: any) => {
        if (!participant) return;
        setIsSaving(true);
        try {
            // Filter out fields that regular users might not have permission to update
            // or that shouldn't be updated from this view (like role, company_id, email)
            const allowedFields = ['first_name', 'last_name', 'phone', 'title'];
            const filteredData = Object.keys(data)
                .filter(key => allowedFields.includes(key))
                .reduce((obj, key) => {
                    obj[key] = data[key];
                    return obj;
                }, {} as any);

            if (Object.keys(filteredData).length === 0) {
                toast.error('No hay cambios válidos para guardar.');
                return;
            }

            await updateParticipant(participant.id, filteredData);
            toast.success('Perfil actualizado correctamente.');
            setIsEditModalOpen(false);
            // Force reload user data if possible, or just rely on local state update if implemented
            window.location.reload(); // Simple way to refresh data for now
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Error al actualizar el perfil.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando perfil...</div>;
    }

    if (!user) {
        return <div className="p-8 text-center text-red-500">No se pudo cargar la información del usuario.</div>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Mi Cuenta</h1>
                <p className="text-gray-600 mt-1">Gestiona tu información personal y seguridad.</p>
            </div>

            {/* Personal Information (Read-Only for now) */}
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <User className="w-5 h-5 mr-2 text-blue-600" />
                        Información Personal
                    </h2>
                    {participant && (
                        <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                            Editar Perfil
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Nombre Completo</label>
                            <div className="text-gray-900 font-medium text-lg flex items-center">
                                {participant ? `${participant.first_name} ${participant.last_name} ` : 'N/A'}
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Correo Electrónico</label>
                            <div className="text-gray-900 font-medium text-lg flex items-center">
                                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                {user.email}
                            </div>
                        </div>

                        {/* Phone / WhatsApp */}
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">WhatsApp / Teléfono</label>
                            <div className="text-gray-900 font-medium text-lg flex items-center">
                                {participant?.phone ? (
                                    <>
                                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                        {participant.phone}
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="WhatsApp Configurado">
                                            <MessageCircle size={12} className="mr-1" />
                                            WhatsApp
                                        </span>
                                    </>
                                ) : (
                                    <div className="flex items-center text-amber-600 text-base">
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        Sin configurar
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Rol</label>
                            <div className="text-gray-900 font-medium text-lg flex items-center">
                                <Shield className="w-4 h-4 mr-2 text-gray-400" />
                                {isAdmin ? 'Administrador' : participant?.role || 'Participante'}
                            </div>
                        </div>

                        {/* Company (Read-only for Participants) */}
                        {!isAdmin && (
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Empresa</label>
                                <div className="text-gray-900 font-medium text-lg flex items-center">
                                    <Building className="w-4 h-4 mr-2 text-gray-400" />
                                    {company?.name || 'Sin empresa asociada'}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Company Profile (Editable for Admins) */}
            {isAdmin && company && (
                <Card>
                    <CardContent className="pt-6">
                        <CompanyProfileForm company={company} />
                    </CardContent>
                </Card>
            )}

            {/* Security */}
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <Shield className="w-5 h-5 mr-2 text-blue-600" />
                        Seguridad
                    </h2>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Contraseña</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Se recomienda cambiar tu contraseña periódicamente para mantener tu cuenta segura.
                            </p>
                        </div>
                        <Link to="/reset-password">
                            <Button variant="secondary">
                                <Key className="w-4 h-4 mr-2" />
                                Cambiar Contraseña
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Profile Modal */}
            {participant && (
                <ParticipantModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onConfirm={handleUpdateProfile}
                    participantToEdit={participant}
                    loading={isSaving}
                />
            )}
        </div>
    );
}

