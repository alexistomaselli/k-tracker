import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <img src="/kai-pro-logo.webp" alt="K-Tracker" className="h-16 w-auto" />
            </div>
            <p className="text-sm text-gray-600">
              Gestión inteligente de actas y tareas para empresas de construcción e ingeniería.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Producto</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-gray-600 hover:text-[#0A4D8C]">
                  Características
                </Link>
              </li>
              <li>
                <Link to="/" className="text-sm text-gray-600 hover:text-[#0A4D8C]">
                  Precios
                </Link>
              </li>
              <li>
                <Link to="/" className="text-sm text-gray-600 hover:text-[#0A4D8C]">
                  Casos de Uso
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Empresa</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-gray-600 hover:text-[#0A4D8C]">
                  Acerca de
                </Link>
              </li>
              <li>
                <Link to="/" className="text-sm text-gray-600 hover:text-[#0A4D8C]">
                  Contacto
                </Link>
              </li>
              <li>
                <Link to="/" className="text-sm text-gray-600 hover:text-[#0A4D8C]">
                  Soporte
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            © 2025 K-Tracker. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
