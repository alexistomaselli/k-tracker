import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, MessageSquare } from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Chip from '../components/ui/Chip';
import Select from '../components/ui/Select';
import {
  useMockTasks,
  useMockProjects,
  useMockAreas,
  isTaskOverdue,
  calculateDaysLeft,
} from '../hooks/useMockData';

export default function MyTasks() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('due_date');

  const { getTasksByAssignee } = useMockTasks();
  const { getProjectById } = useMockProjects();
  const { getAreaById } = useMockAreas();

  const myTasks = getTasksByAssignee('pa1');

  const filteredTasks = myTasks.filter((task) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'overdue') return isTaskOverdue(task);
    return task.status === statusFilter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'due_date') {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (sortBy === 'priority') {
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return 0;
  });

  const pendingCount = myTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
  const overdueCount = myTasks.filter(isTaskOverdue).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mis Tareas</h1>
        <p className="text-gray-600 mt-1">Gestiona todas tus tareas asignadas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Asignadas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{myTasks.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Vencidas</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{overdueCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select
              options={[
                { value: 'all', label: 'Todos los Estados' },
                { value: 'pending', label: 'Pendientes' },
                { value: 'in_progress', label: 'En Progreso' },
                { value: 'completed', label: 'Completadas' },
                { value: 'overdue', label: 'Vencidas' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="sm:w-48"
            />
            <Select
              options={[
                { value: 'due_date', label: 'Ordenar por Fecha' },
                { value: 'priority', label: 'Ordenar por Prioridad' },
              ]}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sm:w-48"
            />
          </div>

          {sortedTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron tareas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedTasks.map((task) => {
                const project = getProjectById(task.project_id);
                const area = getAreaById(task.area_id);
                const daysLeft = calculateDaysLeft(task.due_date);
                const overdue = isTaskOverdue(task);

                return (
                  <div
                    key={task.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <Link
                          to={`/tasks/${task.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-[#0A4D8C]"
                        >
                          {task.description}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant={task.status}>{task.status}</Badge>
                          <Chip priority={task.priority}>{task.priority}</Chip>
                          {overdue && <Badge variant="overdue">Vencida</Badge>}
                          {area && (
                            <span
                              className="text-xs font-medium px-2 py-1 rounded"
                              style={{ backgroundColor: `${area.color}20`, color: area.color }}
                            >
                              {area.name}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <strong>Proyecto:</strong> {project?.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <strong>Vence:</strong> {task.due_date}
                          </span>
                          {!overdue && task.status !== 'completed' && (
                            <span className="flex items-center gap-1">
                              <strong>Quedan:</strong>{' '}
                              {daysLeft > 0 ? `${daysLeft} días` : 'Hoy'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col gap-2">
                        {task.status === 'pending' && (
                          <Button variant="secondary" size="sm">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            En Progreso
                          </Button>
                        )}
                        {task.status === 'in_progress' && (
                          <Button variant="primary" size="sm">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Completar
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Comentar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
