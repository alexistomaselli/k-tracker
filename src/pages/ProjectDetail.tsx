import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, DollarSign, Plus } from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Chip from '../components/ui/Chip';
import Avatar from '../components/ui/Avatar';
import { isTaskOverdue, calculateDaysLeft } from '../hooks/useMockData';
import { useProjects, useTasks, useMinutes, useParticipants, useAreas, useMinuteActions } from '../hooks/useData';
import CreateMinuteModal from '../components/minutes/CreateMinuteModal';
import TaskCarryoverDialog from '../components/minutes/TaskCarryoverDialog';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'tasks' | 'minutes' | 'responsables'>('tasks');
  const [taskView, setTaskView] = useState<'kanban' | 'list'>('kanban');
  const [showCreateMinute, setShowCreateMinute] = useState(false);
  const [showCarryoverDialog, setShowCarryoverDialog] = useState(false);
  const [newMinuteId, setNewMinuteId] = useState<string | null>(null);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  const { getProjectById, loading: projectsLoading, error: projectsError } = useProjects();
  const { getTasksByProject, loading: tasksLoading, error: tasksError } = useTasks();
  const { getMinutesByProject, loading: minutesLoading, error: minutesError } = useMinutes();
  const { participants, getParticipantById, loading: participantsLoading, error: participantsError } = useParticipants();
  const { getAreaById, error: areasError } = useAreas();
  const { countPendingTasks, copyTasksToMinute } = useMinuteActions();

  const project = getProjectById(projectId!);
  const tasks = getTasksByProject(projectId!);
  const minutes = getMinutesByProject(projectId!);

  const isLoading = projectsLoading || tasksLoading || minutesLoading || participantsLoading;
  const error = projectsError || tasksError || minutesError || participantsError || areasError;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error al cargar datos del proyecto: {error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cargando datos del proyecto...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Proyecto no encontrado</p>
      </div>
    );
  }

  const tasksByStatus = {
    pending: tasks.filter((t) => t.status === 'pending'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
    canceled: tasks.filter((t) => t.status === 'canceled'),
    permanent: tasks.filter((t) => t.status === 'permanent'),
  };

  const handleMinuteCreated = async (minuteId: string) => {
    setNewMinuteId(minuteId);
    setShowCreateMinute(false);

    // Verificar tareas pendientes
    const count = await countPendingTasks(projectId!);

    if (count > 0) {
      setPendingTasksCount(count);
      setShowCarryoverDialog(true);
    } else {
      // No hay tareas pendientes, ir directo al detalle
      navigate(`/minutes/${minuteId}`);
    }
  };

  const handleConfirmCarryover = async () => {
    if (newMinuteId) {
      await copyTasksToMinute(newMinuteId);
      setShowCarryoverDialog(false);
      navigate(`/minutes/${newMinuteId}`);
    }
  };

  const handleSkipCarryover = () => {
    if (newMinuteId) {
      setShowCarryoverDialog(false);
      navigate(`/minutes/${newMinuteId}`);
    }
  };

  const tabs = [
    { id: 'tasks', label: 'Tareas' },
    { id: 'minutes', label: 'Actas' },
    { id: 'responsables', label: 'Responsables' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/projects" className="inline-flex items-center text-[#0A4D8C] hover:underline mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver a Proyectos
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <Badge variant={project.status === 'active' ? 'active' : 'pending'}>
                {project.status}
              </Badge>
            </div>
            <p className="text-gray-600">{project.code}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              {project.start_date}
            </Button>
            {project.budget && (
              <Button variant="outline" size="sm">
                <DollarSign className="w-4 h-4 mr-2" />
                ${project.budget.toLocaleString()}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${activeTab === tab.id
                ? 'border-[#0A4D8C] text-[#0A4D8C]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'tasks' && (
        <div className="space-y-4">
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
            <Button variant="primary" size="sm">
              Nueva Tarea
            </Button>
          </div>

          {taskView === 'kanban' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
                <Card key={status} className="min-h-[300px]">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {status.replace('_', ' ')}
                      </h3>
                      <span className="text-sm text-gray-500">{statusTasks.length}</span>
                    </div>
                    <div className="space-y-3">
                      {statusTasks.map((task) => {
                        const assignee = getParticipantById(task.assignee_id);
                        const area = getAreaById(task.area_id);
                        const daysLeft = calculateDaysLeft(task.due_date);
                        const isOverdue = isTaskOverdue(task);
                        return (
                          <Link
                            key={task.id}
                            to={`/tasks/${task.id}`}
                            className="block p-3 bg-white border border-gray-200 rounded-md hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start gap-2 mb-2">
                              {assignee && (
                                <Avatar
                                  name={`${assignee.first_name} ${assignee.last_name}`}
                                  size="sm"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                  {task.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <Chip priority={task.priority} className="text-xs">
                                {task.priority}
                              </Chip>
                              {isOverdue && <Badge variant="overdue">Vencida</Badge>}
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <p>Vence: {task.due_date}</p>
                              {!isOverdue && status !== 'completed' && (
                                <p>
                                  {daysLeft > 0 ? `${daysLeft} días` : 'Hoy'}
                                </p>
                              )}
                              {area && (
                                <p className="font-medium" style={{ color: area.color }}>
                                  {area.name}
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
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Tarea</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Responsable</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Área</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Prioridad</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Vencimiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => {
                        const assignee = getParticipantById(task.assignee_id);
                        const area = getAreaById(task.area_id);
                        const isOverdue = isTaskOverdue(task);
                        return (
                          <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <Link
                                to={`/tasks/${task.id}`}
                                className="text-[#0A4D8C] hover:underline font-medium"
                              >
                                {task.description}
                              </Link>
                            </td>
                            <td className="py-3 px-4">
                              {assignee && (
                                <div className="flex items-center gap-2">
                                  <Avatar
                                    name={`${assignee.first_name} ${assignee.last_name}`}
                                    size="sm"
                                  />
                                  <span className="text-sm">
                                    {assignee.first_name} {assignee.last_name}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {area && (
                                <span className="text-sm font-medium" style={{ color: area.color }}>
                                  {area.name}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Chip priority={task.priority}>{task.priority}</Chip>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={task.status}>{task.status}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{task.due_date}</span>
                                {isOverdue && <Badge variant="overdue">Vencida</Badge>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'minutes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => setShowCreateMinute(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Acta
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4">
              {minutes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No hay actas registradas para este proyecto</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Número</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Tareas</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {minutes.map((minute) => {
                        const minuteTasks = tasks.filter((t) => t.minute_id === minute.id);
                        return (
                          <tr key={minute.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">Acta #{minute.minute_number}</td>
                            <td className="py-3 px-4">{minute.meeting_date}</td>
                            <td className="py-3 px-4">
                              <Badge variant={minute.status === 'final' ? 'completed' : 'draft'}>
                                {minute.status === 'final' ? 'Final' : 'Borrador'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">{minuteTasks.length}</td>
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

          <CreateMinuteModal
            isOpen={showCreateMinute}
            onClose={() => setShowCreateMinute(false)}
            projectId={projectId!}
            projectCode={project?.code || ''}
            onSuccess={handleMinuteCreated}
          />

          <TaskCarryoverDialog
            isOpen={showCarryoverDialog}
            pendingTasksCount={pendingTasksCount}
            onConfirm={handleConfirmCarryover}
            onSkip={handleSkipCarryover}
          />
        </div>
      )}

      {activeTab === 'responsables' && (
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Cargo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Teléfono</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant) => (
                    <tr key={participant.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={`${participant.first_name} ${participant.last_name}`}
                            size="sm"
                          />
                          <span className="font-medium">
                            {participant.title} {participant.first_name} {participant.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{participant.role}</td>
                      <td className="py-3 px-4">{participant.email}</td>
                      <td className="py-3 px-4">{participant.phone}</td>
                      <td className="py-3 px-4">
                        <Badge variant={participant.active ? 'active' : 'canceled'}>
                          {participant.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
