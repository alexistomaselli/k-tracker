import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SearchInput from '../components/ui/SearchInput';
import Select from '../components/ui/Select';
import { useMinutes, useProjects, useTasks } from '../hooks/useData';
import CreateMinuteModal from '../components/minutes/CreateMinuteModal';


export default function Minutes() {
  const { minutes, loading } = useMinutes();
  const { getProjectById, projects } = useProjects();
  const { getTasksByMinute } = useTasks();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showCreateMinute, setShowCreateMinute] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showProjectSelect, setShowProjectSelect] = useState(false);

  // Carryover state



  const navigate = useNavigate();

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setShowProjectSelect(false);
    setShowCreateMinute(true);
  };

  const handleMinuteCreated = async (minuteId: string) => {
    setShowCreateMinute(false);
    navigate(`/minutes/${minuteId}`);
  };



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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Actas de Reunión</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestiona las actas semanales de tus proyectos</p>
        </div>
        <Button variant="primary" onClick={() => setShowProjectSelect(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Acta
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-stretch gap-4 mb-6">
            <div className="w-full sm:flex-1 sm:min-w-[420px]">
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
              <p className="text-gray-500 dark:text-gray-400">No se encontraron actas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Número</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Proyecto</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Fecha</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Ubicación</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Estado</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Tareas</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredMinutes.map((minute) => {
                    const project = getProjectById(minute.project_id);
                    const tasks = getTasksByMinute(minute.id);
                    const completedCount = tasks.filter((t) => t.status === 'completed').length;
                    return (
                      <tr key={minute.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">Acta #{minute.minute_number}</td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{project?.name}</td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{minute.meeting_date}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{minute.location}</td>
                        <td className="py-3 px-4">
                          <Badge variant={minute.status === 'final' ? 'completed' : 'draft'}>
                            {minute.status === 'final' ? 'Final' : 'Borrador'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{completedCount}</span>
                            <span className="text-gray-500 dark:text-gray-400">/{tasks.length}</span>
                            {tasks.length > 0 && (
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${(completedCount / tasks.length) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
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

      {/* Project Selection Modal */}
      {showProjectSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Seleccionar Proyecto</h3>
            <p className="text-gray-600 mb-4">Selecciona el proyecto para el cual deseas crear el acta.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProjectSelect(p.id)}
                  className="w-full text-left px-4 py-3 rounded-md hover:bg-gray-50 border border-gray-200 flex justify-between items-center"
                >
                  <span className="font-medium text-gray-900">{p.name}</span>
                  <span className="text-sm text-gray-500">{p.code}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowProjectSelect(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Minute Modal */}
      {selectedProjectId && (
        <CreateMinuteModal
          isOpen={showCreateMinute}
          onClose={() => setShowCreateMinute(false)}
          projectId={selectedProjectId}
          projectCode={projects.find(p => p.id === selectedProjectId)?.code || ''}
          onSuccess={handleMinuteCreated}
        />
      )}


    </div>
  );
}
