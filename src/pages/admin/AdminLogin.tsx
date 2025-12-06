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
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
            <Card className="w-full max-w-md bg-gray-800 border-gray-700">
                <CardHeader>
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/50">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center text-white">
                        KAI PRO Admin
                    </h1>
                    <p className="text-center text-gray-400 text-sm mt-2">
                        Acceso exclusivo para administradores
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Email
                            </label>
                            <Input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="admin@kaipro.com"
                                required
                                className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-300 mb-1">
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
                                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white border-none">
                            Iniciar Sesión
                        </Button>
                    </form>
                    {error && (
                        <div className="mt-4 p-3 bg-red-900/50 border border-red-800 rounded-md text-center text-sm text-red-200">
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
