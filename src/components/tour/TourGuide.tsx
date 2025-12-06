import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_KEY = 'k_tracker_tour_completed';

export default function TourGuide() {
    useEffect(() => {
        const hasSeenTour = localStorage.getItem(TOUR_KEY);

        if (!hasSeenTour) {
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
                            title: 'Bienvenido a K-Tracker',
                            description: 'Este es tu panel de control principal. Aquí verás un resumen de tu actividad.',
                            side: 'bottom',
                            align: 'start'
                        }
                    },
                    {
                        element: '#nav-projects',
                        popover: {
                            title: 'Crear Proyecto',
                            description: 'Gestiona tus obras y proyectos. Crea nuevos proyectos y asigna responsables.',
                            side: 'right',
                            align: 'start'
                        }
                    },
                    {
                        element: '#nav-areas',
                        popover: {
                            title: 'Crear Rutinas',
                            description: 'Define las áreas de trabajo y rutinas para estandarizar tus procesos.',
                            side: 'right',
                            align: 'start'
                        }
                    },
                    {
                        element: '#nav-hr',
                        popover: {
                            title: 'Gestión de Recursos Humanos',
                            description: 'Administra tu personal, roles y permisos dentro de la plataforma.',
                            side: 'right',
                            align: 'start'
                        }
                    },
                    {
                        element: '#nav-minutes',
                        popover: {
                            title: 'Crear Actas',
                            description: 'Genera actas de reunión profesionales y compártelas con tu equipo.',
                            side: 'right',
                            align: 'start'
                        }
                    },
                    {
                        element: '#nav-my-tasks',
                        popover: {
                            title: 'Crear Tareas',
                            description: 'Asigna tareas, establece fechas límite y da seguimiento al progreso.',
                            side: 'right',
                            align: 'start'
                        }
                    },
                    {
                        element: '#active-projects-card',
                        popover: {
                            title: 'Resumen de Proyectos',
                            description: 'Visualiza rápidamente cuántos proyectos tienes activos.',
                            side: 'bottom',
                            align: 'start'
                        }
                    },
                    {
                        element: '#recent-minutes-card',
                        popover: {
                            title: 'Actas Recientes',
                            description: 'Accede rápidamente al historial de tus últimas actas generadas.',
                            side: 'bottom',
                            align: 'start'
                        }
                    },
                    {
                        element: '#pending-tasks-card',
                        popover: {
                            title: 'Tareas Pendientes',
                            description: 'Mantén el control de todas las tareas que aún no se han completado.',
                            side: 'bottom',
                            align: 'start'
                        }
                    },
                    {
                        element: '#overdue-tasks-card',
                        popover: {
                            title: 'Tareas Vencidas',
                            description: 'Identifica las tareas críticas que requieren atención inmediata.',
                            side: 'bottom',
                            align: 'start'
                        }
                    },
                ],
                onDestroyStarted: () => {
                    localStorage.setItem(TOUR_KEY, 'true');
                    driverObj.destroy();
                },
            });

            driverObj.drive();
        }
    }, []);

    return null; // This component doesn't render anything visible
}
