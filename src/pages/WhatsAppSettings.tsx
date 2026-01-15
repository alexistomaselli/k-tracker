import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from '../hooks/useData';
import { getSupabase } from '../lib/supabase';
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
    const [connectedNumber, setConnectedNumber] = useState<string | null>(null);
    const toast = useToast();

    const [evolutionApiUrl, setEvolutionApiUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const supabase = getSupabase();
            const { data } = await supabase!
                .from('platform_settings')
                .select('value')
                .eq('key', 'evolution_api_url')
                .single();

            if (data?.value) {
                setEvolutionApiUrl(data.value);
            }
        };
        fetchSettings();
    }, []);

    const fetchConnectionState = useCallback(async (silent = false) => {
        if (!company?.evolution_instance_name || !company?.evolution_api_key || !evolutionApiUrl) return;

        try {
            if (!silent) setLoading(true);

            // 1. Check connection state
            const stateResponse = await fetch(`${evolutionApiUrl}/instance/connectionState/${company.evolution_instance_name}`, {
                headers: {
                    'apikey': company.evolution_api_key
                }
            });

            if (stateResponse.ok) {
                const stateData = await stateResponse.json();
                const state = stateData.instance?.state || 'close';
                setConnectionState(state);

                if (state === 'open') {
                    // Clear QR code since we are already connected
                    setQrCode(null);

                    // 2. If open, fetch instance details to get the number
                    try {
                        const instanceResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances?instanceName=${company.evolution_instance_name}`, {
                            headers: {
                                'apikey': company.evolution_api_key
                            }
                        });

                        if (instanceResponse.ok) {
                            const instanceData = await instanceResponse.json();
                            console.log('Instance Data:', instanceData);

                            let targetInstance: any = null;

                            // 1. Try to find in top-level array or object
                            const dataArray = Array.isArray(instanceData) ? instanceData : [instanceData];
                            targetInstance = dataArray.find((i: any) =>
                                i.name === company.evolution_instance_name ||
                                i.instance?.instanceName === company.evolution_instance_name
                            );

                            // 2. If not found, check for nested 'data' property (common in some API versions)
                            if (!targetInstance && instanceData.data) {
                                const nestedArray = Array.isArray(instanceData.data) ? instanceData.data : [instanceData.data];
                                targetInstance = nestedArray.find((i: any) =>
                                    i.name === company.evolution_instance_name ||
                                    i.instance?.instanceName === company.evolution_instance_name
                                );
                            }

                            // 3. Extract number from ownerJid or owner
                            const rawJid = targetInstance?.ownerJid || targetInstance?.instance?.owner || targetInstance?.owner;

                            if (rawJid) {
                                const number = rawJid.split('@')[0];
                                setConnectedNumber(number);
                            } else {
                                setConnectedNumber(null);
                            }
                        }
                    } catch (e) {
                        console.error('Error fetching instance details:', e);
                    }
                } else {
                    setConnectedNumber(null);
                }
            } else if (stateResponse.status === 404) {
                // Instance was deleted from server but not from DB
                setConnectionState('close');
                setConnectedNumber(null);
                setQrCode(null);
                console.log('Instance not found on server, ready for re-creation.');
            } else {
                setConnectionState('offline');
                setConnectedNumber(null);
            }
        } catch (err) {
            console.error('Error checking status:', err);
            setConnectionState('unknown');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [company, evolutionApiUrl]);

    // ... (rest of the file)



    useEffect(() => {
        if (company?.evolution_instance_name && evolutionApiUrl) {
            fetchConnectionState();
        }
    }, [company, evolutionApiUrl, fetchConnectionState]);

    // Poll for status
    useEffect(() => {
        let interval: NodeJS.Timeout;
        // Poll when connecting (to catch the scan) OR when open (to catch external disconnects)
        const shouldPoll = (qrCode && connectionState === 'connecting') || connectionState === 'open';

        if (shouldPoll) {
            // Poll faster when connecting (3s), slower when open (10s) to save resources
            const delay = connectionState === 'connecting' ? 3000 : 10000;
            interval = setInterval(() => fetchConnectionState(true), delay);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [qrCode, connectionState, fetchConnectionState]);

    const handleConnect = async () => {
        if (!company || !evolutionApiUrl) return;

        try {
            setLoading(true);
            setError(null);

            let instanceName = company.evolution_instance_name;
            let apiKey = company.evolution_api_key;
            const supabase = getSupabase();

            // 0. Auto-provision if missing credentials
            if (!instanceName || !apiKey) {
                console.log('Credentials missing, auto-provisioning...');

                // Fetch Global API Key
                const { data: settingsData, error: settingsError } = await supabase!
                    .from('platform_settings')
                    .select('value')
                    .eq('key', 'evolution_global_api_key')
                    .single();

                if (settingsError || !settingsData) {
                    throw new Error('No se pudo obtener la clave global de API.');
                }

                const globalApiKey = settingsData.value;
                const newInstanceName = `ktracker_${company.id}`;

                // Update company with new credentials
                const { error: updateError } = await supabase!
                    .from('company')
                    .update({
                        evolution_instance_name: newInstanceName,
                        evolution_api_key: globalApiKey
                    })
                    .eq('id', company.id);

                if (updateError) throw updateError;

                // Update local vars to proceed immediately
                instanceName = newInstanceName;
                apiKey = globalApiKey;

                // Small delay to ensure DB propagation if needed, though local vars are set
                console.log('Provisioned:', { instanceName, apiKey });
            }

            // 1. Check if instance exists first (using fetchInstances to avoid 404 logs)
            let instanceExists = false;
            try {
                const checkRes = await fetch(`${evolutionApiUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
                    headers: { 'apikey': apiKey || '' }
                });
                if (checkRes.ok) {
                    const instances = await checkRes.json();
                    // Evolution API v2 returns instances in an array or data.data array
                    const dataArray = Array.isArray(instances) ? instances : (instances.data || []);
                    instanceExists = dataArray.some((i: any) =>
                        i.instanceName === instanceName || i.name === instanceName
                    );
                }
            } catch (e) {
                console.log('Instance check failed', e);
            }

            // 2. Create if not exists
            if (!instanceExists) {
                console.log('Instance not found, creating new one...');
                const createResponse = await fetch(`${evolutionApiUrl}/instance/create`, {
                    method: 'POST',
                    headers: {
                        'apikey': apiKey!,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        instanceName: instanceName,
                        token: instanceName!.replace('ktracker_', ''),
                        qrcode: true, // Request QR immediately
                        integration: "WHATSAPP-BAILEYS",
                        webhook: {
                            enabled: true,
                            url: `https://pkeyudivtcfbpjntkbyk.supabase.co/functions/v1/whatsapp-webhook`,
                            events: ["MESSAGES_UPSERT"]
                        },
                        rejectCall: true,
                        groupsIgnore: true
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

            // Try to logout first to ensure we get a fresh QR if stuck
            try {
                await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
                    method: 'DELETE',
                    headers: { 'apikey': apiKey || '' }
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
                console.log('Pre-connect logout failed (normal if already logged out)');
            }

            const response = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
                headers: {
                    'apikey': apiKey!
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
                    await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
                        method: 'DELETE',
                        headers: { 'apikey': apiKey || '' }
                    });

                    // Wait a bit
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    // Retry connect
                    const retryRes = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
                        headers: { 'apikey': apiKey || '' }
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
        setLoading(true);
        try {
            await fetch(`${evolutionApiUrl}/instance/logout/${company.evolution_instance_name}`, {
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
            await fetch(`${evolutionApiUrl}/instance/delete/${company.evolution_instance_name}`, {
                method: 'DELETE',
                headers: {
                    'apikey': company.evolution_api_key
                }
            });

            // Wait for deletion to propagate
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 2. Update database to clear credentials (Hard Reset)
            const supabase = getSupabase();
            const { error: dbError } = await supabase!
                .from('company')
                .update({
                    evolution_instance_name: null,
                    evolution_api_key: null
                })
                .eq('id', company.id);

            if (dbError) throw dbError;

            // 3. Update local state
            setConnectionState('unknown');
            setQrCode(null);
            toast.success('Instancia reiniciada correctamente. El sistema ha vuelto al estado inicial.');

            // 4. Refresh state - this will now show the "Conectar" button since credentials are null
            fetchConnectionState();

        } catch (error) {
            console.error('Error resetting instance:', error);
            toast.error('Error al reiniciar la instancia. Por favor intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };



    // Bot Mode Toggle Logic
    const [botUnknownReply, setBotUnknownReply] = useState(true);
    const [botEnabled, setBotEnabled] = useState(true);

    useEffect(() => {
        if (company?.bot_unknown_reply_enabled !== undefined) {
            setBotUnknownReply(company.bot_unknown_reply_enabled);
        }
        if (company?.bot_enabled !== undefined) {
            setBotEnabled(company.bot_enabled);
        }
    }, [company]);

    const handleToggleBotGlobal = async () => {
        if (!company) return;
        const supabase = getSupabase();
        if (!supabase) return;

        const newValue = !botEnabled;
        setBotEnabled(newValue);

        try {
            const { error } = await supabase
                .from('company')
                .update({ bot_enabled: newValue })
                .eq('id', company.id);

            if (error) throw error;
            toast.success(`Chatbot ${newValue ? 'activado' : 'pausado'} correctamente.`);
        } catch (error) {
            console.error('Error updating global bot state:', error);
            setBotEnabled(!newValue);
            toast.error('Error al actualizar el estado del bot.');
        }
    };

    const handleToggleBotMode = async () => {
        if (!company) return;
        const supabase = getSupabase();
        if (!supabase) {
            toast.error('Error de conexión con la base de datos.');
            return;
        }

        const newValue = !botUnknownReply;
        setBotUnknownReply(newValue); // Optimistic update

        try {
            const { error } = await supabase
                .from('company')
                .update({ bot_unknown_reply_enabled: newValue })
                .eq('id', company.id);

            if (error) throw error;
            toast.success(`Modo ${newValue ? 'Bot (Respuesta)' : 'Humano (Silencioso)'} activado.`);
        } catch (error) {
            console.error('Error updating bot mode:', error);
            setBotUnknownReply(!newValue); // Revert
            toast.error('Error al actualizar la configuración del bot.');
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
                                    ) : !company?.evolution_instance_name ? (
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <AlertCircle className="w-4 h-4" /> No configurado
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
                            {connectedNumber && (
                                <p className="text-lg font-medium text-gray-700 mb-2">
                                    +{connectedNumber}
                                </p>
                            )}
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
                                        disabled={loading}
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



                {/* Bot Settings */}
                <div className="bg-white p-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Inteligencia Artificial</h3>

                    {/* Global Toggle */}
                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                        <div>
                            <p className="font-medium text-gray-900">Estado del Chatbot (IA)</p>
                            <p className="text-sm text-gray-500">
                                {botEnabled
                                    ? "El bot está activo y responderá consultas de los usuarios."
                                    : "El bot está pausado. No se generarán respuestas automáticas."}
                            </p>
                        </div>
                        <button
                            onClick={handleToggleBotGlobal}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${botEnabled ? 'bg-green-600' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${botEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Unknown Reply Toggle */}
                    <div className={`flex items-center justify-between transition-opacity ${!botEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div>
                            <p className="font-medium text-gray-900">Responder a Desconocidos</p>
                            <p className="text-sm text-gray-500">
                                {botUnknownReply
                                    ? "El bot responderá con un mensaje de error si el usuario no está registrado."
                                    : "El bot ignorará los mensajes de usuarios no registrados (Modo Humano)."}
                            </p>
                        </div>
                        <button
                            onClick={handleToggleBotMode}
                            disabled={!botEnabled}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${botUnknownReply ? 'bg-green-600' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${botUnknownReply ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Danger Zone - Only show if instance exists */}
                {company?.evolution_instance_name && (
                    <div className="bg-gray-50 p-6 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Zona de Peligro</h3>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Si tienes problemas con la conexión, puedes reiniciar la instancia. Esto eliminará la sesión actual.
                            </p>
                            <button
                                onClick={handleResetInstance}
                                disabled={loading}
                                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium whitespace-nowrap"
                            >
                                Reiniciar Instancia
                            </button>
                        </div>
                    </div>
                )}
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
        </div >
    );
}
