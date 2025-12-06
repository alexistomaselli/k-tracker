import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';

interface Payment {
    id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    proof_url?: string;
    subscriptions: {
        id: string;
        company_id: string;
        plan_id: string;
        company: {
            name: string;
        };
        plans: {
            id: string;
            name: string;
            billing_cycle: string;
            price: number;
            currency: string;
        };
    };
}

import { useSearchParams } from 'react-router-dom';

export default function AdminPayments() {
    const [searchParams] = useSearchParams();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const toast = useToast();

    useEffect(() => {
        const statusParam = searchParams.get('status');
        if (statusParam === 'pending' || statusParam === 'approved' || statusParam === 'rejected') {
            setFilterStatus(statusParam);
        }
        fetchPayments();
    }, [searchParams]);

    async function fetchPayments() {
        try {
            setLoading(true);
            const supabase = getSupabase();

            const { data, error } = await supabase!
                .from('payments')
                .select(`
          *,
          subscriptions (
            company:company_id (
              name
            ),
            plans (
              name
            )
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayments(data || []);
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleUpdateStatus = async (paymentId: string, newStatus: 'approved' | 'rejected') => {
        if (processingId) return; // Prevent double clicks
        setProcessingId(paymentId);
        try {
            const supabase = getSupabase();

            // 1. Fetch payment details with related data
            const { data: payment, error: fetchError } = await supabase!
                .from('payments')
                .select(`
                    *,
                    subscriptions (
                        id,
                        company_id,
                        plan_id,
                        plans (
                            id,
                            name,
                            billing_cycle,
                            price,
                            currency
                        ),
                        company:company_id (
                            name
                        )
                    )
                `)
                .eq('id', paymentId)
                .single();

            if (fetchError || !payment) {
                console.error('Error fetching payment:', fetchError);
                throw new Error(fetchError?.message || 'Error al obtener detalles del pago');
            }

            // 2. If approved, update subscription
            if (newStatus === 'approved') {
                const plan = payment.subscriptions.plans;
                const startDate = new Date();
                const endDate = new Date();

                // Calculate end date based on plan billing_cycle
                if (plan.billing_cycle === 'yearly' || plan.billing_cycle === 'year') {
                    endDate.setFullYear(endDate.getFullYear() + 1);
                } else {
                    endDate.setMonth(endDate.getMonth() + 1);
                }

                const { error: subError } = await supabase!
                    .from('subscriptions')
                    .update({
                        status: 'active',
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString()
                    })
                    .eq('id', payment.subscriptions.id);

                if (subError) throw subError;
            }

            // 3. Update Payment Status
            const { error } = await supabase!
                .from('payments')
                .update({ status: newStatus })
                .eq('id', paymentId);

            if (error) throw error;

            // 4. Send Email Notification to User
            try {
                // Get user email
                // Fetch user_company separately to avoid RLS issues with nested joins
                const { data: userCompanyData } = await supabase!
                    .from('user_company')
                    .select('user_id')
                    .eq('company_id', payment.subscriptions.company_id)
                    .limit(1)
                    .maybeSingle();

                const userId = userCompanyData?.user_id;

                if (userId) {
                    // We need to fetch the email from auth.users or participants
                    // Since we can't query auth.users directly easily from client without admin rights (unless RLS allows),
                    // we'll try to find the participant record or use an Edge Function if needed.
                    // However, we can use the 'send-email' function which might not need the email if we pass the user_id? 
                    // No, send-email needs 'to'.
                    // Let's try to get the email from the 'participants' table which mirrors users usually.

                    const { data: participant } = await supabase!
                        .from('participants')
                        .select('email, first_name')
                        .eq('user_id', userId)
                        .single();

                    if (participant?.email) {
                        const subject = newStatus === 'approved'
                            ? '¡Pago Aprobado! Tu suscripción está activa'
                            : 'Problema con tu reporte de pago';

                        const html = newStatus === 'approved'
                            ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pago Aprobado</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background-color: #10B981; padding: 20px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .button { display: inline-block; background-color: #0A4D8C; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; margin: 20px 0; text-align: center; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Pago Aprobado!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${participant.first_name || 'Usuario'}</strong>,</p>
      <p>Tu pago ha sido verificado y aprobado exitosamente.</p>
      <p>Tu suscripción al plan <strong>${payment.subscriptions.plans.name}</strong> está ahora <strong>ACTIVA</strong>.</p>
      
      <div style="text-align: center;">
        <a href="${window.location.origin}/dashboard" class="button">Ir al Dashboard</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} K-Tracker.</p>
    </div>
  </div>
</body>
</html>
                            `
                            : `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pago Rechazado</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background-color: #EF4444; padding: 20px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Pago Rechazado</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${participant.first_name || 'Usuario'}</strong>,</p>
      <p>Hubo un problema verificando tu reporte de pago.</p>
      <p>Por favor, intenta reportar el pago nuevamente o contacta a soporte.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} K-Tracker.</p>
    </div>
  </div>
</body>
</html>
                            `;

                        await supabase!.functions.invoke('send-email', {
                            body: {
                                to: participant.email,
                                subject: subject,
                                html: html
                            }
                        });
                    }
                }
            } catch (emailError) {
                console.error('Error sending email notification:', emailError);
            }

            toast.success(`Pago ${newStatus === 'approved' ? 'aprobado' : 'rechazado'} correctamente`);

            // Optimistic update
            setPayments(prevPayments =>
                prevPayments.map(p =>
                    p.id === paymentId ? { ...p, status: newStatus } : p
                )
            );

            await fetchPayments(); // Refresh list to be sure
        } catch (error: unknown) {
            console.error('Error updating payment:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            toast.error('Error al actualizar pago: ' + errorMessage);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredPayments = payments.filter(payment => {
        if (filterStatus === 'all') return true;
        return payment.status === filterStatus;
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Pagos</h1>
                    <p className="text-gray-500">Revisión y aprobación de pagos manuales.</p>
                </div>
                <div className="flex gap-2">
                    <select
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">Todos los estados</option>
                        <option value="pending">Pendientes</option>
                        <option value="approved">Aprobados</option>
                        <option value="rejected">Rechazados</option>
                    </select>
                </div>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-500 bg-gray-50 uppercase">
                            <tr>
                                <th className="px-6 py-3">Empresa</th>
                                <th className="px-6 py-3">Plan</th>
                                <th className="px-6 py-3">Monto</th>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Comprobante</th>
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        Cargando pagos...
                                    </td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron pagos.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {payment.subscriptions?.company?.name || 'Desconocida'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {payment.subscriptions?.plans?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            ${payment.amount}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(payment.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {payment.proof_url ? (
                                                <a
                                                    href={payment.proof_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center text-blue-600 hover:underline"
                                                >
                                                    <ExternalLink className="w-4 h-4 mr-1" />
                                                    Ver
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">Sin archivo</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={payment.status === 'approved' ? 'completed' : payment.status === 'rejected' ? 'canceled' : 'pending'}>
                                                {payment.status === 'approved' ? 'Aprobado' : payment.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {payment.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleUpdateStatus(payment.id, 'approved')}
                                                        disabled={!!processingId}
                                                        className={`p-1 rounded ${processingId === payment.id ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:bg-green-50'}`}
                                                        title="Aprobar"
                                                    >
                                                        {processingId === payment.id ? (
                                                            <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                                                        ) : (
                                                            <CheckCircle className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(payment.id, 'rejected')}
                                                        disabled={!!processingId}
                                                        className={`p-1 rounded ${processingId === payment.id ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                                                        title="Rechazar"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
