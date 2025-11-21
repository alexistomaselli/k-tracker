import { Link } from 'react-router-dom';
import { Menu, User, LogOut } from 'lucide-react';
import Button from '../ui/Button';

interface NavbarProps {
  isAuthenticated?: boolean;
  onMenuClick?: () => void;
}

export default function Navbar({ isAuthenticated = false, onMenuClick }: NavbarProps) {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40" role="navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            {isAuthenticated && onMenuClick && (
              <button
                onClick={onMenuClick}
                className="mr-4 lg:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
            )}
            <Link to="/" className="flex items-center">
              <div className="w-8 h-8 bg-[#0A4D8C] rounded-md flex items-center justify-center mr-2">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <span className="text-xl font-bold text-[#0A4D8C]">K-Tracker</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
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
                <button
                  className="flex items-center space-x-2 hover:bg-gray-100 px-3 py-2 rounded-md"
                  aria-label="Perfil de usuario"
                >
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="hidden sm:inline text-sm text-gray-700">Usuario</span>
                </button>
                <button
                  className="flex items-center space-x-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-md"
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
