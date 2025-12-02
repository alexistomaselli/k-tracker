import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Package } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';

interface Plan {
    id: string;
    name: string;
    code: string;
    description: string;
    price: number;
    currency: string;
    billing_cycle: string;
    features: string[];
    limits: Record<string, number>;
    active: boolean;
}

export default function AdminPlans() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const toast = useToast();

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        price: '',
        currency: 'USD',
        billing_cycle: 'monthly',
        features: '', // JSON string
        limits: '',   // JSON string
        active: true
    });

    useEffect(() => {
        fetchPlans();
    }, []);

    async function fetchPlans() {
        try {
            setLoading(true);
            const supabase = getSupabase();
            const { data, error } = await supabase!
                .from('plans')
                .select('*')
                .order('price', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const supabase = getSupabase();

            // Parse JSON fields
            let featuresJson = [];
            let limitsJson = {};

            try {
                featuresJson = JSON.parse(formData.features || '[]');
            } catch {
                throw new Error('Formato de Features inválido (debe ser un array JSON)');
            }

            try {
                limitsJson = JSON.parse(formData.limits || '{}');
            } catch {
                throw new Error('Formato de Límites inválido (debe ser un objeto JSON)');
            }

            const payload = {
                name: formData.name,
                code: formData.code,
                description: formData.description,
                price: parseFloat(formData.price),
                currency: formData.currency,
                billing_cycle: formData.billing_cycle,
                features: featuresJson,
                limits: limitsJson,
                active: formData.active
            };

            if (editingPlan) {
                const { error } = await supabase!
                    .from('plans')
                    .update(payload)
                    .eq('id', editingPlan.id);
                if (error) throw error;
                toast.success('Plan actualizado correctamente');
            } else {
                const { error } = await supabase!
                    .from('plans')
                    .insert(payload);
                if (error) throw error;
                toast.success('Plan creado correctamente');
            }

            setShowModal(false);
            setEditingPlan(null);
            resetForm();
            fetchPlans();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            toast.error('Error al guardar plan: ' + errorMessage);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este plan?')) return;

        try {
            const supabase = getSupabase();
            const { error } = await supabase!
                .from('plans')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Plan eliminado');
            fetchPlans();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            toast.error('Error al eliminar: ' + errorMessage);
        }
    };

    const openEdit = (plan: Plan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            code: plan.code,
            description: plan.description || '',
            price: plan.price.toString(),
            currency: plan.currency || 'USD',
            billing_cycle: plan.billing_cycle || 'monthly',
            features: JSON.stringify(plan.features, null, 2),
            limits: JSON.stringify(plan.limits, null, 2),
            active: plan.active
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            description: '',
            price: '',
            currency: 'USD',
            billing_cycle: 'monthly',
            features: '[\n  "Feature 1",\n  "Feature 2"\n]',
            limits: '{\n  "users": 5,\n  "storage": 10\n}',
            active: true
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Planes de Suscripción</h1>
                    <p className="text-gray-500">Gestiona los planes disponibles para las empresas.</p>
                </div>
                <Button onClick={() => { setEditingPlan(null); resetForm(); setShowModal(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Plan
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-gray-500 col-span-full text-center py-8">Cargando planes...</p>
                ) : plans.length === 0 ? (
                    <p className="text-gray-500 col-span-full text-center py-8">No hay planes registrados.</p>
                ) : (
                    plans.map((plan) => (
                        <Card key={plan.id} className="relative group flex flex-col h-full">
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{plan.name}</h3>
                                            <p className="text-sm text-gray-500">{plan.code}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(plan)} className="p-1 text-gray-400 hover:text-blue-600">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(plan.id)} className="p-1 text-gray-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <span className="text-3xl font-bold text-gray-900">{plan.currency === 'PEN' ? 'S/' : '$'}{plan.price}</span>
                                    <span className="text-gray-500 text-sm">/{plan.billing_cycle === 'annual' ? 'año' : 'mes'}</span>
                                </div>

                                <p className="text-gray-600 text-sm mb-4 flex-1">{plan.description}</p>

                                <div className="space-y-2 text-sm border-t pt-4">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Estado:</span>
                                        <Badge variant={plan.active ? 'active' : 'secondary'}>
                                            {plan.active ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Límites:</span>
                                        <span className="font-medium text-gray-900" title={JSON.stringify(plan.limits)}>
                                            {Object.keys(plan.limits || {}).length} reglas
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
                        <h3 className="text-lg font-bold mb-4">{editingPlan ? 'Editar Plan' : 'Nuevo Plan'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        placeholder="Ej: Professional"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Código (Slug)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        placeholder="Ej: pro_monthly"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    rows={2}
                                    placeholder="Descripción corta del plan"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="PEN">PEN</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo</label>
                                    <select
                                        value={formData.billing_cycle}
                                        onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="monthly">Mensual</option>
                                        <option value="annual">Anual</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.active}
                                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Activo</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Features (JSON Array)
                                        <span className="text-xs text-gray-500 ml-2">Ej: ["Feature 1", "Feature 2"]</span>
                                    </label>
                                    <textarea
                                        value={formData.features}
                                        onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
                                        rows={6}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Límites (JSON Object)
                                        <span className="text-xs text-gray-500 ml-2">Ej: {'{"users": 5}'}</span>
                                    </label>
                                    <textarea
                                        value={formData.limits}
                                        onChange={(e) => setFormData({ ...formData, limits: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
                                        rows={6}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setShowModal(false)} type="button">Cancelar</Button>
                                <Button variant="primary" type="submit">Guardar Plan</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
