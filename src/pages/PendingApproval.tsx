import { Clock, LogOut } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useCurrentUser } from '../hooks/useData';

export default function PendingApproval() {
    const { signOut } = useAuth();
    const { company, isAdmin } = useCurrentUser();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-8 h-8 text-yellow-600" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Cuenta en Revisión</h1>

                {isAdmin ? (
                    <p className="text-gray-600 mb-6">
                        La cuenta de tu empresa <span className="font-bold text-gray-900">{company?.name || 'tu organización'}</span> ha sido creada y está pendiente de aprobación por parte de nuestros administradores.
                        Te notificaremos por correo electrónico una vez que el acceso haya sido habilitado.
                    </p>
                ) : (
                    <p className="text-gray-600 mb-6">
                        La empresa <span className="font-bold text-gray-900">{company?.name || 'tu organización'}</span> a la que estás asociado se encuentra en proceso de revisión.
                        Podrás acceder a tus tareas una vez que la cuenta de la empresa haya sido aprobada.
                    </p>
                )}

                <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-8 text-sm text-blue-800">
                    Mientras tanto, puedes explorar nuestros planes públicos o contactar a soporte si tienes alguna duda.
                </div>

                <Button variant="outline" onClick={signOut} className="w-full flex items-center justify-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                </Button>
            </div>
        </div>
    );
}
