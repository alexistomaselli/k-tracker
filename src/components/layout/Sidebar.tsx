import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, FileText, CheckSquare, Layers, Users, User, X, CreditCard, MessageSquare } from 'lucide-react';

import { useCurrentUser } from '../../hooks/useData';
import { calculateTrialDaysLeft } from '../../hooks/useMockData';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { participant, isAdmin, loading, company, activePlan, planStatus } = useCurrentUser();

  const allLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderOpen, label: 'Proyectos' },
    { to: '/minutes', icon: FileText, label: 'Actas' },
    { to: '/my-tasks', icon: CheckSquare, label: 'Mis Tareas' },
    { to: '/areas', icon: Layers, label: 'Áreas' },
    { to: '/hr', icon: Users, label: 'Recursos Humanos' },
    { to: '/billing', icon: CreditCard, label: 'Facturación' },
    { to: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
    { to: '/my-account', icon: User, label: 'Mi Cuenta' },
  ];

  let links: typeof allLinks = [];

  if (!loading) {
    if (participant && !isAdmin) {
      // Participant view
      if (participant.password_changed) {
        links = [
          { to: '/dashboard', icon: LayoutDashboard, label: 'Mis Tareas' },
          { to: '/whatsapp-bot', icon: MessageSquare, label: 'Bot WhatsApp' },
          { to: '/my-account', icon: User, label: 'Mi Cuenta' },
        ];
      } else {
        // New participant (no password set) - Show NO links
        links = [];
      }
    } else {
      // Admin view (or default)
      links = allLinks;
    }
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 z-50 lg:z-0 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } w-64`}
        role="complementary"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 lg:hidden">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Menú</span>
            <button onClick={onClose} aria-label="Cerrar menú">
              <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            <div className="space-y-2">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  id={`nav-${link.to.replace('/', '')}`}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${isActive
                      ? 'bg-[#0A4D8C] dark:bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`
                  }
                  onClick={() => onClose()}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </NavLink>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate mb-2">
                  {company?.name || 'Sin Empresa'}
                </p>

                {/* Plan Status Display - Only for Admins */}
                {isAdmin && (
                  <>
                    {activePlan ? (
                      <div className="mt-3">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">
                          Plan Activo
                        </p>
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-md p-2 flex items-center justify-between">
                          <span className="font-bold text-blue-800 dark:text-blue-200 text-sm">
                            {activePlan.name}
                          </span>
                        </div>
                      </div>
                    ) : (
                      company?.created_at && (
                        <div className="mt-3">
                          {planStatus === 'expired' ? (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-md p-2 text-center">
                              <span className="font-bold text-red-600 dark:text-red-400 text-sm block mb-2">
                                Vencido
                              </span>
                              <NavLink
                                to="/select-plan"
                                className="block w-full py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors"
                              >
                                Renovar Plan
                              </NavLink>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-center text-xs mb-1.5">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">Prueba Gratuita</span>
                                <span className={`font-bold ${calculateTrialDaysLeft(company.created_at, company.trial_days) <= 3
                                  ? 'text-red-600'
                                  : 'text-green-600'
                                  }`}>
                                  {calculateTrialDaysLeft(company.created_at, company.trial_days)} días
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-500 ${calculateTrialDaysLeft(company.created_at, company.trial_days) <= 3
                                    ? 'bg-red-500'
                                    : 'bg-green-500'
                                    }`}
                                  style={{
                                    width: `${Math.min(100, Math.max(5, (calculateTrialDaysLeft(company.created_at, company.trial_days) / (company.trial_days || 14)) * 100))}%`
                                  }}
                                ></div>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
