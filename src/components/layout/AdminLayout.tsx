import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCurrentUser } from '../../hooks/useData';
import { LayoutDashboard, Building2, CreditCard, LogOut, Landmark, Package } from 'lucide-react';

export default function AdminLayout() {
    const { user, signOut } = useAuth();
    const { isPlatformAdmin, loading } = useCurrentUser();

    if (loading) return <div className="p-8 text-center">Cargando...</div>;
    if (!user) return <Navigate to="/login" replace />;

    // Enforce Platform Admin Role
    if (!isPlatformAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0f172a] text-white hidden md:flex flex-col">
                <div className="p-6 border-b border-gray-700">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-blue-400" />
                        KAI PRO Admin
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link to="/admin" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </Link>
                    <Link to="/admin/companies" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
                        <Building2 className="w-5 h-5" />
                        Empresas
                    </Link>
                    <Link to="/admin/plans" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
                        <Package className="w-5 h-5" />
                        Planes
                    </Link>
                    <Link to="/admin/payments" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
                        <CreditCard className="w-5 h-5" />
                        Pagos
                    </Link>
                    <Link to="/admin/bank-accounts" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
                        <Building2 className="w-5 h-5" />
                        Cuentas Bancarias
                    </Link>
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                            A
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">Admin User</p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-2 px-4 py-2 mt-2 text-sm text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
