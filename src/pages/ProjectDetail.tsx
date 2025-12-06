import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, DollarSign, Plus, Search, Filter, ArrowUp, ArrowDown } from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Chip from '../components/ui/Chip';
import Avatar from '../components/ui/Avatar';
import { isTaskOverdue, calculateDaysLeft, Task, Participant } from '../hooks/useMockData';
import CreateMinuteModal from '../components/minutes/CreateMinuteModal';

import TaskModal from '../components/tasks/TaskModal';
import ParticipantModal from '../components/hr/ParticipantModal';
import CreateRoutineModal from '../components/routines/CreateRoutineModal';
import { useProjects, useTasks, useMinutes, useParticipants, useAreas, useProjectResources, useParticipantActions, useProjectRoutines, useCurrentUser } from '../hooks/useData';

import SearchableSelect from '../components/ui/SearchableSelect';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useToast } from '../context/ToastContext';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'tasks' | 'minutes' | 'responsables' | 'routines'>('tasks');
  const [taskView, setTaskView] = useState<'kanban' | 'list'>('kanban');
  const [showCreateMinute, setShowCreateMinute] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const { getProjectById, loading: projectsLoading, error: projectsError } = useProjects();
  const { getTasksByProject, loading: tasksLoading, error: tasksError, reloadTasks } = useTasks();
  const { getMinutesByProject, loading: minutesLoading, error: minutesError } = useMinutes();
  const { participants, getParticipantById, loading: participantsLoading, error: participantsError, reloadParticipants } = useParticipants();
  const { getAreaById, error: areasError } = useAreas();
  const { resources, addResource, removeResource } = useProjectResources(projectId!);
  const { createParticipant } = useParticipantActions();
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [showCreateParticipantModal, setShowCreateParticipantModal] = useState(false);
  const [showCreateRoutineModal, setShowCreateRoutineModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [routineToDelete, setRoutineToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // List view filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { getRoutinesByProject, createRoutine, updateRoutine, deleteRoutine } = useProjectRoutines();
  const { company } = useCurrentUser();
  const toast = useToast();
  const [routines, setRoutines] = useState<any[]>([]);
  const [routineToEdit, setRoutineToEdit] = useState<any>(null);

  // Load routines
  useEffect(() => {
    if (projectId) {
      getRoutinesByProject(projectId).then(({ data }) => setRoutines(data));
    }
  }, [projectId]);

  const handleSaveRoutine = async (routineData: any) => {
    if (routineData.id) {
      // Update
      const { data, error } = await updateRoutine(routineData.id, routineData);
      if (error) throw error;
      if (data) {
        setRoutines(routines.map(r => r.id === data.id ? data : r));
      }
    } else {
      // Create
      const { data, error } = await createRoutine(routineData);
      if (error) throw error;
      if (data) {
        setRoutines([...routines, data]);
      }
    }
    setRoutineToEdit(null);
  };

  const handleEditRoutine = (routine: any) => {
    setRoutineToEdit(routine);
    setShowCreateRoutineModal(true);
  };

  const handleDeleteRoutine = (id: string) => {
    setRoutineToDelete(id);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteRoutine = async () => {
    if (!routineToDelete) return;

    setIsDeleting(true);
    try {
      await deleteRoutine(routineToDelete);
      setRoutines(routines.filter(r => r.id !== routineToDelete));
      toast.success('Rutina eliminada correctamente');
      setShowDeleteConfirmation(false);
      setRoutineToDelete(null);
    } catch (error) {
      console.error('Error deleting routine:', error);
      toast.error('Error al eliminar la rutina');
    } finally {
      setIsDeleting(false);
    }
  };

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
    permanent: [
      ...tasks.filter((t) => t.status === 'permanent'),
      ...routines.map((r): any => ({
        id: r.id,
        company_id: r.company_id,
        project_id: r.project_id,
        minute_id: '',
        type: 'task',
        description: r.description,
        assignee_id: r.assignee_id || '',
        due_date: r.frequency, // Using frequency as due_date for routines
        priority: 'medium',
        status: 'permanent',
        area_id: '', // Could try to find area from assignee if needed
        isRoutine: true, // Flag to identify routines
      }))
    ],
  };

  const columnTitles: Record<string, string> = {
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    completed: 'Completado',
    canceled: 'Cancelado',
    permanent: 'Permanente',
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      daily: 'Diaria',
      weekly: 'Semanal',
      monthly: 'Mensual',
      event: 'Por Evento',
    };
    return labels[freq] || freq;
  };

  const handleMinuteCreated = async (minuteId: string) => {
    setShowCreateMinute(false);
    navigate(`/minutes/${minuteId}`);
  };





  const handleEditTask = (task: Task) => {
    // If it's a routine (identified by isRoutine flag we added), open routine modal
    if ((task as any).isRoutine) {
      const routine = routines.find(r => r.id === task.id);
      if (routine) {
        handleEditRoutine(routine);
      }
      return;
    }
    setTaskToEdit(task);
    setShowTaskModal(true);
  };

  const handleTaskSuccess = async () => {
    await reloadTasks();
    setShowTaskModal(false);
    setTaskToEdit(null);
    setTaskToEdit(null);
  };

  const handleCreateParticipant = async (participantData: Partial<Participant>) => {
    try {
      if (!participantData.first_name || !participantData.last_name || !participantData.email) return;

      const result = await createParticipant({
        ...participantData,
        first_name: participantData.first_name!,
        last_name: participantData.last_name!,
        email: participantData.email!,
        area_id: participantData.area_id || undefined
      });
      if (result && result.participant) {
        await reloadParticipants(); // Reload list to include new participant
        await addResource(result.participant.id); // Auto-add to project
        setShowCreateParticipantModal(false);
      }
    } catch (error) {
      console.error('Error creating participant:', error);
      alert('Error al crear participante');
    }
  };

  const isSetupMode = resources.length === 0;

  // Force active tab to 'responsables' if in setup mode
  if (isSetupMode && activeTab !== 'responsables') {
    setActiveTab('responsables');
  }

  const tabs = [
    { id: 'tasks', label: 'Tareas', disabled: isSetupMode },
    { id: 'minutes', label: 'Actas', disabled: isSetupMode },
    { id: 'routines', label: 'Rutinas', disabled: isSetupMode },
    { id: 'responsables', label: 'Responsables', disabled: false },
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
              onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
              disabled={tab.disabled}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${activeTab === tab.id
                ? 'border-[#0A4D8C] text-[#0A4D8C]'
                : tab.disabled
                  ? 'border-transparent text-gray-300 cursor-not-allowed'
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

          </div>

          {taskView === 'kanban' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
                <Card key={status} className="min-h-[300px]">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {columnTitles[status] || status}
                      </h3>
                      <span className="text-sm text-gray-500">{statusTasks.length}</span>
                    </div>
                    <div className="space-y-3">
                      {statusTasks.map((task) => {
                        const assignee = getParticipantById(task.assignee_id);
                        // Try to get area from task first, then from assignee if not present (for routines)
                        const area = getAreaById(task.area_id) || (assignee?.area_id ? getAreaById(assignee.area_id) : undefined);
                        const isRoutine = (task as any).isRoutine;
                        const taskMinute = minutes.find(m => m.id === task.minute_id);

                        let daysLeft = 0;
                        let isOverdue = false;

                        if (!isRoutine) {
                          daysLeft = calculateDaysLeft(task.due_date);
                          isOverdue = isTaskOverdue(task);
                        }

                        return (
                          <div
                            key={task.id}
                            onClick={() => handleEditTask(task)}
                            className="block p-3 bg-white border border-gray-200 rounded-md hover:shadow-md transition-shadow cursor-pointer"
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
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                              <Chip priority={task.priority} className="text-xs">
                                {task.priority}
                              </Chip>
                              {isOverdue && <Badge variant="overdue">Vencida</Badge>}
                              {isRoutine && <Badge variant="secondary" className="text-xs">Rutina</Badge>}
                              {taskMinute ? (
                                <Badge variant="secondary" className="text-xs">Acta #{taskMinute.minute_number}</Badge>
                              ) : (
                                !isRoutine && <span className="text-xs text-gray-400 italic">Sin Acta</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              {isRoutine ? (
                                <p>Frecuencia: {getFrequencyLabel(task.due_date)}</p>
                              ) : (
                                <p>Vence: {task.due_date}</p>
                              )}

                              {!isRoutine && !isOverdue && status !== 'completed' && (
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
                          </div>
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
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar tareas..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D8C] focus:border-transparent"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <select
                        className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D8C] appearance-none bg-white"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="all">Todos los estados</option>
                        <option value="pending">Pendiente</option>
                        <option value="in_progress">En Progreso</option>
                        <option value="completed">Completado</option>
                        <option value="canceled">Cancelado</option>
                        <option value="permanent">Permanente</option>
                      </select>
                    </div>
                    <select
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D8C] bg-white"
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                    >
                      <option value="all">Todas las prioridades</option>
                      <option value="high">Alta</option>
                      <option value="medium">Media</option>
                      <option value="low">Baja</option>
                    </select>
                    <Button
                      variant="outline"
                      onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                      title={`Ordenar por fecha ${sortDirection === 'asc' ? 'ascendente' : 'descendente'}`}
                      className="min-w-[40px] px-0 flex items-center justify-center"
                    >
                      {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Tarea</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Acta</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Responsable</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Área</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Prioridad</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Vencimiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(tasksByStatus).flat()
                        .filter(task => {
                          const matchesSearch = task.description.toLowerCase().includes(searchQuery.toLowerCase());
                          const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
                          const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
                          return matchesSearch && matchesStatus && matchesPriority;
                        })
                        .sort((a, b) => {
                          const dateA = new Date(a.due_date).getTime();
                          const dateB = new Date(b.due_date).getTime();

                          // Handle routines (invalid dates) - put them at the end
                          if (isNaN(dateA) && isNaN(dateB)) return 0;
                          if (isNaN(dateA)) return 1;
                          if (isNaN(dateB)) return -1;

                          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
                        })
                        .map((task) => {
                          const assignee = getParticipantById(task.assignee_id);
                          const area = getAreaById(task.area_id) || (assignee?.area_id ? getAreaById(assignee.area_id) : undefined);
                          const isRoutine = (task as any).isRoutine;
                          const isOverdue = !isRoutine && isTaskOverdue(task);
                          const taskMinute = minutes.find(m => m.id === task.minute_id);

                          return (
                            <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <span
                                  onClick={() => handleEditTask(task)}
                                  className="text-[#0A4D8C] hover:underline font-medium cursor-pointer"
                                >
                                  {task.description}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {taskMinute ? (
                                  <span className="text-sm font-medium text-gray-600">
                                    #{taskMinute.minute_number}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">Sin Acta</span>
                                )}
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
                                <Badge variant={task.status}>{columnTitles[task.status] || task.status}</Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {isRoutine ? (
                                    <span className="text-sm">{getFrequencyLabel(task.due_date)}</span>
                                  ) : (
                                    <span className="text-sm">{task.due_date}</span>
                                  )}
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
              onClick={() => {
                setShowCreateMinute(true);
              }}
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





          <TaskModal
            isOpen={showTaskModal}
            onClose={() => setShowTaskModal(false)}
            projectId={projectId!}
            taskToEdit={taskToEdit}
            onSuccess={handleTaskSuccess}
          />
        </div>
      )}

      {activeTab === 'responsables' && (
        <Card>
          <CardContent className="pt-4">
            {isSetupMode && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Configuración Inicial del Proyecto</h3>
                  <p className="text-blue-700 text-sm mt-1">
                    Para comenzar a crear actas y tareas, primero debes asignar los participantes que formarán parte de este proyecto.
                    Agrega al menos una persona para habilitar las demás funciones.
                  </p>
                </div>
              </div>
            )}

            <div className="mb-6 flex gap-4 items-end">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agregar Recurso al Proyecto
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={participants
                        .filter(p => !resources.some(r => r.id === p.id))
                        .map(p => {
                          const area = getAreaById(p.area_id || '');
                          return {
                            value: p.id,
                            label: `${p.first_name} ${p.last_name}`,
                            description: p.title,
                            badge: area ? { text: area.name, color: area.color } : undefined
                          };
                        })}
                      value={selectedParticipantId}
                      onChange={setSelectedParticipantId}
                      placeholder="Buscar persona..."
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateParticipantModal(true)}
                    className="whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Nuevo
                  </Button>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  if (selectedParticipantId) {
                    addResource(selectedParticipantId);
                    setSelectedParticipantId('');
                  }
                }}
                disabled={!selectedParticipantId}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Cargo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Teléfono</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No hay recursos asignados a este proyecto.
                      </td>
                    </tr>
                  ) : (
                    resources.map((participant) => (
                      <tr key={participant.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={`${participant.first_name} ${participant.last_name}`}
                              size="sm"
                            />
                            <span className="font-medium">
                              {participant.first_name} {participant.last_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{participant.title}</td>
                        <td className="py-3 px-4">{participant.email}</td>
                        <td className="py-3 px-4">{participant.phone}</td>
                        <td className="py-3 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() => {
                              if (confirm('¿Quitar recurso del proyecto?')) {
                                removeResource(participant.id);
                              }
                            }}
                          >
                            Quitar
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ParticipantModal
        isOpen={showCreateParticipantModal}
        onClose={() => setShowCreateParticipantModal(false)}
        onConfirm={handleCreateParticipant}
      />

      {activeTab === 'routines' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => {
                setRoutineToEdit(null);
                setShowCreateRoutineModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Rutina
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4">
              {routines.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No hay rutinas definidas para este proyecto</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Descripción</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Frecuencia</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Responsable</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routines.map((routine) => {
                        const assignee = getParticipantById(routine.assignee_id || '');
                        return (
                          <tr key={routine.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{routine.description}</td>
                            <td className="py-3 px-4 capitalize">{routine.frequency === 'daily' ? 'Diaria' : routine.frequency === 'weekly' ? 'Semanal' : routine.frequency === 'monthly' ? 'Mensual' : 'Por Evento'}</td>
                            <td className="py-3 px-4">
                              {assignee ? `${assignee.first_name} ${assignee.last_name}` : '-'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditRoutine(routine)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  onClick={() => handleDeleteRoutine(routine.id)}
                                >
                                  Eliminar
                                </Button>
                              </div>
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

          <CreateRoutineModal
            isOpen={showCreateRoutineModal}
            onClose={() => {
              setShowCreateRoutineModal(false);
              setRoutineToEdit(null);
            }}
            projectId={projectId!}
            companyId={company?.id || ''}
            routineToEdit={routineToEdit}
            onSuccess={handleSaveRoutine}
          />

          <ConfirmationModal
            isOpen={showDeleteConfirmation}
            onClose={() => {
              setShowDeleteConfirmation(false);
              setRoutineToDelete(null);
            }}
            onConfirm={confirmDeleteRoutine}
            title="Eliminar Rutina"
            message="¿Estás seguro de que deseas eliminar esta rutina? Esta acción no se puede deshacer."
            confirmText="Eliminar"
            variant="danger"
            loading={isDeleting}
          />
        </div>
      )}
      <CreateMinuteModal
        isOpen={showCreateMinute}
        onClose={() => setShowCreateMinute(false)}
        projectId={projectId!}
        projectCode={project?.code || ''}
        onSuccess={handleMinuteCreated}
      />
    </div>
  );
}
