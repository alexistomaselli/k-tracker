import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCurrentUser } from '../../hooks/useData';

export function RequireAuth({ children }: { children: ReactNode }) {
    const { loading, isAuthenticated, verified, requireEmailVerified } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (requireEmailVerified && !verified) return <Navigate to="/login?verifyEmail=true" replace />;
    return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
    const { isAdmin, loading } = useCurrentUser();

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>;

    if (!isAdmin) {
        // Redirect participants to their dashboard/tasks view if they try to access admin routes
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
