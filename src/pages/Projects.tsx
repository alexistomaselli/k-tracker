import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SearchInput from '../components/ui/SearchInput';
import Select from '../components/ui/Select';
import { useMockProjects } from '../hooks/useMockData';

export default function Projects() {
  const { projects, loading } = useMockProjects();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Activo',
      completed: 'Completado',
      on_hold: 'En Espera',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando proyectos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-gray-600 mt-1">Gestiona tus proyectos de construcción</p>
        </div>
        <Button variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Proyecto
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <SearchInput
                placeholder="Buscar proyectos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              options={[
                { value: 'all', label: 'Todos los Estados' },
                { value: 'active', label: 'Activos' },
                { value: 'completed', label: 'Completados' },
                { value: 'on_hold', label: 'En Espera' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="sm:w-48"
            />
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron proyectos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="block"
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {project.name}
                          </h3>
                          <p className="text-sm text-gray-600">{project.code}</p>
                        </div>
                        <Badge variant={project.status === 'active' ? 'active' : 'pending'}>
                          {getStatusLabel(project.status)}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Inicio:</span>
                          <span className="font-medium">{project.start_date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fin estimado:</span>
                          <span className="font-medium">{project.estimated_end_date}</span>
                        </div>
                        {project.budget && (
                          <div className="flex justify-between">
                            <span>Presupuesto:</span>
                            <span className="font-medium">
                              ${project.budget.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
