import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import { getSupabase, SUPABASE_CONFIGURED } from '../../lib/supabase';
import { useCurrentUser } from '../../context/UserContext';

export default function AdminLogin() {
    const navigate = useNavigate();
    const { reloadUser, isPlatformAdmin, loading } = useCurrentUser();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Redirect if already logged in as admin
    useEffect(() => {
        if (!loading && isPlatformAdmin) {
            navigate('/admin');
        }
    }, [loading, isPlatformAdmin, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!SUPABASE_CONFIGURED) {
            navigate('/admin');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const supabase = getSupabase()!;
            const email = formData.email.trim();
            const password = formData.password.trim();

            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                setError(error.message || 'Credenciales inválidas');
                return;
            }

            if (data.user) {
                // Check if user is platform admin
                const { data: adminUser } = await supabase
                    .from('admin_users')
                    .select('role')
                    .eq('user_id', data.user.id)
                    .maybeSingle();

                if (adminUser) {
                    await reloadUser();
                    navigate('/admin');
                } else {
                    await supabase.auth.signOut();
                    setError('Esta cuenta no tiene permisos de administrador de plataforma.');
                }
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesión';
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    return (
        <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center px-4">
            <Card className="w-full max-w-md border-gray-200 shadow-xl">
                <CardHeader>
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 bg-[#0A4D8C] rounded-full flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center text-gray-900">
                        KAI PRO Admin
                    </h1>
                    <p className="text-center text-gray-600 text-sm mt-2">
                        Acceso exclusivo para administradores
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <Input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="admin@kaipro.com"
                                required
                                className="bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[#0A4D8C] focus:ring-[#0A4D8C]"
                            />
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    className="bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[#0A4D8C] focus:ring-[#0A4D8C] pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full mt-6 bg-[#0A4D8C] hover:bg-[#083d70] text-white border-none" isLoading={isSubmitting}>
                            Iniciar Sesión
                        </Button>
                    </form>
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-center text-sm text-red-600">
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>
            <div className="mt-8 text-center text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} KAI PRO. Todos los derechos reservados.
            </div>
        </div>
    );
}
