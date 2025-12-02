import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from '../hooks/useData';
import { MessageSquare, RefreshCw, Link as LinkIcon, Unlink, Smartphone, CheckCircle, AlertCircle, Loader, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

export default function WhatsAppSettings() {
    const { company, isAdmin, loading: loadingUser } = useCurrentUser();
    const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'close' | 'offline' | 'unknown'>('unknown');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const toast = useToast();

    // Evolution API Base URL - In a real app, this might be an env var or proxy
    // We use the one provided by the user, but dynamically we might need to store it in the DB if it varies.
    // For now, we assume the one used in n8n is the global one, but we need the one for the instance.
    // Actually, the instance URL is usually the same base URL.
    const EVOLUTION_API_URL = 'https://kai-pro-evolution-api.3znlkb.easypanel.host';

    const fetchConnectionState = useCallback(async (silent = false) => {
        if (!company?.evolution_instance_name || !company?.evolution_api_key) return;

        try {
            if (!silent) setLoading(true);
            const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${company.evolution_instance_name}`, {
                headers: {
                    'apikey': company.evolution_api_key
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Evolution API returns { instance: { state: 'open' } }
                setConnectionState(data.instance?.state || 'close');
            } else {
                setConnectionState('offline');
            }
        } catch (err) {
            console.error('Error checking status:', err);
            setConnectionState('unknown');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [company, EVOLUTION_API_URL]);

    useEffect(() => {
        if (company?.evolution_instance_name) {
            fetchConnectionState();
        }
    }, [company, fetchConnectionState]);

    // Poll for status when connecting and QR is visible
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (qrCode && connectionState === 'connecting') {
            interval = setInterval(() => fetchConnectionState(true), 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [qrCode, connectionState, fetchConnectionState]);

    const handleConnect = async () => {
        if (!company?.evolution_instance_name || !company?.evolution_api_key) return;

        try {
            setLoading(true);
            setError(null);

            // 1. Check if instance exists first
            let instanceExists = false;
            try {
                const checkRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${company.evolution_instance_name}`, {
                    headers: { 'apikey': company.evolution_api_key || '' }
                });
                if (checkRes.ok) instanceExists = true;
            } catch (e) {
                console.log('Instance check failed', e);
            }

            // 2. Create if not exists
            if (!instanceExists) {
                console.log('Instance not found, creating new one...');
                const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
                    method: 'POST',
                    headers: {
                        'apikey': company.evolution_api_key,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        instanceName: company.evolution_instance_name,
                        token: company.evolution_instance_name.replace('ktracker_', ''),
                        qrcode: true, // Request QR immediately
                        integration: "WHATSAPP-BAILEYS"
                    })
                });

                if (!createResponse.ok) {
                    throw new Error('Failed to create instance');
                }

                // Small delay to ensure instance is ready
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // 3. Always fetch QR code explicitly
            console.log('Fetching QR code...');
            const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${company.evolution_instance_name}`, {
                headers: {
                    'apikey': company.evolution_api_key
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Connect response:', data);

                if (data.base64) {
                    setQrCode(data.base64);
                    setConnectionState('connecting');
                } else if (data.code) {
                    setQrCode(data.code);
                    setConnectionState('connecting');
                } else if (data?.instance?.state === 'open') {
                    setConnectionState('open');
                    toast.info('La instancia ya está conectada.');
                } else {
                    // If no QR, try logging out first to clear stuck session
                    console.warn('No QR, trying logout and retry...');
                    await fetch(`${EVOLUTION_API_URL}/instance/logout/${company.evolution_instance_name}`, {
                        method: 'DELETE',
                        headers: { 'apikey': company.evolution_api_key || '' }
                    });

                    // Wait a bit
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    // Retry connect
                    const retryRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${company.evolution_instance_name}`, {
                        headers: { 'apikey': company.evolution_api_key || '' }
                    });
                    const retryData = await retryRes.json();

                    if (retryData.base64 || retryData.code) {
                        setQrCode(retryData.base64 || retryData.code);
                        setConnectionState('connecting');
                    } else {
                        setError('No se pudo obtener el QR. Intenta "Reiniciar Instancia".');
                    }
                }
            } else {
                setError('No se pudo generar el QR. Intenta nuevamente.');
                toast.error('No se pudo generar el QR.');
            }
        } catch (err) {
            console.error('Error connecting:', err);
            setError('No se pudo obtener el código QR. Verifica que la instancia exista.');
            toast.error('Error al conectar con la API.');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!company?.evolution_instance_name || !company?.evolution_api_key) return;
        // Removed confirm dialog, will use toast for feedback

        setLoading(true);
        try {
            await fetch(`${EVOLUTION_API_URL}/instance/logout/${company.evolution_instance_name}`, {
                method: 'DELETE',
                headers: {
                    'apikey': company.evolution_api_key
                }
            });
            setConnectionState('close');
            setQrCode(null);
            toast.success('WhatsApp desconectado correctamente.');
        } catch (err) {
            console.error('Error disconnecting:', err);
            setError('Error al desconectar.');
            toast.error('Error al desconectar.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetInstance = () => {
        setIsResetModalOpen(true);
    };

    const confirmReset = async () => {
        if (!company?.evolution_instance_name || !company?.evolution_api_key) return;

        try {
            setLoading(true);
            setIsResetModalOpen(false); // Close modal immediately or wait? Better close first.

            // 1. Delete the instance
            await fetch(`${EVOLUTION_API_URL}/instance/delete/${company.evolution_instance_name}`, {
                method: 'DELETE',
                headers: {
                    'apikey': company.evolution_api_key
                }
            });

            // 2. Update local state
            setConnectionState('offline');
            setQrCode(null);
            toast.success('Instancia reiniciada correctamente. Ahora puedes generar un nuevo QR.');

            // 3. Refresh state
            fetchConnectionState();

        } catch (error) {
            console.error('Error resetting instance:', error);
            toast.error('Error al reiniciar la instancia. Por favor intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (loadingUser) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!isAdmin) return <div className="p-8 text-center text-red-600">No tienes permisos para ver esta página.</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-8 h-8 text-green-600" />
                    Integración WhatsApp
                </h1>
                <p className="text-gray-500 mt-2">
                    Conecta tu WhatsApp para recibir notificaciones y gestionar tareas con IA.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${connectionState === 'open' ? 'bg-green-100 text-green-600' :
                                connectionState === 'connecting' ? 'bg-yellow-100 text-yellow-600' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Estado de Conexión</h2>
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                    {connectionState === 'open' ? (
                                        <span className="flex items-center gap-1 text-green-600">
                                            <CheckCircle className="w-4 h-4" /> Conectado
                                        </span>
                                    ) : connectionState === 'connecting' && qrCode ? (
                                        <span className="flex items-center gap-1 text-yellow-600">
                                            <RefreshCw className="w-4 h-4 animate-spin" /> Esperando vinculación...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-gray-500">
                                            <Unlink className="w-4 h-4" /> Desconectado
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => fetchConnectionState(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Actualizar estado"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                            {connectionState === 'open' && (
                                <button
                                    onClick={handleDisconnect}
                                    disabled={loading}
                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                                >
                                    Desconectar
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                    {connectionState === 'open' ? (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">¡WhatsApp Conectado!</h3>
                            <p className="text-gray-500 max-w-md mx-auto">
                                Tu instancia está activa y lista para procesar mensajes. El bot responderá automáticamente a los participantes registrados.
                            </p>
                        </div>
                    ) : (
                        <div className="text-center w-full max-w-md">
                            {!qrCode ? (
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Smartphone className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Vincular Dispositivo</h3>
                                    <p className="text-gray-500 mb-6">
                                        Para comenzar, necesitamos vincular tu WhatsApp. Haz clic en el botón para generar un código QR.
                                    </p>
                                    <button
                                        onClick={handleConnect}
                                        disabled={loading || !company?.evolution_instance_name}
                                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 mx-auto disabled:opacity-50"
                                    >
                                        {loading ? <Loader className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
                                        Conectar WhatsApp
                                    </button>

                                    {error && (
                                        <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-md text-sm justify-center">
                                            <AlertCircle className="w-4 h-4" />
                                            {error}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Escanea el código QR</h3>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 inline-block mb-4">
                                        <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                                    </div>
                                    <p className="text-sm text-gray-500 mb-6">
                                        Abre WhatsApp en tu teléfono {'>'} Menú {'>'} Dispositivos vinculados {'>'} Vincular un dispositivo
                                    </p>
                                    <button
                                        onClick={() => setQrCode(null)}
                                        className="text-gray-500 hover:text-gray-700 text-sm underline"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Danger Zone */}
                <div className="bg-gray-50 p-6 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Zona de Peligro</h3>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Si tienes problemas con la conexión, puedes reiniciar la instancia. Esto eliminará la sesión actual.
                        </p>
                        <button
                            onClick={handleResetInstance}
                            disabled={loading || !company?.evolution_instance_name}
                            className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium whitespace-nowrap"
                        >
                            Reiniciar Instancia
                        </button>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                title="Reiniciar Instancia"
                size="md"
            >
                <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 p-4 bg-amber-50 text-amber-800 rounded-lg">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold mb-1">¿Estás seguro de que quieres continuar?</p>
                            <p>Esta acción eliminará la instancia actual de WhatsApp y desconectará cualquier sesión activa. Tendrás que volver a escanear el código QR.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsResetModalOpen(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            onClick={confirmReset}
                            disabled={loading}
                        >
                            {loading && <Loader className="w-4 h-4 animate-spin mr-2" />}
                            Sí, Reiniciar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
