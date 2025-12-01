import React from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Building, Shield, Key } from 'lucide-react';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useCurrentUser } from '../hooks/useData';
import CompanyProfileForm from '../components/forms/CompanyProfileForm';

export default function MyAccount() {
    const { user, participant, isAdmin, company, loading } = useCurrentUser();

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
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Nombre Completo</label>
                            <div className="text-gray-900 font-medium text-lg flex items-center">
                                {participant ? `${participant.first_name} ${participant.last_name}` : 'N/A'}
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
        </div>
    );
}
