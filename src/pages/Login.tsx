import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Building2, Eye, EyeOff } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const showVerifyNotice = new URLSearchParams(location.search).has('verifyEmail');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!SUPABASE_CONFIGURED) {
      navigate('/dashboard');
      return;
    }
    setError('');
    const supabase = getSupabase()!;
    const email = formData.email.trim();
    const password = formData.password.trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message || 'Credenciales inválidas');
        return;
      }

      if (data.user) {
        // 1. Check if user is platform admin
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (adminUser) {
          navigate('/admin');
          return;
        }

        // 2. Check if user is a Company Admin (exists in user_company)
        const { data: userCompany } = await supabase
          .from('user_company')
          .select('id')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (userCompany) {
          navigate('/dashboard');
        } else {
          // If not admin and not company user, they must be a participant/responsable trying to login here
          await supabase.auth.signOut();
          setError('Esta cuenta no tiene permisos de administrador. Por favor ingresa como Responsable.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    }
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
              Iniciar Sesión - Empresa
            </h1>
            <p className="text-center text-gray-600 text-sm mt-2">
              Accede a tu cuenta corporativa
            </p>
            {showVerifyNotice && (
              <p className="text-center text-blue-600 text-sm mt-2">Verifica tu email para acceder</p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contacto@empresa.com"
                required
              />
              <div className="relative">
                <Input
                  label="Contraseña"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-[#0A4D8C] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Button type="submit" variant="primary" className="w-full mt-6">
                Iniciar Sesión
              </Button>
            </form>
            {error && (
              <div className="mt-4 text-center text-sm text-red-600">{error}</div>
            )}
            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  ¿No tienes cuenta?{' '}
                  <Link to="/signup" className="text-[#0A4D8C] font-semibold hover:underline">
                    Crear Cuenta
                  </Link>
                </p>
              </div>
              <div className="border-t pt-4 text-center">
                <p className="text-sm text-gray-600 mb-2">
                  ¿Eres responsable de tareas?
                </p>
                <Link to="/login-responsable">
                  <Button variant="outline" size="sm" className="w-full">
                    Acceso para Responsables
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
