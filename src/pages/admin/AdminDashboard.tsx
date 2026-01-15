import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, FolderOpen, DollarSign, TrendingUp } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

interface DashboardStats {
    totalCompanies: number;
    totalProjects: number;
    totalRevenue: number;
    activeCompanies: number;
}

interface RecentPayment {
    id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    company_name: string;
    plan_name: string;
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats>({
        totalCompanies: 0,
        totalProjects: 0,
        totalRevenue: 0,
        activeCompanies: 0
    });
    const [recentCompanies, setRecentCompanies] = useState<{ id: string; name: string; created_at: string; approval_status: string }[]>([]);
    const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                setLoading(true);
                const supabase = getSupabase();
                if (!supabase) return;

                // 1. Fetch Stats via RPC (Secure & Fast)
                const { data: statsData, error: statsError } = await supabase
                    .rpc('get_admin_stats');

                if (statsError) {
                    console.error('Error fetching stats via RPC:', statsError);
                } else if (statsData) {
                    setStats({
                        totalCompanies: statsData.totalCompanies,
                        totalProjects: statsData.totalProjects,
                        totalRevenue: statsData.totalRevenue,
                        activeCompanies: statsData.activeCompanies
                    });
                }

                // 2. Fetch Recent Companies
                const { data: companiesData } = await supabase
                    .from('company')
                    .select('id, name, created_at, approval_status')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (companiesData) {
                    setRecentCompanies(companiesData);
                }

                // 3. Fetch Recent Payments
                const { data: recentPaymentsData } = await supabase
                    .from('payments')
                    .select(`
            id,
            amount,
            status,
            created_at,
            subscriptions (
              company:company_id (name),
              plans (name)
            )
          `)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (recentPaymentsData) {
                    const formattedPayments: RecentPayment[] = recentPaymentsData.map((p: any) => ({
                        id: p.id,
                        amount: p.amount,
                        status: p.status,
                        created_at: p.created_at,
                        company_name: p.subscriptions?.company?.name || 'Desconocida',
                        plan_name: p.subscriptions?.plans?.name || '-'
                    }));
                    setRecentPayments(formattedPayments);
                }

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardData();
    }, []);

    const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
        <Card className="p-6 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-full ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </Card>
    );

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'approved': return 'completed';
            case 'pending': return 'pending';
            default: return 'canceled';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved': return 'Aprobado';
            case 'pending': return 'Pendiente';
            default: return 'Rechazado';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard General</h1>
                    <p className="text-gray-500">Resumen de actividad de la plataforma KAI PRO.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Empresas Registradas"
                    value={loading ? '...' : stats.totalCompanies}
                    icon={Building2}
                    color="bg-blue-600"
                    subtext={`${stats.activeCompanies} activas`}
                />
                <StatCard
                    title="Proyectos Totales"
                    value={loading ? '...' : stats.totalProjects}
                    icon={FolderOpen}
                    color="bg-indigo-600"
                />
                <StatCard
                    title="Ingresos Totales"
                    value={loading ? '...' : `$${stats.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="bg-green-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Companies */}
                <Card className="h-full">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Últimas Empresas</h3>
                        <Building2 className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Nombre</th>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Estado Aprobación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={3} className="p-4 text-center text-gray-500">Cargando...</td></tr>
                                ) : recentCompanies.length === 0 ? (
                                    <tr><td colSpan={3} className="p-4 text-center text-gray-500">No hay empresas recientes</td></tr>
                                ) : (
                                    recentCompanies.map((company) => (
                                        <tr key={company.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[150px]">{company.name}</td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">
                                                {new Date(company.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={getStatusVariant(company.approval_status)}>
                                                    {getStatusLabel(company.approval_status)}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Recent Payments */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">Últimos Pagos</h3>
                            <TrendingUp className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Empresa</th>
                                        <th className="px-4 py-3">Plan</th>
                                        <th className="px-4 py-3">Monto</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={5} className="p-4 text-center text-gray-500">Cargando...</td></tr>
                                    ) : recentPayments.length === 0 ? (
                                        <tr><td colSpan={5} className="p-4 text-center text-gray-500">No hay pagos recientes</td></tr>
                                    ) : (
                                        recentPayments.map((payment) => (
                                            <tr key={payment.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{payment.company_name}</td>
                                                <td className="px-4 py-3 text-gray-500">{payment.plan_name}</td>
                                                <td className="px-4 py-3 font-medium">${payment.amount}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={payment.status === 'approved' ? 'completed' : payment.status === 'rejected' ? 'canceled' : 'pending'}>
                                                        {payment.status === 'approved' ? 'Aprobado' : payment.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-gray-400 text-xs">
                                                    {new Date(payment.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                    <Card className="h-full p-6 bg-gradient-to-br from-blue-900 to-slate-900 text-white">
                        <h3 className="text-lg font-bold mb-4">Acciones Rápidas</h3>
                        <div className="space-y-3">
                            <p className="text-sm text-blue-200 mb-4">
                                Accesos directos para la gestión de la plataforma.
                            </p>

                            <button
                                onClick={() => navigate('/admin/companies')}
                                className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-left text-sm transition-colors flex items-center gap-2"
                            >
                                <Building2 className="w-4 h-4" />
                                Gestionar Empresas
                            </button>

                            <button
                                onClick={() => navigate('/admin/payments')}
                                className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-left text-sm transition-colors flex items-center gap-2"
                            >
                                <DollarSign className="w-4 h-4" />
                                Gestionar Pagos
                            </button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
