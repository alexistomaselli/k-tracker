import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase';

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    company_name: '',
    tax_id: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!SUPABASE_CONFIGURED) {
      navigate('/dashboard');
      return;
    }
    setError('');
    if (formData.password !== formData.confirm_password) {
      setError('Las contraseñas no coinciden');
      return;
    }
    const supabase = getSupabase()!;
    supabase.auth.signUp({ email: formData.email, password: formData.password })
      .then(({ error }) => {
        if (error) {
          setError('No se pudo crear la cuenta');
          return;
        }
        navigate('/dashboard');
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 bg-[#0A4D8C] rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900">
              Crear Cuenta de Empresa
            </h1>
            <p className="text-center text-gray-600 text-sm mt-2">
              Regístrate y comienza a gestionar tus proyectos
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nombre de la Empresa"
                name="company_name"
                type="text"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="Constructora XYZ"
                required
              />
              <Input
                label="RUC"
                name="tax_id"
                type="text"
                value={formData.tax_id}
                onChange={handleChange}
                placeholder="20123456789"
                required
              />
              <Input
                label="Email Corporativo"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contacto@empresa.com"
                required
              />
              <Input
                label="Teléfono"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+51987654321"
                required
              />
              <Input
                label="Contraseña"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              <Input
                label="Confirmar Contraseña"
                name="confirm_password"
                type="password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              <Button type="submit" variant="primary" className="w-full mt-6">
                Crear Cuenta
              </Button>
            </form>
            {error && (
              <div className="mt-4 text-center text-sm text-red-600">{error}</div>
            )}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-[#0A4D8C] font-semibold hover:underline">
                  Iniciar Sesión
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
