import { Link } from 'react-router-dom';
import { Menu, User, LogOut, Sun, Moon } from 'lucide-react';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';

import NotificationCenter from '../notifications/NotificationCenter';

interface NavbarProps {
  isAuthenticated?: boolean;
  onMenuClick?: () => void;
  onLogout?: () => void;
  userLabel?: string;
}

export default function Navbar({ isAuthenticated = false, onMenuClick, onLogout, userLabel }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40" role="navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            {isAuthenticated && onMenuClick && (
              <button
                onClick={onMenuClick}
                className="mr-4 lg:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <Link to="/" className="flex items-center">
              <img src="/logo.png" alt="K-Tracker" className="h-14 w-auto" />
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Cambiar tema"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            )}

            {!isAuthenticated ? (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm">
                    Crear Cuenta
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <NotificationCenter />
                <Link to="/reset-password">
                  <button
                    className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-md transition-colors"
                    aria-label="Cambiar contraseña"
                    title="Cambiar contraseña"
                  >
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="hidden sm:inline text-sm text-gray-700 dark:text-gray-300">{userLabel || 'Usuario'}</span>
                  </button>
                </Link>
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-md transition-colors"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline text-sm">Salir</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
