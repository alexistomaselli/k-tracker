import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTour } from '../../hooks/useData';

const TOUR_KEY = 'dashboard_onboarding';

export default function TourGuide() {
    const { hasSeen, loading, markCompleted } = useTour(TOUR_KEY);

    useEffect(() => {
        if (loading || hasSeen) return;

        const driverObj = driver({
            showProgress: true,
            animate: true,
            doneBtnText: 'Entendido',
            nextBtnText: 'Siguiente',
            prevBtnText: 'Anterior',
            steps: [
                {
                    element: '#dashboard-title',
                    popover: {
                        title: 'Bienvenido al Panel de Empresa',
                        description: 'Este es tu centro de control con un resumen de tu actividad.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#nav-whatsapp',
                    popover: {
                        title: '1. Conexión a WhatsApp',
                        description: 'Configura tu WhatsApp para que tu equipo gestione tareas con tu bot.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#nav-areas',
                    popover: {
                        title: '2. Gestión de Áreas',
                        description: 'Gestiona las áreas para asignarlas a un responsable.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#nav-hr',
                    popover: {
                        title: '3. Recursos Humanos',
                        description: 'Gestiona tu equipo de trabajo para asignarles proyectos y tareas.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#nav-projects',
                    popover: {
                        title: '4. Proyectos',
                        description: 'Crea y administra tus proyectos de construcción.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#nav-minutes',
                    popover: {
                        title: '5. Crea Actas',
                        description: 'Dentro de los proyectos, genera actas para documentar compromisos.',
                        side: 'right',
                        align: 'start'
                    }
                },

                {
                    element: '#nav-my-tasks',
                    popover: {
                        title: '6. Gestiona Tareas',
                        description: 'Dentro de las actas, gestiona y asigna tareas a los participantes.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#nav-my-tasks',
                    popover: {
                        title: '7. Comentarios',
                        description: 'Dentro de las tareas, añade comentarios para seguimiento detallado.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#nav-billing',
                    popover: {
                        title: '8. Suscripción y Pagos',
                        description: 'Notifica tus pagos de suscripción y gestiona tu plan.',
                        side: 'right',
                        align: 'start'
                    }
                },
            ],
            onDestroyStarted: () => {
                markCompleted();
                driverObj.destroy();
            },
        });

        driverObj.drive();
    }, [loading, hasSeen, markCompleted]);

    return null; // This component doesn't render anything visible
}

