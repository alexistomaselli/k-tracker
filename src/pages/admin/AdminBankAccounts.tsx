import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Building2 } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

export default function AdminBankAccounts() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any>(null);
    const toast = useToast();

    const [formData, setFormData] = useState({
        bank_name: '',
        holder_name: '',
        account_number: '',
        cbu: '',
        alias: '',
        account_type: 'Corriente',
        currency: 'PEN'
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    async function fetchAccounts() {
        try {
            setLoading(true);
            const supabase = getSupabase();
            const { data, error } = await supabase!
                .from('bank_accounts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAccounts(data || []);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const supabase = getSupabase();

            if (editingAccount) {
                const { error } = await supabase!
                    .from('bank_accounts')
                    .update(formData)
                    .eq('id', editingAccount.id);
                if (error) throw error;
                toast.success('Cuenta actualizada correctamente');
            } else {
                const { error } = await supabase!
                    .from('bank_accounts')
                    .insert(formData);
                if (error) throw error;
                toast.success('Cuenta creada correctamente');
            }

            setShowModal(false);
            setEditingAccount(null);
            resetForm();
            fetchAccounts();
        } catch (error: any) {
            toast.error('Error al guardar cuenta: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta cuenta?')) return;

        try {
            const supabase = getSupabase();
            const { error } = await supabase!
                .from('bank_accounts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Cuenta eliminada');
            fetchAccounts();
        } catch (error: any) {
            toast.error('Error al eliminar: ' + error.message);
        }
    };

    const openEdit = (account: any) => {
        setEditingAccount(account);
        setFormData({
            bank_name: account.bank_name,
            holder_name: account.holder_name,
            account_number: account.account_number,
            cbu: account.cbu || '',
            alias: account.alias || '',
            account_type: account.account_type || 'Corriente',
            currency: account.currency || 'PEN'
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            bank_name: '',
            holder_name: '',
            account_number: '',
            cbu: '',
            alias: '',
            account_type: 'Corriente',
            currency: 'PEN'
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cuentas Bancarias</h1>
                    <p className="text-gray-500">Administra las cuentas donde los clientes realizarán los pagos.</p>
                </div>
                <Button onClick={() => { setEditingAccount(null); resetForm(); setShowModal(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Cuenta
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-gray-500 col-span-full text-center py-8">Cargando cuentas...</p>
                ) : accounts.length === 0 ? (
                    <p className="text-gray-500 col-span-full text-center py-8">No hay cuentas registradas.</p>
                ) : (
                    accounts.map((account) => (
                        <Card key={account.id} className="relative group">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{account.bank_name}</h3>
                                            <p className="text-sm text-gray-500">{account.currency}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(account)} className="p-1 text-gray-400 hover:text-blue-600">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(account.id)} className="p-1 text-gray-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Titular:</span>
                                        <span className="font-medium text-gray-900">{account.holder_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">CBU:</span>
                                        <span className="font-medium text-gray-900">{account.cbu || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Alias:</span>
                                        <span className="font-medium text-gray-900">{account.alias || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Tipo:</span>
                                        <span className="font-medium text-gray-900">{account.account_type}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold mb-4">{editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="Ej: Banco Galicia"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Titular</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.holder_name}
                                    onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="Nombre del titular"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CBU</label>
                                    <input
                                        type="text"
                                        value={formData.cbu}
                                        onChange={(e) => setFormData({ ...formData, cbu: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        placeholder="22 digitos"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Alias</label>
                                    <input
                                        type="text"
                                        value={formData.alias}
                                        onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        placeholder="mi.alias.banco"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cuenta</label>
                                    <select
                                        value={formData.account_type}
                                        onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="Corriente">Corriente</option>
                                        <option value="Ahorro">Caja de Ahorro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="PEN">PEN (Soles)</option>
                                        <option value="USD">USD (Dólares)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setShowModal(false)} type="button">Cancelar</Button>
                                <Button variant="primary" type="submit">Guardar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
