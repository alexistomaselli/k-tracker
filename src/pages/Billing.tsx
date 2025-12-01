import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, AlertTriangle, Building2, Copy } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';

import { getSupabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

export default function Billing() {
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('transfer');
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const navigate = useNavigate();
    const [company, setCompany] = useState<any>(null);

    useEffect(() => {
        loadBillingData();
    }, [user]);

    async function loadBillingData() {
        try {
            setLoading(true);
            const supabase = getSupabase();
            if (!supabase || !user) return;

            // Get user's company
            const { data: userCompany } = await supabase
                .from('user_company')
                .select('company_id, company:company_id(*)')
                .eq('user_id', user.id)
                .single();

            if (!userCompany) return;
            setCompany(userCompany.company);

            // Get Subscription
            const { data: sub } = await supabase
                .from('subscriptions')
                .select('*, plans(*)')
                .eq('company_id', userCompany.company_id)
                .single();

            setSubscription(sub);

            // Get Payments
            if (sub) {
                const { data: payHistory } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('subscription_id', sub.id)
                    .order('created_at', { ascending: false });
                setPayments(payHistory || []);
            }

            // Get Bank Accounts
            const { data: banks } = await supabase
                .from('bank_accounts')
                .select('*')
                .eq('active', true);
            setBankAccounts(banks || []);

        } catch (error) {
            console.error('Error loading billing:', error);
        } finally {
            setLoading(false);
        }
    }

    const openPaymentModal = () => {
        if (subscription?.plans?.price) {
            setPaymentAmount(subscription.plans.price.toString());
        }
        setShowPaymentModal(true);
    };

    const handleReportPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subscription || !paymentProof) {
            toast.error('Debes subir un comprobante');
            return;
        }

        try {
            setUploading(true);
            const supabase = getSupabase();

            // Upload proof
            const fileExt = paymentProof.name.split('.').pop();
            const fileName = `payment_${Date.now()}.${fileExt}`;
            const filePath = `${subscription.company_id}/${fileName}`;

            const { error: uploadError } = await supabase!.storage
                .from('payment-proofs')
                .upload(filePath, paymentProof);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase!.storage
                .from('payment-proofs')
                .getPublicUrl(filePath);

            // Create Payment Record
            const { error: dbError } = await supabase!
                .from('payments')
                .insert({
                    subscription_id: subscription.id,
                    amount: parseFloat(paymentAmount),
                    method: paymentMethod,
                    proof_url: publicUrl,
                    status: 'pending'
                });

            if (dbError) throw dbError;

            toast.success('Pago reportado correctamente. Esperando aprobación.');
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentProof(null);
            loadBillingData();

        } catch (error: any) {
            console.error('Error reporting payment:', error);
            toast.error('Error al reportar pago: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copiado al portapapeles');
    };

    if (loading) return <div className="p-8 text-center">Cargando información de facturación...</div>;

    const currentPlan = subscription?.plans;

    // Trial Logic
    const trialDays = company?.trial_days || 14;
    const createdAt = company?.created_at ? new Date(company.created_at) : new Date();
    const trialEndsAt = new Date(createdAt);
    trialEndsAt.setDate(createdAt.getDate() + trialDays);
    const now = new Date();
    const diffTime = trialEndsAt.getTime() - now.getTime();
    const remainingTrialDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isTrialActive = remainingTrialDays > 0;
    const isTrialExpired = !isTrialActive;

    // Display Logic
    const isSubscriptionActive = subscription?.status === 'active';
    const isSubscriptionPastDue = subscription?.status === 'past_due';

    let planName = 'Sin Plan Activo';
    let planPrice = 'Gratis';
    let statusBadge = <Badge variant="pending">Sin Estado</Badge>;
    let statusMessage = null;

    if (isSubscriptionActive) {
        planName = currentPlan?.name;
        planPrice = `${currentPlan?.currency === 'PEN' ? 'S/' : '$'}${currentPlan?.price}/${currentPlan?.billing_cycle === 'annual' ? 'año' : 'mes'}`;
        statusBadge = <Badge variant="completed">Activo</Badge>;
    } else if (isSubscriptionPastDue) {
        planName = currentPlan?.name;
        planPrice = `${currentPlan?.currency === 'PEN' ? 'S/' : '$'}${currentPlan?.price}/${currentPlan?.billing_cycle === 'annual' ? 'año' : 'mes'}`;
        statusBadge = <Badge variant="canceled">Vencido</Badge>;
        statusMessage = (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center gap-2 mt-2">
                <AlertTriangle className="w-4 h-4" />
                Tu suscripción está vencida. Por favor realiza el pago para continuar.
            </div>
        );
    } else {
        // No active subscription (Trial Mode)
        planName = 'Plan Trial';
        planPrice = 'Gratis';
        if (isTrialActive) {
            statusBadge = <Badge variant="pending">En Prueba</Badge>;
            statusMessage = (
                <div className="text-sm text-gray-600 mt-2">
                    Te quedan <span className="font-bold text-green-600">{remainingTrialDays} días</span> de prueba.
                </div>
            );
        } else {
            statusBadge = <Badge variant="canceled">Trial Vencido</Badge>;
            statusMessage = (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center gap-2 mt-2">
                    <AlertTriangle className="w-4 h-4" />
                    Tu periodo de prueba ha finalizado. Selecciona un plan para continuar.
                </div>
            );
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Facturación y Suscripción</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Current Plan Card */}
                <Card className="md:col-span-2">
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-700">Tu Plan Actual</h2>
                                <p className="text-3xl font-bold text-[#0A4D8C] mt-2">
                                    {planName}
                                </p>
                                <p className="text-gray-500 text-sm mt-1">
                                    {planPrice}
                                </p>
                            </div>
                            {statusBadge}
                        </div>

                        <div className="border-t border-gray-100 pt-4 mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Próximo Vencimiento:</span>
                                <span className="font-medium">
                                    {isSubscriptionActive || isSubscriptionPastDue
                                        ? (subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'N/A')
                                        : (trialEndsAt.toLocaleDateString())
                                    }
                                </span>
                            </div>
                            {statusMessage}
                        </div>

                        <div className="mt-6 flex gap-3">
                            {isSubscriptionPastDue && (
                                <Button onClick={openPaymentModal}>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Reportar Pago
                                </Button>
                            )}

                            {isSubscriptionActive && (
                                <>
                                    <Button variant="outline" onClick={openPaymentModal}>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Reportar Pago
                                    </Button>
                                    <Button variant="outline" onClick={() => navigate('/select-plan')}>Cambiar Plan</Button>
                                </>
                            )}

                            {!isSubscriptionActive && !isSubscriptionPastDue && (
                                // Trial Mode
                                <Button onClick={() => navigate('/select-plan')}>
                                    {isTrialExpired ? 'Seleccionar Plan' : 'Cambiar Plan'}
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Usage Stats (Mocked for now) */}
                <Card>
                    <div className="p-6">
                        <h3 className="font-semibold text-gray-700 mb-4">Uso del Plan</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Usuarios</span>
                                    <span className="font-medium">3 / {currentPlan?.limits?.users || 5}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Almacenamiento</span>
                                    <span className="font-medium">1.2 GB / {currentPlan?.limits?.storage_gb || 5} GB</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '24%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div >

            {/* Payment History */}
            < Card >
                <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Historial de Pagos</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 bg-gray-50 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Monto</th>
                                    <th className="px-4 py-3">Método</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3">Comprobante</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-4 text-center text-gray-500">No hay pagos registrados</td>
                                    </tr>
                                ) : (
                                    payments.map((pay) => (
                                        <tr key={pay.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-3">{new Date(pay.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 font-medium">{subscription?.plans?.currency === 'PEN' ? 'S/' : '$'}{pay.amount}</td>
                                            <td className="px-4 py-3 capitalize">{pay.method}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={pay.status === 'approved' ? 'completed' : pay.status === 'rejected' ? 'canceled' : 'pending'}>
                                                    {pay.status === 'approved' ? 'Aprobado' : pay.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                {pay.proof_url && (
                                                    <a href={pay.proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                        Ver
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card >

            {/* Report Payment Modal */}
            {
                showPaymentModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-lg font-bold mb-4">Reportar Pago Manual</h3>
                            <form onSubmit={handleReportPayment} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto Pagado</label>
                                    <input
                                        type="number"
                                        required
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="transfer">Transferencia Bancaria</option>
                                        <option value="cash">Efectivo</option>
                                        <option value="check">Cheque</option>
                                    </select>
                                </div>

                                {paymentMethod === 'transfer' && (
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <Building2 className="w-4 h-4" />
                                            Cuentas Bancarias Disponibles
                                        </h4>
                                        {bankAccounts.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic">No hay cuentas bancarias activas configuradas.</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {bankAccounts.map((bank) => (
                                                    <div key={bank.id} className="text-sm border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                                                        <p className="font-bold text-gray-800">{bank.bank_name}</p>
                                                        <p className="text-gray-600">Titular: {bank.holder_name}</p>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <span className="text-gray-500">CBU: {bank.cbu}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(bank.cbu)}
                                                                className="text-blue-600 hover:text-blue-800 p-1"
                                                                title="Copiar CBU"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                        {bank.alias && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-500">Alias: {bank.alias}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyToClipboard(bank.alias)}
                                                                    className="text-blue-600 hover:text-blue-800 p-1"
                                                                    title="Copiar Alias"
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante</label>
                                    <input
                                        type="file"
                                        required
                                        accept="image/*,.pdf"
                                        onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <Button variant="ghost" onClick={() => setShowPaymentModal(false)} type="button">Cancelar</Button>
                                    <Button variant="primary" type="submit" disabled={uploading}>
                                        {uploading ? 'Subiendo...' : 'Enviar Reporte'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
