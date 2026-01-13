import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Mail } from 'lucide-react';
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
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trialDays, setTrialDays] = useState<string>('14');

  useEffect(() => {
    async function fetchSettings() {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'default_trial_days')
        .single();

      if (data) {
        setTrialDays(data.value);
      }
    }
    fetchSettings();
  }, []);

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

    setIsSubmitting(true);
    const supabase = getSupabase()!;
    supabase.auth.signUp({
      email: formData.email.trim(),
      password: formData.password.trim(),
      options: {
        data: {
          is_company_signup: true,
          company_name: formData.company_name.trim()
        }
      }
    })
      .then(async ({ data, error }) => {
        if (error) {
          setError(error.message || 'No se pudo crear la cuenta');
          setIsSubmitting(false);
          return;
        }
        try {
          const name = formData.company_name.trim();
          const tax_id = formData.tax_id.trim();
          const phone = formData.phone.trim();

          const { data: sessionRes } = await supabase.auth.getUser();
          const user_id = sessionRes.user?.id || data.user?.id || null;

          if (user_id) {
            const { data: companyId, error: rpcError } = await supabase.rpc('create_company_for_new_user', {
              p_name: name,
              p_tax_id: tax_id,
              p_phone: phone,
              p_user_id: user_id
            });

            if (rpcError) {
              throw rpcError;
            }

            if (companyId) {
              await supabase.auth.updateUser({ data: { company_id: companyId } });
            }
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
          console.warn('Post-signup linking failed:', errorMessage);
          setError(errorMessage || 'Error al crear y vincular la empresa');
          setIsSubmitting(false);
          return;
        }
        setRegistrationSuccess(true);
        setIsSubmitting(false);
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-[#0A4D8C]/10 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-[#0A4D8C]" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-center text-gray-900">
                ¡Verifica tu correo!
              </h1>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Hemos enviado un enlace de confirmación a <span className="font-semibold text-gray-900">{formData.email}</span>.
              </p>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800 text-left">
                <p className="font-semibold mb-1">Pasos siguientes:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Confirma tu correo electrónico haciendo clic en el enlace enviado.</li>
                  <li>Espera a que un administrador de KAI PRO habilite tu cuenta.</li>
                  <li>Recibirás una notificación cuando tu cuenta esté activa.</li>
                </ol>
              </div>
              <Link to="/login">
                <Button className="w-full">
                  Ir al Inicio de Sesión
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            {trialDays && (
              <div className="mt-4 bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm text-center font-medium border border-blue-100">
                🚀 Comienza con una prueba gratuita de {trialDays} días
              </div>
            )}
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
                label="Email"
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
              <Button type="submit" variant="primary" className="w-full mt-6" isLoading={isSubmitting}>
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
