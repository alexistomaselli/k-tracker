import { useState, useEffect } from 'react';
import { Check, Building2, Copy, LogOut, Clock } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { useCurrentUser } from '../hooks/useData';

export default function SelectPlan() {
    const { signOut } = useAuth();
    const { company, isInTrial } = useCurrentUser();
    const toast = useToast();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('transfer');
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<any>(null);

    useEffect(() => {
        async function loadAll() {
            if (!company) return;

            setLoading(true);
            try {
                await Promise.all([
                    fetchPlans(),
                    fetchBankAccounts(),
                    checkPendingPayment()
                ]);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadAll();
    }, [company]);

    async function checkPendingPayment() {
        if (!company) return;
        const supabase = getSupabase();

        // Find subscription
        const { data: sub } = await supabase!
            .from('subscriptions')
            .select('id')
            .eq('company_id', company.id)
            .maybeSingle();

        if (sub) {
            const { data: payment } = await supabase!
                .from('payments')
                .select('*')
                .eq('subscription_id', sub.id)
                .eq('status', 'pending')
                .maybeSingle();

            setPendingPayment(payment);
        }
    }

    async function fetchPlans() {
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase!
                .from('plans')
                .select('*')
                .eq('active', true)
                .order('price', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error) {
            console.error('Error fetching plans:', error);
        }
    }

    async function fetchBankAccounts() {
        const supabase = getSupabase();
        const { data } = await supabase!
            .from('bank_accounts')
            .select('*')
            .eq('active', true);
        setBankAccounts(data || []);
    }

    const handleSelectPlan = (plan: any) => {
        setSelectedPlan(plan);
        setPaymentAmount(plan.price.toString());
        setShowPaymentModal(true);
    };

    const handleReportPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlan || !paymentProof || !company) {
            toast.error('Faltan datos requeridos');
            return;
        }

        try {
            setUploading(true);
            const supabase = getSupabase();

            // 1. Create/Update Subscription
            // Check if exists
            const { data: existingSub } = await supabase!
                .from('subscriptions')
                .select('id')
                .eq('company_id', company.id)
                .maybeSingle();

            let subscriptionId = existingSub?.id;

            if (existingSub) {
                await supabase!
                    .from('subscriptions')
                    .update({
                        plan_id: selectedPlan.id,
                        status: 'past_due', // Still past_due until approved
                    })
                    .eq('id', existingSub.id);
            } else {
                const { data: newSub, error: subError } = await supabase!
                    .from('subscriptions')
                    .insert({
                        company_id: company.id,
                        plan_id: selectedPlan.id,
                        status: 'past_due',
                        start_date: new Date().toISOString(),
                        end_date: new Date().toISOString() // Expired until paid
                    })
                    .select()
                    .single();

                if (subError) throw subError;
                subscriptionId = newSub.id;
            }

            // 2. Upload proof
            const fileExt = paymentProof.name.split('.').pop();
            const fileName = `payment_${Date.now()}.${fileExt}`;
            const filePath = `${company.id}/${fileName}`;

            const { error: uploadError } = await supabase!.storage
                .from('payment-proofs')
                .upload(filePath, paymentProof);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase!.storage
                .from('payment-proofs')
                .getPublicUrl(filePath);

            // 3. Create Payment Record
            const { error: dbError } = await supabase!
                .from('payments')
                .insert({
                    subscription_id: subscriptionId,
                    amount: parseFloat(paymentAmount),
                    method: paymentMethod,
                    proof_url: publicUrl,
                    status: 'pending'
                });

            if (dbError) throw dbError;

            // 4. Send Email Notification to Admin
            try {
                await supabase!.functions.invoke('send-email', {
                    body: {
                        to: 'dydsoftware1@gmail.com', // Updated admin email
                        subject: `Nuevo Pago Reportado: ${company.name}`,
                        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo Pago Reportado</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background-color: #0A4D8C; padding: 20px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .info-box { background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0; border: 1px solid #e9ecef; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
    .info-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .label { font-weight: 600; color: #666; }
    .value { font-weight: bold; color: #333; text-align: right; }
    .button { display: inline-block; background-color: #0A4D8C; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; margin: 20px 0; text-align: center; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>K-Tracker</h1>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; color: #0A4D8C;">Nuevo Pago Reportado</h2>
      <p>La empresa <strong>${company.name}</strong> ha reportado un nuevo pago.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="label">Plan</span>
          <span class="value">${selectedPlan.name}</span>
        </div>
        <div class="info-row">
          <span class="label">Monto</span>
          <span class="value">${selectedPlan.currency === 'PEN' ? 'S/' : '$'} ${paymentAmount}</span>
        </div>
        <div class="info-row">
          <span class="label">Método</span>
          <span class="value">${paymentMethod === 'transfer' ? 'Transferencia' : paymentMethod}</span>
        </div>
        <div class="info-row">
          <span class="label">Fecha</span>
          <span class="value">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="${publicUrl}" class="button" target="_blank">Ver Comprobante de Pago</a>
      </div>

      <p style="font-size: 14px; color: #666; margin-top: 20px;">
        Por favor ingresa al panel administrativo de K-Tracker para aprobar o rechazar este pago y activar la suscripción del cliente.
      </p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} K-Tracker. Notificación automática del sistema.</p>
    </div>
  </div>
</body>
</html>
                        `
                    }
                });
            } catch (emailError) {
                console.error('Error sending email notification:', emailError);
                // Don't block the flow if email fails
            }

            toast.success('Pago reportado. Tu cuenta se activará cuando sea aprobado.');
            setShowPaymentModal(false);

            // Optional: Redirect to a "Payment Pending" view or reload
            window.location.reload();

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

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Elige tu Plan
                    </h1>
                    <p className="mt-4 text-xl text-gray-500">
                        {isInTrial
                            ? 'Mejora tu experiencia suscribiéndote a uno de nuestros planes.'
                            : 'Tu periodo de prueba ha finalizado. Suscríbete para continuar usando K-Tracker.'}
                    </p>
                    <div className="mt-4 flex justify-center gap-4">
                        {isInTrial ? (
                            <Button variant="outline" onClick={() => window.history.back()}>
                                Volver
                            </Button>
                        ) : (
                            <Button variant="ghost" onClick={signOut}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Cerrar Sesión
                            </Button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : pendingPayment ? (
                    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Clock className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Pago en Revisión</h2>
                        <p className="text-gray-600 mb-6">
                            Hemos recibido tu reporte de pago por <strong>{pendingPayment.currency === 'USD' ? '$' : 'S/'} {pendingPayment.amount}</strong>.
                            Nuestro equipo administrativo está verificando la transacción.
                        </p>
                        <div className="bg-yellow-50 border border-yellow-100 rounded-md p-4 text-sm text-yellow-800 mb-6">
                            Este proceso suele tomar menos de 24 horas. Te notificaremos por correo electrónico cuando tu plan esté activo.
                        </div>
                        <div className="flex justify-center gap-4">
                            <Button variant="outline" onClick={() => window.location.reload()}>
                                Actualizar Estado
                            </Button>
                            <Button variant="ghost" onClick={signOut}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Cerrar Sesión
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                        {plans.map((plan) => (
                            <Card key={plan.id} className={`relative flex flex-col ${selectedPlan?.id === plan.id ? 'ring-2 ring-blue-500' : ''}`}>
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                                    <p className="mt-4 flex items-baseline text-gray-900">
                                        <span className="text-4xl font-extrabold tracking-tight">{plan.currency === 'PEN' ? 'S/' : '$'}{plan.price}</span>
                                        <span className="ml-1 text-xl font-semibold text-gray-500">/mes</span>
                                    </p>
                                    <p className="mt-6 text-gray-500">{plan.description}</p>

                                    <ul role="list" className="mt-6 space-y-4 flex-1">
                                        {plan.features?.map((feature: string, index: number) => (
                                            <li key={index} className="flex">
                                                <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
                                                <span className="ml-3 text-gray-500">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="p-6 bg-gray-50 rounded-b-lg">
                                    <Button
                                        className="w-full"
                                        onClick={() => handleSelectPlan(plan)}
                                        variant="primary"
                                    >
                                        Seleccionar {plan.name}
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedPlan && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4">Reportar Pago - {selectedPlan.name}</h3>
                        <form onSubmit={handleReportPayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto a Pagar</label>
                                <div className="text-2xl font-bold text-blue-600 mb-2">
                                    {selectedPlan.currency === 'PEN' ? 'S/' : '$'}{selectedPlan.price}
                                </div>
                                <input
                                    type="hidden"
                                    value={paymentAmount}
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    Cuentas Bancarias
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
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante de Pago</label>
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
                                    {uploading ? 'Subiendo...' : 'Confirmar Pago'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
