import { useState } from 'react';
import { BookOpen, ChevronRight, Menu } from 'lucide-react';
import Card from '../../components/ui/Card';

interface DocTopic {
    id: string;
    title: string;
    content: string; // HTML string
}

const DOCUMENTATION_TOPICS: DocTopic[] = [
    {
        id: 'intro',
        title: 'Introducción',
        content: `
            <div class="prose max-w-none">
                <h2 class="text-2xl font-bold mb-4">Manual de Operaciones KAI PRO</h2>
                <p class="mb-4">Bienvenido al manual de operaciones de la plataforma. Este documento sirve como guía para la administración y mantenimiento del sistema.</p>
                <p>Utilice el menú lateral para navegar entre los diferentes procesos y guías disponibles.</p>
            </div>
        `
    },
    {
        id: 'registration',
        title: 'Registro y Activación',
        content: `
            <div class="prose max-w-none">
                <h2 class="text-2xl font-bold mb-6">Ciclo de Vida: Registro de Empresa</h2>
                
                <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                    <p class="font-medium">Resumen del Proceso</p>
                    <p class="text-sm text-gray-600">El registro comienza con el cliente en la web pública y finaliza con la validación del Administrador KAI PRO.</p>
                </div>

                <h3 class="text-xl font-bold mb-4 text-gray-800">1. El Cliente (Usuario)</h3>
                <ul class="list-disc pl-5 mb-6 space-y-2">
                    <li>Ingresa a la página de registro (<code>/signup</code>).</li>
                    <li>Completa sus datos personales y el <strong>nombre de su empresa</strong>.</li>
                    <li>Al enviar el formulario, el sistema crea automáticamente su cuenta y la organización.</li>
                    <li><strong>Estado Inicial:</strong> Su empresa nace en estado <span class="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold">PENDIENTE</span> (si la aprobación manual está activa).</li>
                    <li>El cliente verá un mensaje indicando que su cuenta está bajo revisión.</li>
                </ul>

                <h3 class="text-xl font-bold mb-4 text-gray-800">2. El Administrador (KAI PRO)</h3>
                <ul class="list-disc pl-5 mb-6 space-y-2">
                    <li>Accede al Panel Administrativo > <strong>Empresas</strong>.</li>
                    <li>Identifica las empresas con estado <code>Pendiente</code>.</li>
                    <li>Puede contactar al cliente para validar datos si es necesario (el teléfono y email están visibles).</li>
                    <li><strong>Acción:</strong> Hace clic en el botón <span class="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">Aprobar</span>.</li>
                </ul>

                <h3 class="text-xl font-bold mb-4 text-gray-800">3. Resultado (Activación y Trial)</h3>
                <p class="mb-2">Una vez aprobado:</p>
                <ol class="list-decimal pl-5 mb-6 space-y-2">
                    <li>El estado de la empresa cambia a <span class="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">APPROVED</span>.</li>
                    <li>
                        <strong>Inicio del Periodo de Prueba (Trial):</strong>
                        <ul class="list-disc pl-5 mt-1 text-sm text-gray-600">
                            <li>La empresa inicia automáticamente con un periodo de prueba gratuito.</li>
                            <li>La duración de este periodo se toma de la <strong>Configuración Global</strong> del panel (por defecto 14 días).</li>
                            <li>El administrador puede modificar esta duración global en la sección <em>Ajustes</em>.</li>
                        </ul>
                    </li>
                    <li>El cliente puede iniciar sesión y acceder a todas las funcionalidades.</li>
                </ol>

                <div class="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 class="font-bold text-gray-700 mb-2">Nota Técnica (Configuración)</h4>
                    <p class="text-sm text-gray-600">
                        Si la opción <em>"Requerir aprobación manual"</em> está desactivada en <strong>Configuración</strong>, 
                        el paso 2 se omite y la empresa nace directamente como <span class="text-green-600 font-bold">Aprobada</span>.
                    </p>
                </div>
            </div>
        `
    },
    {
        id: 'admin_panel',
        title: 'Panel de Gestión (Empresa)',
        content: `
            <div class="prose max-w-none">
                <h2 class="text-2xl font-bold mb-6">Panel de Gestión de Empresa</h2>
                <p class="mb-4">Guía para el administrador de la empresa sobre las funcionalidades principales de KAI PRO.</p>

                <h3 class="text-xl font-bold mb-3 text-gray-800">1. Proyectos</h3>
                <p class="mb-4">El módulo de proyectos permite organizar el trabajo de la empresa. Cada proyecto agrupa actas, tareas y participantes específicos.</p>
                <ul class="list-disc pl-5 mb-6 space-y-1">
                    <li><strong>Creación:</strong> Se pueden crear proyectos ilimitados con código único.</li>
                    <li><strong>Gestión:</strong> Permite definir fechas de inicio/fin y controlar el presupuesto.</li>
                </ul>

                <h3 class="text-xl font-bold mb-3 text-gray-800">2. Actas (Minutas)</h3>
                <p class="mb-4">El núcleo de la gestión. Las actas permiten documentar reuniones y generar compromisos.</p>
                
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-700 mb-2">Dentro de un Acta:</h4>
                    <ul class="list-disc pl-5 space-y-2 text-sm">
                        <li><strong>Asistencia:</strong> Registro de participantes presentes y ausentes.</li>
                        <li><strong>Hitos de la Minuta:</strong> Puntos clave discutidos o fases del proyecto revisadas.</li>
                        <li><strong>Tareas / Acuerdos:</strong> Compromisos específicos asignados a responsables con fecha límite.</li>
                        <li><strong>Rutinas:</strong> Listas de verificación (checklists) recurrentes o estandarizadas para control de calidad.</li>
                    </ul>
                </div>

                <h3 class="text-xl font-bold mb-3 text-gray-800">3. Tareas y Comentarios</h3>
                <p class="mb-4">El seguimiento operativo se realiza a través del módulo de tareas.</p>
                <ul class="list-disc pl-5 mb-6 space-y-2">
                    <li><strong>Creación:</strong> Las tareas nacen principalmente desde una <strong>Acta</strong> (como un acuerdo), pero también se pueden crear tareas independientes.</li>
                    <li><strong>Seguimiento:</strong> Cada tarea tiene estados (Pendiente, En Progreso, Completada).</li>
                    <li><strong>Comentarios:</strong> Sistema de chat dentro de cada tarea para mantener la comunicación contextualizada. Los usuarios pueden discutir avances, dudas o adjuntar evidencia directamente en la tarea.</li>
                </ul>
            </div>
        `
    },
    {
        id: 'participant_panel',
        title: 'Panel del Responsable',
        content: `
            <div class="prose max-w-none">
                <h2 class="text-2xl font-bold mb-6">Guía para el Responsable (Participante)</h2>
                <p class="mb-4">El "Responsable" es el usuario operativo asignado para ejecutar las tareas.</p>

                <div class="bg-gray-50 border-l-4 border-gray-500 p-4 mb-6">
                    <h4 class="font-bold text-gray-700">¿Cómo obtiene acceso?</h4>
                    <p class="text-sm text-gray-600 mt-1">
                        1. El Administrador lo registra en <strong>Recursos Humanos</strong>.<br>
                        2. Si se activa la opción <em>"Acceso al Sistema"</em>, el responsable recibe credenciales para entrar al Panel Web.<br>
                        3. Si se registra su teléfono, queda habilitado automáticamente para usar el <strong>Bot de WhatsApp</strong>.
                    </p>
                </div>

                <h3 class="text-xl font-bold mb-3 text-gray-800">1. Gestión Web ("Mis Tareas")</h3>
                <p class="mb-2">Al ingresar al panel web, el responsable ve el módulo <strong>Mis Tareas</strong>, donde puede:</p>
                <ul class="list-disc pl-5 mb-6 space-y-1">
                    <li>Visualizar todas las tareas asignadas ordenadas por vencimiento.</li>
                    <li>Cambiar el estado de las tareas (ej: de <em>Pendiente</em> a <em>En Progreso</em>).</li>
                    <li><strong>Comentarios:</strong> Escribir notas y actualizaciones en cada tarea para mantener informado al líder del proyecto.</li>
                </ul>

                <h3 class="text-xl font-bold mb-3 text-gray-800">2. Gestión por WhatsApp</h3>
                <p class="mb-4">KAI PRO permite gestionar el trabajo diario sin entrar a la web, directamente desde WhatsApp.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h5 class="font-bold text-green-800 mb-2">Interacción (Lenguaje Natural)</h5>
                        <p class="text-sm text-green-700 mb-2">No necesita comandos estrictos, puede hablarle naturalmente:</p>
                        <ul class="text-sm space-y-1 text-green-700 font-mono">
                            <li>"Lista mis tareas"</li>
                            <li>"¿Cuáles son mis tareas pendientes?"</li>
                            <li>"Cuáles son mis proyectos"</li>
                            <li>"Agrega un comentario a la tarea X"</li>
                            <li>"Cambia el estado a terminada la tarea X"</li>
                        </ul>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h5 class="font-bold text-blue-800 mb-2">Interacciones Avanzadas</h5>
                        <ul class="text-sm space-y-1 text-blue-700">
                            <li><strong>Actualizar Estado:</strong> El bot preguntará si desea marcar una tarea como completada.</li>
                            <li><strong>Comentarios y Fotos:</strong> Al seleccionar una tarea, puede agregar comentarios de texto o adjuntar fotos, los cuales se guardarán automáticamente en la tarea.</li>
                        </ul>
                    </div>
                </div>
            </div>
        `
    },
    {
        id: 'whatsapp',
        title: 'Integración WhatsApp',
        content: `
            <div class="prose max-w-none">
                <h2 class="text-2xl font-bold mb-4">Integración con WhatsApp (Evolution API)</h2>
                <p class="mb-4">KAI PRO utiliza Evolution API para gestionar la mensajería de WhatsApp.</p>

                <h3 class="text-xl font-semibold mb-2 mt-6">Auto-provisionamiento</h3>
                <p class="mb-4">Cuando una empresa intenta conectar su WhatsApp por primera vez:</p>
                <ol class="list-decimal pl-5 mb-4 space-y-2">
                    <li>El sistema verifica si tiene credenciales asignadas.</li>
                    <li>Si no tiene, toma la <strong>Global API Key</strong> de la configuración de la plataforma.</li>
                    <li>Genera un nombre de instancia único (<code>ktracker_{company_id}</code>).</li>
                    <li>Crea la instancia en el servidor de Evolution API.</li>
                    <li>Muestra el código QR para escanear.</li>
                </ol>
            </div>
        `
    }
];

export default function AdminDocumentation() {
    const [selectedTopicId, setSelectedTopicId] = useState<string>(DOCUMENTATION_TOPICS[0].id);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const selectedTopic = DOCUMENTATION_TOPICS.find(t => t.id === selectedTopicId) || DOCUMENTATION_TOPICS[0];

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manual de Operaciones</h1>
                    <p className="text-gray-500">Documentación y procesos internos de la plataforma.</p>
                </div>

                {/* Mobile sidebar toggle */}
                <button
                    className="md:hidden p-2 bg-white rounded-lg border border-gray-200"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    <Menu className="w-5 h-5" />
                </button>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden relative">
                {/* Sidebar */}
                <div className={`
                    w-64 bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden
                    absolute md:relative z-20 h-full transition-transform duration-300
                    ${isSidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full md:translate-x-0'}
                `}>
                    <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Temas
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {DOCUMENTATION_TOPICS.map(topic => (
                            <button
                                key={topic.id}
                                onClick={() => {
                                    setSelectedTopicId(topic.id);
                                    setIsSidebarOpen(false);
                                }}
                                className={`
                                    w-full text-left px-4 py-3 rounded-lg text-sm mb-1 flex items-center justify-between group transition-colors
                                    ${selectedTopicId === topic.id
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                `}
                            >
                                {topic.title}
                                {selectedTopicId === topic.id && (
                                    <ChevronRight className="w-4 h-4 text-blue-500" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <Card className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto p-8">
                            {/* Render HTML Content */}
                            <div
                                className="prose prose-blue max-w-none prose-headings:font-bold prose-h2:text-gray-900 prose-p:text-gray-600 text-gray-600"
                                dangerouslySetInnerHTML={{ __html: selectedTopic.content }}
                            />
                        </div>
                    </Card>
                </div>

                {/* Overlay for mobile sidebar */}
                {isSidebarOpen && (
                    <div
                        className="absolute inset-0 bg-black/20 z-10 md:hidden backdrop-blur-sm"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </div>
        </div>
    );
}
