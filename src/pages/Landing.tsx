import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, Users, MessageSquare, ArrowRight } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import Card, { CardContent } from '../components/ui/Card';
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase';

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    if (SUPABASE_CONFIGURED) {
      const supabase = getSupabase()!;

      // Check initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('DEBUG: Initial session check:', session ? 'Found' : 'None');
        if (session) {
          navigate('/dashboard');
        }
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('DEBUG: Auth state change:', event, session ? 'Session exists' : 'No session');
        if (event === 'SIGNED_IN' && session) {
          navigate('/dashboard');
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [navigate]);

  const features = [
    {
      icon: FileText,
      title: 'Actas Estandarizadas',
      description: 'Crea y gestiona actas semanales de obra con un formato consistente y profesional.',
    },
    {
      icon: CheckCircle,
      title: 'Gestión de Tareas',
      description: 'Asigna tareas con responsables, prioridades y fechas de vencimiento desde cada acta.',
    },
    {
      icon: Users,
      title: 'Colaboración en Tiempo Real',
      description: 'Mantén informado a todo el equipo con comentarios y actualizaciones de estado.',
    },
    {
      icon: MessageSquare,
      title: 'Feed de Actividad',
      description: 'Historial completo de cambios, comentarios y adjuntos en cada tarea.',
    },
  ];

  const steps = [
    {
      number: '1',
      title: 'Crea tu proyecto',
      description: 'Registra tus proyectos de construcción y configura tu equipo de trabajo.',
    },
    {
      number: '2',
      title: 'Genera actas semanales',
      description: 'Documenta reuniones con agenda, asistencia y firma digital de participantes.',
    },
    {
      number: '3',
      title: 'Asigna y gestiona tareas',
      description: 'Define responsables, prioridades y fechas límite para cada tarea acordada.',
    },
    {
      number: '4',
      title: 'Seguimiento continuo',
      description: 'Monitorea avances con comentarios, adjuntos y notificaciones automáticas.',
    },
  ];

  const testimonials = [
    {
      company: 'Constructora Los Andes',
      text: 'K-Tracker nos ayudó a reducir el tiempo de coordinación en un 40%. Ahora todo el equipo sabe exactamente qué debe hacer.',
      author: 'Juan Pérez, Gerente de Proyectos',
    },
    {
      company: 'Ingeniería del Sur',
      text: 'La gestión de actas nunca fue tan fácil. Podemos arrastrar tareas pendientes de semanas anteriores con un solo clic.',
      author: 'María González, Directora de Operaciones',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <section className="bg-gradient-to-br from-[#0A4D8C] to-[#1B6FB3] text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            K-Tracker: Actas y Tareas para Obras
          </h1>
          <p className="text-xl sm:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
            Centraliza la gestión de actas semanales y tareas de construcción en una sola plataforma intuitiva
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button variant="secondary" size="lg" className="!bg-white !text-[#0A4D8C] hover:!bg-gray-100 w-full sm:w-auto">
                Empieza Gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                Solicitar Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-[#F5F7FA]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            Beneficios Clave
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-8">
                  <div className="w-16 h-16 bg-[#0A4D8C] rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">
            ¿Cómo Funciona?
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            En cuatro simples pasos, transforma la gestión de tus proyectos de construcción
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="w-16 h-16 bg-[#1B6FB3] rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-[#F5F7FA]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            Lo Que Dicen Nuestros Clientes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                  <div className="border-t pt-4">
                    <p className="font-semibold text-gray-900">{testimonial.company}</p>
                    <p className="text-sm text-gray-600">{testimonial.author}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gradient-to-br from-[#0A4D8C] to-[#1B6FB3] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            ¿Listo para Optimizar tus Proyectos?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Únete a empresas líderes en construcción que ya confían en K-Tracker
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button variant="secondary" size="lg" className="bg-white text-[#0A4D8C] hover:bg-gray-100 w-full sm:w-auto">
                Crear Cuenta Gratis
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                Solicitar Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
