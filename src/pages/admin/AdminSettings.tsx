import { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../context/ToastContext';

export default function AdminSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [trialDays, setTrialDays] = useState('14');
    const [evolutionApiKey, setEvolutionApiKey] = useState('');
    const [evolutionApiUrl, setEvolutionApiUrl] = useState('');
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [requireApproval, setRequireApproval] = useState('true');
    const toast = useToast();

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            setLoading(true);
            const supabase = getSupabase();
            const { data, error } = await supabase!
                .from('platform_settings')
                .select('key, value');

            if (error) throw error;

            if (data) {
                const trialSetting = data.find(s => s.key === 'default_trial_days');
                const apiSetting = data.find(s => s.key === 'evolution_global_api_key');
                const apiUrlSetting = data.find(s => s.key === 'evolution_api_url');
                const openaiSetting = data.find(s => s.key === 'openai_api_key');
                const approvalSetting = data.find(s => s.key === 'require_manual_approval');

                if (trialSetting) setTrialDays(trialSetting.value);
                if (apiSetting) setEvolutionApiKey(apiSetting.value);
                if (apiUrlSetting) setEvolutionApiUrl(apiUrlSetting.value);
                if (openaiSetting) setOpenaiApiKey(openaiSetting.value);
                if (approvalSetting) setRequireApproval(approvalSetting.value);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Error al cargar la configuración');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        try {
            setSaving(true);
            const supabase = getSupabase();

            // Save Trial Days
            const { error: trialError } = await supabase!
                .from('platform_settings')
                .upsert({
                    key: 'default_trial_days',
                    value: trialDays,
                    description: 'Días de prueba por defecto'
                });

            if (trialError) throw trialError;

            // Save Approval Requirement
            const { error: approvalError } = await supabase!
                .from('platform_settings')
                .upsert({
                    key: 'require_manual_approval',
                    value: requireApproval,
                    description: 'Requerir aprobación manual de nuevas empresas'
                });

            if (approvalError) throw approvalError;

            // Save Evolution API Key
            if (evolutionApiKey) {
                const { error: apiError } = await supabase!
                    .from('platform_settings')
                    .upsert({
                        key: 'evolution_global_api_key',
                        value: evolutionApiKey,
                        description: 'Global API Key for Evolution API'
                    });

                if (apiError) throw apiError;
            }

            // Save Evolution API URL
            if (evolutionApiUrl) {
                const { error: apiUrlError } = await supabase!
                    .from('platform_settings')
                    .upsert({
                        key: 'evolution_api_url',
                        value: evolutionApiUrl,
                        description: 'Global URL for Evolution API'
                    });

                if (apiUrlError) throw apiUrlError;
            }

            // Save OpenAI API Key
            if (openaiApiKey) {
                const { error: openaiError } = await supabase!
                    .from('platform_settings')
                    .upsert({
                        key: 'openai_api_key',
                        value: openaiApiKey,
                        description: 'API Key for OpenAI (GPT-4o)'
                    });

                if (openaiError) throw openaiError;
            }

            toast.success('Configuración guardada correctamente');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
                    <p className="text-gray-500">Ajustes globales de la plataforma.</p>
                </div>
            </div>

            <div className="max-w-2xl">
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <Settings className="w-6 h-6" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Configuración General</h2>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Registro de Empresas</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Días de Trial por Defecto"
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={trialDays}
                                        onChange={(e) => setTrialDays(e.target.value)}
                                        required
                                        placeholder="14"
                                        helperText="Cantidad de días de prueba que recibirán las nuevas empresas al registrarse."
                                    />

                                    <div className="flex flex-col gap-1.5">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Requerir Aprobación Manual
                                        </label>
                                        <select
                                            value={requireApproval}
                                            onChange={(e) => setRequireApproval(e.target.value)}
                                            className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                        >
                                            <option value="true">Sí (Cuenta en Revisión)</option>
                                            <option value="false">No (Aprobación Automática)</option>
                                        </select>
                                        <p className="text-xs text-gray-500">
                                            Si es "No", las empresas podrán acceder inmediatamente tras confirmar su correo.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Integraciones (WhatsApp)</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <Input
                                        label="Evolution API URL"
                                        type="url"
                                        value={evolutionApiUrl}
                                        onChange={(e) => setEvolutionApiUrl(e.target.value)}
                                        placeholder="https://evoapi.yourdomain.com"
                                        helperText="URL base de la instancia global de Evolution API."
                                    />
                                    <Input
                                        label="Global Evolution API Key"
                                        type="password"
                                        value={evolutionApiKey}
                                        onChange={(e) => setEvolutionApiKey(e.target.value)}
                                        placeholder="sk_..."
                                        helperText="Esta clave maestra permite crear nuevas instancias automáticamente cuando una empresa conecta su WhatsApp."
                                    />
                                    <Input
                                        label="OpenAI API Key (Bot)"
                                        type="password"
                                        value={openaiApiKey}
                                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                                        placeholder="sk-..."
                                        helperText="Clave utilizada por el bot de WhatsApp para generar respuestas."
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={saving}
                                    className="flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    );
}
