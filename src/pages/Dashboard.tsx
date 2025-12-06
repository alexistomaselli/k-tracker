import { Link } from 'react-router-dom';
import { FolderKanban, FileText, AlertCircle, Plus } from 'lucide-react';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useCurrentUser, useDashboardStats } from '../hooks/useData';
import { isTaskOverdue, calculateDaysLeft } from '../hooks/useMockData';

export default function Dashboard() {
  const { participant: currentUserParticipant, isAdmin, company, loading: userLoading } = useCurrentUser();
  const { stats, loading: statsLoading } = useDashboardStats();

  if (userLoading || statsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // 1. Participant View (ONLY if NOT admin)
  if (currentUserParticipant && !isAdmin) {
    // State A: Password NOT changed - Show ONLY banner
    if (!currentUserParticipant.password_changed) {
      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bienvenido, {currentUserParticipant.first_name}</h1>
              {company?.name && (
                <p className="text-xl text-gray-600 font-medium mt-1">{company.name}</p>
              )}
              <p className="text-gray-600 mt-1">Por favor completa la configuración de tu cuenta.</p>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-blue-500 mr-4 flex-shrink-0" />
              <div>
                <p className="text-lg text-blue-700 font-bold">
                  ¿Aún no has configurado tu contraseña?
                </p>
                <p className="text-blue-600 mt-1">
                  Para acceder a tus tareas y proyectos, es necesario que establezcas una contraseña personal.
                </p>
              </div>
            </div>
            <Link to="/reset-password">
              <Button variant="primary" className="whitespace-nowrap">
                Configurar Contraseña
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    // State B: Password Changed - Show Participant Dashboard (My Tasks)
    const myTasks = stats.myTasks;
    const myPendingTasksCount = stats.myPendingTasksCount;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Tareas</h1>
            <p className="text-gray-600 mt-1">Bienvenido, {currentUserParticipant.first_name}. Aquí están tus asignaciones pendientes.</p>
            {company?.name && (
              <p className="text-sm text-gray-500 font-medium mt-1">Empresa: {company.name}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Mis Pendientes</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{myPendingTasksCount}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Lista de Tareas</h2>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tienes tareas asignadas por el momento.</p>
            ) : (
              <div className="space-y-3">
                {myTasks.map((task: any) => {
                  const daysLeft = calculateDaysLeft(task.due_date);
                  const isOverdue = isTaskOverdue(task);
                  return (
                    <Link
                      key={task.id}
                      to={`/tasks/${task.id}`}
                      className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{task.description}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {task.project?.name || 'Sin proyecto'}
                          </p>
                        </div>
                        {isOverdue ? (
                          <Badge variant="overdue">Vencida</Badge>
                        ) : daysLeft <= 2 && task.status !== 'completed' ? (
                          <Badge variant="active">Urgente</Badge>
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
    );
  }

  // 2. Admin View (Existing Dashboard)
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          {company?.name && (
            <p className="text-lg text-gray-700 font-medium">{company.name}</p>
          )}
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
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeProjects}</p>
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
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalMinutesCount}</p>
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
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingTasksCount}</p>
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
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.overdueTasksCount}</p>
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
            {stats.recentMinutes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay actas registradas</p>
            ) : (
              <div className="space-y-3">
                {stats.recentMinutes.map((minute: any) => {
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
                          <p className="text-sm text-gray-600">{minute.project?.name || 'Sin proyecto'}</p>
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
            {stats.urgentTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay tareas urgentes</p>
            ) : (
              <div className="space-y-3">
                {stats.urgentTasks.map((task: any) => {
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
                          <Badge variant="active">Urgente</Badge>
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
