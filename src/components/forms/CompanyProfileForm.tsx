import React, { useState } from 'react';
import { Building, Save, AlertCircle, CheckCircle } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Company } from '../../data/mockData';
import { useCompany } from '../../hooks/useData';

interface CompanyProfileFormProps {
    company: Company;
}

export default function CompanyProfileForm({ company }: CompanyProfileFormProps) {
    const { updateCompany } = useCompany();
    const [formData, setFormData] = useState({
        name: company.name || '',
        tax_id: company.tax_id || '',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await updateCompany(company.id, formData);
            if (error) throw error;
            setMessage({ type: 'success', text: 'Información de la empresa actualizada correctamente.' });
        } catch (error) {
            console.error('Error updating company:', error);
            setMessage({ type: 'error', text: 'Error al actualizar la información. Inténtalo de nuevo.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Building className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Datos de la Empresa</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                    label="Nombre de la Empresa"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
                <Input
                    label="CUIT / RUT"
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleChange}
                    placeholder="Ej: 30-12345678-9"
                />
                <Input
                    label="Dirección"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Calle 123, Ciudad"
                />
                <Input
                    label="Teléfono"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+54 11 1234-5678"
                />
                <Input
                    label="Email Corporativo"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="contacto@empresa.com"
                />
            </div>

            {message && (
                <div className={`p-4 rounded-md flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                    <p>{message.text}</p>
                </div>
            )}

            <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? 'Guardando...' : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Guardar Cambios
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
