import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, Plus, Trash2, Save, X, ChevronDown, Eye } from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import Avatar from '../components/ui/Avatar';
import { useMinutes, useProjects, useTasks, useParticipants, useAreas, useTaskActions, useParticipantActions, useProjectResources, useMinuteActions, useAgenda, useAttendance, useAttendanceActions } from '../hooks/useData';
import TaskModal from '../components/tasks/TaskModal';
import MinuteModal from '../components/minutes/MinuteModal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import SearchableSelect from '../components/ui/SearchableSelect';

export default function MinuteDetail() {
  const { minuteId } = useParams<{ minuteId: string }>();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditMinuteModal, setShowEditMinuteModal] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(null);
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(true);

  const { getMinuteById, reloadMinutes } = useMinutes();
  const { getProjectById } = useProjects();
  const { agendaItems } = useAgenda(minuteId!);
  const { attendance, reloadAttendance } = useAttendance(minuteId!);
  const { getTasksByMinute, reloadTasks } = useTasks();
  const { participants, getParticipantById, reloadParticipants } = useParticipants();
  const { areas } = useAreas();
  const { createTask, deleteTask } = useTaskActions();
  const { updateParticipant } = useParticipantActions();
  const { updateMinute } = useMinuteActions();
  const { markAttendance } = useAttendanceActions();

  const [newTasks, setNewTasks] = useState<any[]>([]);


  const minute = getMinuteById(minuteId!);
  const project = minute ? getProjectById(minute.project_id) : null;
  const { resources } = useProjectResources(project?.id || '');
  const tasks = getTasksByMinute(minuteId!);

  const handleTaskSuccess = async () => {
    await reloadTasks();
    setShowTaskModal(false);
    setTaskToEdit(null);
  };

  const handleEditTask = (task: any) => {
    setTaskToEdit(task);
    setShowTaskModal(true);
  };

  const handleCreateTask = () => {
    setTaskToEdit(null);
    setShowTaskModal(true);
  };

  const handleAddRow = () => {
    setNewTasks([
      ...newTasks,
      {
        id: `temp-${Date.now()}`,
        description: '',
        area_id: '',
        assignee_id: '',
        priority: 'medium',
        status: 'pending',
        due_date: ''
      }
    ]);
  };

  const handleRemoveNewTask = (index: number) => {
    const updated = [...newTasks];
    updated.splice(index, 1);
    setNewTasks(updated);
  };

  const handleUpdateNewTask = (index: number, field: string, value: any) => {
    const updated = [...newTasks];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-populate area if assignee changes
    if (field === 'assignee_id') {
      const participant = getParticipantById(value);
      if (participant?.area_id) {
        updated[index].area_id = participant.area_id;
      } else {
        updated[index].area_id = '';
      }
    }

    // If area is manually selected for a participant without area, update the participant
    if (field === 'area_id' && value) {
      const currentAssigneeId = updated[index].assignee_id;
      const participant = getParticipantById(currentAssigneeId);

      if (participant && !participant.area_id) {
        // Optimistically update the participant in the local state (optional, but good for UX)
        // In a real app, we might want to show a confirmation or toast
        // For now, we'll just trigger the update
        updateParticipant(currentAssigneeId, { area_id: value })
          .then(() => {
            reloadParticipants(); // Reload to reflect the change globally
          })
          .catch(err => console.error('Error updating participant area:', err));
      }
    }

    setNewTasks(updated);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!minute) return;
    try {
      await updateMinute(minute.id, { status: newStatus });
      // Ideally reload minute here, but useMinutes should handle subscription/refresh
      window.location.reload(); // Force reload for now to ensure UI updates
    } catch (error) {
      console.error('Error updating minute status:', error);
      alert('Error al actualizar el estado del acta');
    }
  };

  const isLocked = minute?.status === 'in_progress' || minute?.status === 'final';

  // Sort participants: Project resources first, then others
  const sortedParticipants = [...participants].sort((a, b) => {
    const aIsResource = resources.some(r => r.id === a.id);
    const bIsResource = resources.some(r => r.id === b.id);
    if (aIsResource && !bIsResource) return -1;
    if (!aIsResource && bIsResource) return 1;
    return a.first_name.localeCompare(b.first_name);
  });

  const handleSaveBatch = async () => {
    if (newTasks.length === 0) return;

    // Validate
    const valid = newTasks.every(t => t.description);
    if (!valid) {
      alert('Por favor completa la descripción para todas las tareas nuevas.');
      return;
    }

    try {
      for (const task of newTasks) {
        await createTask({
          project_id: minute?.project_id || '',
          description: task.description,
          assignee_id: task.assignee_id || undefined,
          area_id: task.area_id || undefined,
          priority: task.priority,
          status: task.status,
          due_date: task.due_date || undefined,
          minute_id: minuteId
        });
      }
      await reloadTasks();
      setNewTasks([]);
    } catch (error) {
      console.error('Error saving batch tasks:', error);
      alert('Error al guardar las tareas. Por favor intenta de nuevo.');
    }
  };

  // Combined view render
  if (!minute) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Acta no encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div>
        <Link to="/minutes" className="inline-flex items-center text-[#0A4D8C] hover:underline mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver a Actas
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Acta #{minute.minute_number}
              </h1>
              <div className="flex items-center gap-2">
                <select
                  value={minute.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 ${minute.status === 'final'
                    ? 'bg-green-100 text-green-800 focus:ring-green-500'
                    : minute.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800 focus:ring-blue-500'
                      : 'bg-gray-100 text-gray-800 focus:ring-gray-500'
                    }`}
                >
                  <option value="draft">Borrador</option>
                  <option value="in_progress">En Curso</option>
                  <option value="final">Final</option>
                </select>
              </div>
            </div>
            <p className="text-gray-600">{project?.name}</p>
          </div>
          <div className="flex gap-2">
            {minute?.status !== 'final' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowFinalizeDialog(true)}
              >
                Finalizar Acta
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditMinuteModal(true)}
            >
              Editar Acta
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Minute Modal */}
      {minute && (
        <MinuteModal
          isOpen={showEditMinuteModal}
          onClose={() => setShowEditMinuteModal(false)}
          projectId={minute.project_id}
          minuteToEdit={minute}
          onSuccess={() => {
            reloadMinutes();
            window.location.reload();
          }}
        />
      )}

      {/* Finalize Confirmation Dialog */}
      {
        showFinalizeDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Finalizar Acta</h3>
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de finalizar el acta? Esto la marcará como definitiva y no se podrán agregar más tareas.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    await handleStatusChange('final');
                    setShowFinalizeDialog(false);
                  }}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Info Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Fecha</p>
                <p className="font-medium">{minute.meeting_date}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Horario</p>
                <p className="font-medium">
                  {minute.start_time} - {minute.end_time}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Lugar</p>
                <p className="font-medium">{minute.location || 'No especificado'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <div className={`w-2 h-2 rounded-full ${minute.status === 'final' ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Estado</p>
                <p className="font-medium capitalize">{minute.status === 'in_progress' ? 'En Curso' : minute.status === 'final' ? 'Finalizada' : 'Borrador'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Agenda del Día */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Agenda del Día</h2>
        <Card>
          <CardContent className="p-0">
            {agendaItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay items en la agenda
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {agendaItems.map((item, index) => (
                  <div key={item.id} className="p-4 flex justify-between items-start hover:bg-gray-50">
                    <div className="flex gap-4">
                      <span className="font-medium text-gray-500 w-6">{index + 1}.</span>
                      <span className="font-medium text-gray-900">{item.description}</span>
                    </div>
                    {item.notes && (
                      <span className="text-gray-500 italic text-sm">{item.notes}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 2. Asistencia */}
      <section>
        <div
          className="flex items-center justify-between mb-4 cursor-pointer group"
          onClick={() => setIsAttendanceExpanded(!isAttendanceExpanded)}
        >
          <h2 className="text-xl font-bold text-gray-900">2. Asistencia</h2>
          <div className="flex items-center gap-2 text-gray-500 group-hover:text-gray-700">
            <span className="text-sm">
              {isAttendanceExpanded ? 'Ocultar' : 'Mostrar'}
            </span>
            <ChevronDown className={`w-5 h-5 transition-transform ${isAttendanceExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {isAttendanceExpanded && (
          <Card>
            <CardContent className="p-0">
              {participants.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No hay participantes registrados
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {participants.map((participant) => {
                    const att = attendance.find(a => a.participant_id === participant.id);
                    const status = att?.status || 'pending';

                    return (
                      <div key={participant.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-blue-200 transition-colors bg-white">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${participant.first_name} ${participant.last_name}`} />
                          <div>
                            <p className="font-medium text-gray-900">{participant.first_name} {participant.last_name}</p>
                            <p className="text-xs text-gray-500">{participant.role || 'Participante'}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await markAttendance(minuteId!, participant.id, 'present');
                                await reloadAttendance();
                              } catch (err) {
                                console.error('Error marking present:', err);
                                alert('Error al registrar asistencia');
                              }
                            }}
                            className={`p-1.5 rounded-full transition-colors ${status === 'present' ? 'bg-green-100 text-green-600' : 'text-gray-300 hover:bg-gray-100'}`}
                            title="Presente"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await markAttendance(minuteId!, participant.id, 'absent');
                                await reloadAttendance();
                              } catch (err) {
                                console.error('Error marking absent:', err);
                                alert('Error al registrar inasistencia');
                              }
                            }}
                            className={`p-1.5 rounded-full transition-colors ${status === 'absent' ? 'bg-red-100 text-red-600' : 'text-gray-300 hover:bg-gray-100'}`}
                            title="Ausente"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await markAttendance(minuteId!, participant.id, 'excused');
                                await reloadAttendance();
                              } catch (err) {
                                console.error('Error marking excused:', err);
                                alert('Error al registrar justificación');
                              }
                            }}
                            className={`p-1.5 rounded-full transition-colors ${status === 'excused' ? 'bg-yellow-100 text-yellow-600' : 'text-gray-300 hover:bg-gray-100'}`}
                            title="Justificado"
                          >
                            <div className="w-3 h-3 rounded-full border-2 border-current"></div>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      {/* 3. Acuerdos y Tareas */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">3. Acuerdos y Tareas</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={async () => {
              const supabase = (await import('../lib/supabase')).getSupabase()
              if (supabase) {
                await supabase.rpc('copy_tasks_to_new_minute', { new_minute_id: minuteId })
                await reloadTasks();
              }
            }}>
              Traer pendientes
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateTask}>
              Nueva Tarea
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {tasks.length === 0 && newTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay tareas registradas
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Responsable</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prioridad</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tasks.map((task) => {
                      const assignee = getParticipantById(task.assignee_id);
                      return (
                        <tr key={task.id} className="hover:bg-gray-50 group">
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <Link
                                to={`/tasks/${task.id}`}
                                className="text-gray-900 hover:text-[#0A4D8C] font-medium text-left hover:underline"
                              >
                                {task.description}
                              </Link>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {assignee ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                  {assignee.first_name} {assignee.last_name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {task.due_date ? task.due_date.split('-').reverse().join('-') : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <Chip priority={task.priority}>{task.priority}</Chip>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/tasks/${task.id}`}
                                className="text-gray-400 hover:text-[#0A4D8C] p-1"
                                title="Ver detalles"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleEditTask(task)}
                                className="text-gray-400 hover:text-[#0A4D8C] p-1"
                                title="Editar"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                              </button>
                              {!isLocked && (
                                <button
                                  onClick={async () => {
                                    if (confirm('¿Eliminar esta tarea?')) {
                                      await deleteTask(task.id);
                                      reloadTasks();
                                    }
                                  }}
                                  className="text-gray-400 hover:text-red-600 p-1"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Batch Creation Rows */}
                    {newTasks.map((task, index) => (
                      <tr key={task.id} className="bg-blue-50/30">
                        <td className="py-2 px-2">
                          <Input
                            placeholder="Descripción"
                            value={task.description}
                            onChange={(e) => handleUpdateNewTask(index, 'description', e.target.value)}
                            className="bg-white"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <SearchableSelect
                            options={(sortedParticipants || []).map(p => {
                              const area = areas?.find(a => a.id === p.area_id);
                              return {
                                value: p.id,
                                label: `${p.first_name} ${p.last_name}`,
                                description: p.title,
                                badge: area ? { text: area.name, color: area.color } : undefined
                              };
                            })}
                            value={task.assignee_id}
                            onChange={(value) => handleUpdateNewTask(index, 'assignee_id', value)}
                            placeholder="Responsable"
                            className="w-full"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="date"
                            value={task.due_date}
                            onChange={(e) => handleUpdateNewTask(index, 'due_date', e.target.value)}
                            className="bg-white"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Select
                            value={task.priority}
                            onChange={(e) => handleUpdateNewTask(index, 'priority', e.target.value)}
                            className="w-full"
                            options={[
                              { value: 'low', label: 'Baja' },
                              { value: 'medium', label: 'Media' },
                              { value: 'high', label: 'Alta' },
                              { value: 'critical', label: 'Crítica' }
                            ]}
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleRemoveNewTask(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="text-[#0A4D8C] border-[#0A4D8C] hover:bg-blue-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Fila
              </Button>

              {newTasks.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewTasks([])}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveBatch}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Nuevas Tareas
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {
        showTaskModal && (
          <TaskModal
            isOpen={showTaskModal}
            onClose={() => setShowTaskModal(false)}
            taskToEdit={taskToEdit}
            minuteId={minuteId}
            projectId={minute?.project_id}
            onSuccess={handleTaskSuccess}
          />
        )
      }
    </div >
  );
}
