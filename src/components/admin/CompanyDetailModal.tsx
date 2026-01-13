import { X, User, Mail, Building, Phone, MessageCircle, AlertCircle, Shield } from 'lucide-react';
import { Company, Participant } from '../../data/mockData';
import Card, { CardContent, CardHeader } from '../ui/Card';

interface CompanyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    company: Company;
    adminParticipant: Participant | null;
    loadingAdmin: boolean;
}

export default function CompanyDetailModal({ isOpen, onClose, company, adminParticipant, loadingAdmin }: CompanyDetailModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-6">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Detalles de la Empresa</h2>
                        <p className="text-gray-500 dark:text-gray-400">Información administrativa y de contacto.</p>
                    </div>

                    <div className="space-y-6">

                        {/* Company Data */}
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <Building className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                                    Datos de la Empresa
                                </h3>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre de la Empresa</label>
                                        <div className="text-gray-900 dark:text-white font-medium text-lg">{company.name}</div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">CUIT / RUT</label>
                                        <div className="text-gray-900 dark:text-white font-medium text-lg">{company.tax_id || 'No registrado'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Dirección</label>
                                        <div className="text-gray-900 dark:text-white font-medium text-lg">{company.address || 'No registrada'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Teléfono</label>
                                        <div className="text-gray-900 dark:text-white font-medium text-lg">{company.phone || 'No registrado'}</div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email Corporativo</label>
                                        <div className="text-gray-900 dark:text-white font-medium text-lg">{company.email}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Admin Data */}
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <User className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                                    Información del Administrador
                                </h3>
                            </CardHeader>
                            <CardContent>
                                {loadingAdmin ? (
                                    <div className="flex justify-center p-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : adminParticipant ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre Completo</label>
                                            <div className="text-gray-900 dark:text-white font-medium text-lg">
                                                {adminParticipant.first_name} {adminParticipant.last_name}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Correo Electrónico</label>
                                            <div className="text-gray-900 dark:text-white font-medium text-lg flex items-center">
                                                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                                {adminParticipant.email}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">WhatsApp / Teléfono</label>
                                            <div className="text-gray-900 dark:text-white font-medium text-lg flex items-center">
                                                {adminParticipant.phone ? (
                                                    <>
                                                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                                        {adminParticipant.phone}
                                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400" title="WhatsApp Configurado">
                                                            <MessageCircle size={12} className="mr-1" />
                                                            WhatsApp
                                                        </span>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center text-amber-600 dark:text-amber-500 text-base">
                                                        <AlertCircle className="w-4 h-4 mr-2" />
                                                        Sin configurar
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Rol</label>
                                            <div className="text-gray-900 dark:text-white font-medium text-lg flex items-center">
                                                <Shield className="w-4 h-4 mr-2 text-gray-400" />
                                                {adminParticipant.role}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500 py-4">
                                        No se encontró información del administrador.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </div>
    );
}
