import { useState, useEffect, useRef } from 'react';
import { Search, Clock, MoreVertical, ShieldCheck, Ban } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';

export default function AdminCompanies() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingTrial, setEditingTrial] = useState<any>(null);
    const [trialDaysInput, setTrialDaysInput] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const toast = useToast();

    useEffect(() => {
        fetchCompanies();
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    async function fetchCompanies() {
        try {
            setLoading(true);
            const supabase = getSupabase();

            // Fetch companies with their active subscription
            const { data, error } = await supabase!
                .from('company')
                .select(`
          *,
          subscriptions (
            status,
            plans (
              name
            )
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCompanies(data || []);
        } catch (error) {
            console.error('Error fetching companies:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleUpdateStatus = async (companyId: string, status: 'approved' | 'rejected') => {
        try {
            const supabase = getSupabase();
            const { error } = await supabase!
                .from('company')
                .update({ approval_status: status })
                .eq('id', companyId);

            if (error) throw error;
            toast.success(`Empresa ${status === 'approved' ? 'aprobada' : 'rechazada'} correctamente`);
            setOpenMenuId(null);
            fetchCompanies();
        } catch (error: any) {
            toast.error('Error al actualizar estado: ' + error.message);
        }
    };

    const handleUpdateTrialDays = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTrial) return;

        try {
            const supabase = getSupabase();
            const { error } = await supabase!
                .from('company')
                .update({ trial_days: parseInt(trialDaysInput) })
                .eq('id', editingTrial.id);

            if (error) throw error;
            toast.success('Días de prueba actualizados');
            setEditingTrial(null);
            setOpenMenuId(null);
            fetchCompanies();
        } catch (error: any) {
            toast.error('Error al actualizar días: ' + error.message);
        }
    };

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
                    <p className="text-gray-500">Gestión de empresas registradas, aprobaciones y planes.</p>
                </div>
            </div>

            <Card>
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar empresa..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-500 bg-gray-50 uppercase">
                            <tr>
                                <th className="px-6 py-3">Empresa</th>
                                <th className="px-6 py-3">Estado Aprobación</th>
                                <th className="px-6 py-3">Plan / Trial</th>
                                <th className="px-6 py-3">Fecha Registro</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Cargando empresas...
                                    </td>
                                </tr>
                            ) : filteredCompanies.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron empresas.
                                    </td>
                                </tr>
                            ) : (
                                filteredCompanies.map((company) => {
                                    const subscription = company.subscriptions?.[0];
                                    const planName = subscription?.plans?.name || 'Plan Trial';
                                    const approvalStatus = company.approval_status || 'pending';
                                    const trialDaysTotal = company.trial_days || 14;

                                    // Calculate remaining trial days
                                    const createdAt = new Date(company.created_at);
                                    const trialEndsAt = new Date(createdAt);
                                    trialEndsAt.setDate(createdAt.getDate() + trialDaysTotal);
                                    const now = new Date();
                                    const diffTime = trialEndsAt.getTime() - now.getTime();
                                    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    const displayDays = remainingDays > 0 ? remainingDays : 0;

                                    const isMenuOpen = openMenuId === company.id;

                                    return (
                                        <tr key={company.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                                        {company.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{company.name}</div>
                                                        <div className="text-xs text-gray-500">{company.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={approvalStatus === 'approved' ? 'active' : approvalStatus === 'rejected' ? 'overdue' : 'pending'}>
                                                    {approvalStatus === 'approved' ? 'Aprobado' : approvalStatus === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-gray-700">{planName}</span>
                                                    <span className={`text-xs ${displayDays > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {displayDays > 0 ? `Quedan ${displayDays} días` : 'Trial vencido'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {new Date(company.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(isMenuOpen ? null : company.id);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>

                                                {isMenuOpen && (
                                                    <div
                                                        ref={menuRef}
                                                        className="absolute right-8 top-8 w-56 bg-white rounded-lg shadow-lg border border-gray-100 z-50 overflow-hidden"
                                                    >
                                                        <div className="py-1">
                                                            {approvalStatus === 'pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(company.id, 'approved')}
                                                                        className="w-full px-4 py-2 text-left text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                                                                    >
                                                                        <ShieldCheck className="w-4 h-4" />
                                                                        Aprobar Acceso
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(company.id, 'rejected')}
                                                                        className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                                                                    >
                                                                        <Ban className="w-4 h-4" />
                                                                        Rechazar Acceso
                                                                    </button>
                                                                    <div className="border-t border-gray-100 my-1"></div>
                                                                </>
                                                            )}

                                                            <button
                                                                onClick={() => {
                                                                    setEditingTrial(company);
                                                                    setTrialDaysInput(company.trial_days?.toString() || '14');
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                <Clock className="w-4 h-4" />
                                                                Editar Días de Prueba
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Edit Trial Modal */}
            {editingTrial && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold mb-4">Editar Días de Prueba</h3>
                        <p className="text-sm text-gray-500 mb-4">Empresa: {editingTrial.name}</p>
                        <form onSubmit={handleUpdateTrialDays}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Días de Trial</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={trialDaysInput}
                                    onChange={(e) => setTrialDaysInput(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setEditingTrial(null)} type="button">Cancelar</Button>
                                <Button variant="primary" type="submit">Guardar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
