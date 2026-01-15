import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, FileText, AlertCircle, Filter } from 'lucide-react';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useCurrentUser, useDashboardStats } from '../hooks/useData';
import { isTaskOverdue, calculateDaysLeft, calculateTrialDaysLeft } from '../hooks/useMockData';

import TourGuide from '../components/tour/TourGuide';

export default function Dashboard() {
  const { participant: currentUserParticipant, isAdmin, company, loading: userLoading } = useCurrentUser();
  const { stats, loading: statsLoading } = useDashboardStats();

  const [taskView, setTaskView] = useState<'kanban' | 'list'>('kanban');

  // Derive myTasks from stats safely
  const myTasks = stats?.myTasks || [];

  // Join tasks projects and myProjects to ensure all are available
  const uniqueProjects = useMemo(() => {
    const projectsMap = new Map();

    // First add projects from implicit tasks (just in case)
    if (myTasks && Array.isArray(myTasks)) {
      myTasks.forEach((task: any) => {
        if (task.project && task.project_id) {
          projectsMap.set(task.project_id, {
            id: task.project_id,
            name: task.project.name,
            ...task.project
          });
        }
      });
    }

    // Then add explicitly fetched My Projects (these are the important ones)
    if (stats && stats.myProjects && Array.isArray(stats.myProjects)) {
      stats.myProjects.forEach((project: any) => {
        projectsMap.set(project.id, project);
      });
    }

    return Array.from(projectsMap.values());
  }, [myTasks, stats]);

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Initialize selected projects when data loads
  useEffect(() => {
    if (uniqueProjects.length > 0 && selectedProjectIds.length === 0) {
      setSelectedProjectIds(uniqueProjects.map((p: any) => p.id));
    }
  }, [uniqueProjects.length]);

  const filteredTasks = useMemo(() => {
    return myTasks.filter((t: any) =>
      !t.project_id || selectedProjectIds.includes(t.project_id)
    );
  }, [myTasks, selectedProjectIds]);



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
    const myPendingTasksCount = stats.myPendingTasksCount;

    const tasksByStatus = {
      pending: filteredTasks.filter((t: any) => t.status === 'pending'),
      in_progress: filteredTasks.filter((t: any) => t.status === 'in_progress'),
      completed: filteredTasks.filter((t: any) => t.status === 'completed'),
      permanent: filteredTasks.filter((t: any) => t.status === 'permanent'),
    };

    const columnTitles: Record<string, string> = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Completado',
      permanent: 'Permanente',
    };

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


        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant={taskView === 'kanban' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTaskView('kanban')}
            >
              Kanban
            </Button>
            <Button
              variant={taskView === 'list' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTaskView('list')}
            >
              Lista
            </Button>
          </div>

          {taskView === 'kanban' && (
            <div className="relative group">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtrar por Proyecto
                {uniqueProjects.length > selectedProjectIds.length && (
                  <Badge variant="active" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                    {selectedProjectIds.length}
                  </Badge>
                )}
              </Button>

              <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg border border-gray-200 z-50 hidden group-hover:block transition-all">
                <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-900">
                    <input
                      type="checkbox"
                      className="rounded text-blue-600 focus:ring-blue-500"
                      checked={selectedProjectIds.length === uniqueProjects.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProjectIds(uniqueProjects.map(p => p.id));
                        } else {
                          setSelectedProjectIds([]);
                        }
                      }}
                    />
                    Todos los Proyectos
                  </label>
                  <span className="text-xs text-gray-500">
                    {selectedProjectIds.length} de {uniqueProjects.length}
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {uniqueProjects.map((project: any) => (
                    <div key={project.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 flex-1 truncate">
                        <input
                          type="checkbox"
                          className="rounded text-blue-600 focus:ring-blue-500"
                          checked={selectedProjectIds.includes(project.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProjectIds([...selectedProjectIds, project.id]);
                            } else {
                              setSelectedProjectIds(selectedProjectIds.filter(id => id !== project.id));
                            }
                          }}
                        />
                        <span className="truncate">{project.name}</span>
                      </label>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedProjectIds([project.id]);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-2"
                      >
                        Solo este
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {taskView === 'kanban' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
              <Card key={status} className="min-h-[300px] bg-gray-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 capitalize">
                      {columnTitles[status] || status}
                    </h3>
                    <span className="text-sm text-gray-500">{(statusTasks as any[]).length}</span>
                  </div>
                  <div className="space-y-3">
                    {(statusTasks as any[]).map((task) => {
                      const daysLeft = calculateDaysLeft(task.due_date);
                      const isOverdue = isTaskOverdue(task);

                      return (
                        <Link
                          key={task.id}
                          to={`/tasks/${task.id}`}
                          className="block p-3 bg-white border border-gray-200 rounded-md hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <div className="flex items-start gap-2 mb-2">
                            {/* If we had assignee avatar we could show it, but this is My Tasks so it's me */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                {task.description}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {task.project?.name || 'Sin proyecto'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                            {isOverdue ? (
                              <Badge variant="overdue">Vencida</Badge>
                            ) : daysLeft <= 2 && task.status !== 'completed' ? (
                              <Badge variant="active">Urgente</Badge>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-600">
                            <p>Vence: {task.due_date}</p>
                            {!isOverdue && status !== 'completed' && (
                              <p className="mt-1">
                                {daysLeft > 0 ? `${daysLeft} días` : 'Hoy'}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
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
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TourGuide />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 id="dashboard-title" className="text-3xl font-bold text-gray-900">Dashboard</h1>
          {company?.name && (
            <p className="text-lg text-gray-700 font-medium">{company.name}</p>
          )}
          <p className="text-gray-600 mt-1">Resumen de todos los proyectos y tareas</p>
          {company && company.created_at && (
            <div className="mt-2 inline-flex">
              {calculateTrialDaysLeft(company.created_at, company.trial_days) > 0 ? (
                <Badge variant={calculateTrialDaysLeft(company.created_at, company.trial_days) <= 3 ? 'active' : 'completed'}>
                  Trial: {calculateTrialDaysLeft(company.created_at, company.trial_days)} días restantes
                </Badge>
              ) : (
                <Badge variant="overdue">
                  Trial Vencido
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card id="active-projects-card">
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

        <Card id="recent-minutes-card">
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

        <Card id="pending-tasks-card">
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

        <Card id="overdue-tasks-card">
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
