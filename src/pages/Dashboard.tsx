import { Link } from 'react-router-dom';
import { FolderKanban, FileText, AlertCircle, Plus } from 'lucide-react';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useMockProjects, useMockMinutes, useMockTasks } from '../hooks/useMockData';
import { isTaskOverdue, calculateDaysLeft } from '../hooks/useMockData';

export default function Dashboard() {
  const { projects } = useMockProjects();
  const { minutes } = useMockMinutes();
  const { tasks } = useMockTasks();

  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const recentMinutes = minutes.slice(-5).reverse();
  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const overdueTasks = pendingTasks.filter(isTaskOverdue);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Resumen de tus proyectos y tareas</p>
        </div>
        <div className="flex gap-2">
          <Link to="/minutes">
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Acta
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Proyectos Activos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{activeProjects}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Actas Recientes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{minutes.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tareas Pendientes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{pendingTasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tareas Vencidas</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{overdueTasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Últimas Actas</h2>
          </CardHeader>
          <CardContent>
            {recentMinutes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay actas registradas</p>
            ) : (
              <div className="space-y-3">
                {recentMinutes.map((minute) => {
                  const project = projects.find((p) => p.id === minute.project_id);
                  return (
                    <Link
                      key={minute.id}
                      to={`/minutes/${minute.id}`}
                      className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">
                            Acta #{minute.minute_number}
                          </p>
                          <p className="text-sm text-gray-600">{project?.name}</p>
                        </div>
                        <Badge variant={minute.status === 'final' ? 'completed' : 'draft'}>
                          {minute.status === 'final' ? 'Final' : 'Borrador'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">{minute.meeting_date}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Tareas Urgentes</h2>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay tareas pendientes</p>
            ) : (
              <div className="space-y-3">
                {pendingTasks.slice(0, 5).map((task) => {
                  const daysLeft = calculateDaysLeft(task.due_date);
                  const isOverdue = isTaskOverdue(task);
                  return (
                    <Link
                      key={task.id}
                      to={`/tasks/${task.id}`}
                      className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-medium text-gray-900 flex-1">
                          {task.description}
                        </p>
                        {isOverdue ? (
                          <Badge variant="overdue">Vencida</Badge>
                        ) : daysLeft <= 2 ? (
                          <Badge variant="warning">Urgente</Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>Vence: {task.due_date}</span>
                        <Badge variant={task.status}>{task.status}</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
