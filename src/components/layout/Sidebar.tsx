import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, FileText, CheckSquare, LogOut, Layers, Users, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderOpen, label: 'Proyectos' },
    { to: '/minutes', icon: FileText, label: 'Actas' },
    { to: '/my-tasks', icon: CheckSquare, label: 'Mis Tareas' },
    { to: '/areas', icon: Layers, label: 'Áreas' },
    { to: '/hr', icon: Users, label: 'Recursos Humanos' },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-gray-200 transition-transform duration-300 z-50 lg:z-0 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } w-64`}
        role="complementary"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
            <span className="text-lg font-semibold text-gray-900">Menú</span>
            <button onClick={onClose} aria-label="Cerrar menú">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${isActive
                    ? 'bg-[#0A4D8C] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
                onClick={() => onClose()}
              >
                <link.icon className="w-5 h-5" />
                <span className="font-medium">{link.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p className="font-semibold">Constructora del Sur</p>
              <p>Plan Profesional</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
