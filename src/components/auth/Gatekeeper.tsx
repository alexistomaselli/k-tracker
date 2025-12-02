import { useEffect, useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useCurrentUser } from '../../hooks/useData';
import { getSupabase } from '../../lib/supabase';
import PendingApproval from '../../pages/PendingApproval';

export default function Gatekeeper({ children }: { children: React.ReactNode }) {
    const { company: initialCompany, loading, approvalStatus, isPlatformAdmin } = useCurrentUser();
    const [hasActivePlan, setHasActivePlan] = useState(false);
    const [isInTrial, setIsInTrial] = useState(true); // Default to true until checked
    const [checkingAccess, setCheckingAccess] = useState(true);
    const location = useLocation();

    useEffect(() => {
        async function checkAccess() {
            if (!initialCompany) {
                setCheckingAccess(false);
                return;
            }

            const supabase = getSupabase();

            // 1. Fetch fresh company data (for trial status)
            const { data: companyData } = await supabase!
                .from('company')
                .select('created_at, trial_days')
                .eq('id', initialCompany.id)
                .single();

            // 2. Fetch subscription status
            const { data: subData } = await supabase!
                .from('subscriptions')
                .select('status')
                .eq('company_id', initialCompany.id)
                .eq('status', 'active')
                .maybeSingle();

            // 3. Calculate Trial Status
            let trialActive = false;
            if (companyData) {
                const trialDays = companyData.trial_days || 14;
                const createdAt = new Date(companyData.created_at);
                const trialEnd = new Date(createdAt.getTime() + (trialDays * 24 * 60 * 60 * 1000));
                trialActive = new Date() < trialEnd;
            }

            // Update State
            setIsInTrial(trialActive);
            setHasActivePlan(!!subData);
            setCheckingAccess(false);
        }

        if (!loading) {
            checkAccess();
        }
    }, [initialCompany, loading, location.pathname]); // Re-check on navigation

    if (loading || checkingAccess) {
        return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
    }

    // Platform Admins bypass everything
    if (isPlatformAdmin) {
        return <>{children}</>;
    }

    // 1. Check Approval Status
    if (approvalStatus === 'pending') {
        return <PendingApproval />;
    }

    if (approvalStatus === 'rejected') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Cuenta Rechazada</h1>
                    <p className="text-gray-700">
                        Lo sentimos, tu solicitud de registro ha sido rechazada.
                        Por favor contacta a soporte para más información.
                    </p>
                </div>
            </div>
        );
    }

    // 2. Check Trial & Plan
    // If NOT in trial AND NO active plan -> Locked
    if (!isInTrial && !hasActivePlan) {
        const allowedRoutes = ['/billing', '/my-account', '/select-plan'];

        // Allow access to specific routes
        if (allowedRoutes.includes(location.pathname)) {
            return <>{children}</>;
        }

        // Redirect to select plan for any other route
        return <Navigate to="/select-plan" replace />;
    }

    // Access Granted
    return <>{children}</>;
}
