import { ShieldAlert } from 'lucide-react';

export default function ServiceSuspended() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <ShieldAlert className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Servicio Suspendido</h1>
                <p className="text-gray-600 mb-8">
                    La suscripción de la empresa ha vencido o está inactiva.
                    Por favor, comunícate con el administrador de la cuenta para regularizar el servicio.
                </p>
                <div className="text-sm text-gray-400">
                    Si crees que esto es un error, intenta recargar la página en unos minutos.
                </div>
            </div>
        </div>
    );
}
