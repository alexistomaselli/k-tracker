import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Eye, EyeOff } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';

import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase';

export default function LoginResponsable() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!SUPABASE_CONFIGURED) {
      navigate('/my-tasks');
      return;
    }
    setError('');
    const supabase = getSupabase()!;
    const email = formData.email.trim();
    const password = formData.password.trim();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message || 'Credenciales inválidas');
      return;
    }
    navigate('/my-tasks');
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
              <div className="w-12 h-12 bg-[#1B6FB3] rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900">
              Acceso para Responsables
            </h1>
            <p className="text-center text-gray-600 text-sm mt-2">
              Gestiona tus tareas asignadas
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu.email@ejemplo.com"
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
                  to="/login-responsable"
                  className="text-sm text-[#1B6FB3] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Button type="submit" variant="secondary" className="w-full mt-6">
                Iniciar Sesión
              </Button>
            </form>
            {error && (
              <div className="mt-4 text-center text-sm text-red-600">{error}</div>
            )}
            <div className="mt-6 border-t pt-4 text-center">
              <p className="text-sm text-gray-600 mb-2">
                ¿Eres administrador de empresa?
              </p>
              <Link to="/login">
                <Button variant="outline" size="sm" className="w-full">
                  Acceso Empresarial
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
