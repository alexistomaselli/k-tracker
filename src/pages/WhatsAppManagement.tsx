import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from '../hooks/useData';
import { MessageSquare, Loader, ExternalLink, HelpCircle } from 'lucide-react';
import { getSupabase } from '../lib/supabase';

export default function WhatsAppManagement() {
    const { company, loading: loadingUser } = useCurrentUser();
    const [loading, setLoading] = useState(false);
    const [connectedNumber, setConnectedNumber] = useState<string | null>(null);
    const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'close' | 'offline' | 'unknown'>('unknown');

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

    const fetchBotNumber = useCallback(async () => {
        if (!company?.evolution_instance_name || !company?.evolution_api_key || !evolutionApiUrl) return;

        try {
            setLoading(true);

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
                    // 2. If open, fetch instance details to get the number
                    try {
                        const instanceResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances?instanceName=${company.evolution_instance_name}`, {
                            headers: {
                                'apikey': company.evolution_api_key
                            }
                        });

                        if (instanceResponse.ok) {
                            const instanceData = await instanceResponse.json();

                            let targetInstance: any = null;

                            // 1. Try to find in top-level array or object
                            const dataArray = Array.isArray(instanceData) ? instanceData : [instanceData];
                            targetInstance = dataArray.find((i: any) =>
                                i.name === company.evolution_instance_name ||
                                i.instance?.instanceName === company.evolution_instance_name
                            );

                            // 2. If not found, check for nested 'data' property
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
                }
            } else {
                setConnectionState('offline');
            }
        } catch (err) {
            console.error('Error checking status:', err);
            setConnectionState('unknown');
        } finally {
            setLoading(false);
        }
    }, [company, evolutionApiUrl]);

    useEffect(() => {
        if (company?.evolution_instance_name && evolutionApiUrl) {
            fetchBotNumber();
        }
    }, [company, evolutionApiUrl, fetchBotNumber]);

    if (loadingUser) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-8 h-8 text-green-600" />
                    Gestión por WhatsApp
                </h1>
                <p className="text-gray-500 mt-2">
                    Gestiona tus tareas asignadas y mantente al día enviando mensajes a nuestro bot.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-8 text-center">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader className="w-10 h-10 animate-spin text-green-600 mb-4" />
                            <p className="text-gray-600">Obteniendo información del bot...</p>
                        </div>
                    ) : connectionState === 'open' && connectedNumber ? (
                        <div className="py-8">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <MessageSquare className="w-10 h-10" />
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                ¡Listo para empezar!
                            </h2>

                            <p className="text-gray-600 max-w-lg mx-auto mb-8 text-lg">
                                Haz clic en el siguiente botón para abrir el chat con nuestro bot en WhatsApp.
                                Podrás consultar tus tareas pendientes, reportar avances y más.
                            </p>

                            <a
                                href={`https://wa.me/${connectedNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full font-bold text-lg transition-transform hover:scale-105 shadow-lg"
                            >
                                <MessageSquare className="w-6 h-6" />
                                Ir al Bot de WhatsApp
                                <ExternalLink className="w-5 h-5 opacity-70" />
                            </a>

                            <div className="mt-12 p-6 bg-gray-50 rounded-lg max-w-2xl mx-auto text-left">
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <HelpCircle className="w-5 h-5 text-blue-600" />
                                    ¿Qué puedo hacer?
                                </h3>
                                <ul className="space-y-2 text-gray-600 list-disc list-inside">
                                    <li>Ver mis tareas pendientes del día.</li>
                                    <li>Marcar tareas como completadas.</li>
                                    <li>Recibir recordatorios de vencimientos.</li>
                                    <li>Subir fotos como evidencia de tareas.</li>
                                </ul>
                            </div>

                            {/* Chat Preview / Simulation */}
                            <div className="mt-12">
                                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center justify-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-gray-400" />
                                    Así funciona
                                </h3>
                                <div className="max-w-md mx-auto bg-[#E5DDD5] rounded-xl overflow-hidden shadow-lg border border-gray-200">
                                    {/* Chat Header */}
                                    <div className="bg-[#075E54] p-3 flex items-center gap-3 text-white">
                                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                            <MessageSquare className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">K-Tracker Bot</p>
                                            <p className="text-xs opacity-80">Empresa</p>
                                        </div>
                                    </div>

                                    {/* Chat Messages */}
                                    <div className="p-4 space-y-4 text-left text-sm h-[400px] overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d986a26d40.png')]">

                                        {/* User Message */}
                                        <div className="flex justify-end">
                                            <div className="bg-[#DCF8C6] p-2 px-3 rounded-lg rounded-tr-none shadow-sm max-w-[85%] relative">
                                                <p className="text-gray-900">Mis tareas pendientes</p>
                                                <span className="text-[10px] text-gray-500 block text-right mt-1">20:04</span>
                                            </div>
                                        </div>

                                        {/* Bot Message */}
                                        <div className="flex justify-start">
                                            <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[95%] relative text-sm leading-relaxed text-gray-900">
                                                <p className="font-bold text-[#075E54] text-xs mb-1">K-tracker</p>
                                                <p className="mb-2">Aquí tienes tus tareas pendientes:</p>

                                                <div className="space-y-3">
                                                    <div>
                                                        <p>1. <strong>*Solicitar pedido de hormigón*</strong> - Proyecto: Edificio Av. Libertador</p>
                                                        <p className="text-gray-700 ml-3">- Estado: Pendiente</p>
                                                        <p className="text-gray-700 ml-3">- Prioridad: Alta</p>
                                                        <p className="text-gray-700 ml-3">- Due Date: 🚨2025-12-04</p>
                                                    </div>

                                                    <div>
                                                        <p>2. <strong>*Revisar planos de detalle escalera*</strong> - Proyecto: Remodelación Oficinas</p>
                                                        <p className="text-gray-700 ml-3">- Estado: Pendiente</p>
                                                        <p className="text-gray-700 ml-3">- Prioridad: Alta</p>
                                                        <p className="text-gray-700 ml-3">- Due Date: 2025-12-05</p>
                                                    </div>

                                                    <div>
                                                        <p>3. <strong>*Coordinar ingreso de personal*</strong> - Proyecto: Edificio Av. Libertador</p>
                                                        <p className="text-gray-700 ml-3">- Estado: Pendiente</p>
                                                        <p className="text-gray-700 ml-3">- Prioridad: Media</p>
                                                        <p className="text-gray-700 ml-3">- Due Date: 2025-12-19</p>
                                                    </div>

                                                    <div>
                                                        <p>4. <strong>*Presupuestar alquiler de andamios*</strong> - Proyecto: Remodelación Oficinas</p>
                                                        <p className="text-gray-700 ml-3">- Estado: Pendiente</p>
                                                        <p className="text-gray-700 ml-3">- Prioridad: Media</p>
                                                        <p className="text-gray-700 ml-3">- Due Date: 2026-01-02</p>
                                                    </div>

                                                    <div>
                                                        <p>5. <strong>*Enviar reporte de seguridad*</strong> - Proyecto: Edificio Av. Libertador</p>
                                                        <p className="text-gray-700 ml-3">- Estado: Pendiente</p>
                                                        <p className="text-gray-700 ml-3">- Prioridad: Baja</p>
                                                        <p className="text-gray-700 ml-3">- Due Date: 2025-12-12</p>
                                                    </div>
                                                </div>

                                                <p className="mt-3 text-gray-600 italic text-xs">
                                                    Si necesitas actualizar el estado de alguna tarea o agregar un comentario, avísame.
                                                </p>
                                                <span className="text-[10px] text-gray-400 block text-right mt-1">20:05</span>
                                            </div>
                                        </div>

                                        {/* User Message - Add Comment */}
                                        <div className="flex justify-end mt-4">
                                            <div className="bg-[#DCF8C6] p-2 px-3 rounded-lg rounded-tr-none shadow-sm max-w-[85%] relative">
                                                <p className="text-gray-900">Agrega un comentario en la tarea solicitar materiales a proveedor: el proveedor está de vacaciones</p>
                                                <span className="text-[10px] text-gray-500 block text-right mt-1">20:06</span>
                                            </div>
                                        </div>

                                        {/* Bot Message - Confirmation */}
                                        <div className="flex justify-start">
                                            <div className="bg-white p-2 px-3 rounded-lg rounded-tl-none shadow-sm max-w-[95%] relative">
                                                <p className="text-gray-900">Listo, comentario agregado a la tarea "solicitar materiales a proveedor".</p>
                                                <span className="text-[10px] text-gray-500 block text-right mt-1">20:06</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-12">
                            <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <MessageSquare className="w-10 h-10" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                Servicio no disponible
                            </h2>
                            <p className="text-gray-500 max-w-md mx-auto">
                                En este momento el servicio de WhatsApp de la empresa no está conectado o disponible.
                                Por favor contacta al administrador.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
