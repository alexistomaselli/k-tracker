import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SearchInput from '../components/ui/SearchInput';
import Select from '../components/ui/Select';
import { useMinutes, useProjects, useTasks } from '../hooks/useData';

export default function Minutes() {
  const { minutes, loading } = useMinutes();
  const { getProjectById } = useProjects();
  const { getTasksByMinute } = useTasks();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredMinutes = minutes.filter((minute) => {
    const project = getProjectById(minute.project_id);
    const matchesSearch =
      minute.minute_number.toLowerCase().includes(search.toLowerCase()) ||
      project?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || minute.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando actas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Actas de Reunión</h1>
          <p className="text-gray-600 mt-1">Gestiona las actas semanales de tus proyectos</p>
        </div>
        <Button variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Acta
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <SearchInput
                placeholder="Buscar actas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              options={[
                { value: 'all', label: 'Todos los Estados' },
                { value: 'draft', label: 'Borrador' },
                { value: 'final', label: 'Final' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="sm:w-48"
            />
          </div>

          {filteredMinutes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron actas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Número</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Proyecto</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Ubicación</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Tareas</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMinutes.map((minute) => {
                    const project = getProjectById(minute.project_id);
                    const tasks = getTasksByMinute(minute.id);
                    const pendingCount = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
                    return (
                      <tr key={minute.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">Acta #{minute.minute_number}</td>
                        <td className="py-3 px-4">{project?.name}</td>
                        <td className="py-3 px-4">{minute.meeting_date}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{minute.location}</td>
                        <td className="py-3 px-4">
                          <Badge variant={minute.status === 'final' ? 'completed' : 'draft'}>
                            {minute.status === 'final' ? 'Final' : 'Borrador'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{pendingCount}</span>
                          <span className="text-gray-500">/{tasks.length}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Link to={`/minutes/${minute.id}`}>
                            <Button variant="outline" size="sm">
                              Ver Detalle
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
