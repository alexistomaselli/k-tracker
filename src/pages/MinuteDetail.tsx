import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Plus, Trash2, Save, X, ChevronDown, Eye, Building2, CheckCircle, AlertCircle, MoreHorizontal, FileSpreadsheet } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Chip from '../components/ui/Chip';
import Avatar from '../components/ui/Avatar';
import { useMinutes, useProjects, useTasks, useParticipants, useAreas, useTaskActions, useParticipantActions, useProjectResources, useMinuteActions, useAgenda, useAgendaActions, useAttendance, useAttendanceActions, useMinuteRoutines } from '../hooks/useData';
import { Task } from '../hooks/useMockData';
import TaskModal from '../components/tasks/TaskModal';
import MinuteModal from '../components/minutes/MinuteModal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import SearchableSelect from '../components/ui/SearchableSelect';
import RoutineObservationEditor from '../components/minutes/RoutineObservationEditor';


import { useToast } from '../context/ToastContext';
import XLSX from 'xlsx-js-style';

interface NewTask extends Partial<Task> {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed';
}

export default function MinuteDetail() {
  const { minuteId } = useParams<{ minuteId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditMinuteModal, setShowEditMinuteModal] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(true);
  const [newAgendaItem, setNewAgendaItem] = useState({ description: '', notes: '' });

  const { getMinuteById, reloadMinutes } = useMinutes();
  const { getProjectById } = useProjects();
  const { agendaItems, reloadAgenda } = useAgenda(minuteId!);
  const { createAgendaItem, deleteAgendaItem } = useAgendaActions();
  const { attendance, reloadAttendance } = useAttendance(minuteId!);
  const { getTasksByMinute, reloadTasks } = useTasks();
  const { participants, getParticipantById, reloadParticipants } = useParticipants();
  const { areas } = useAreas();
  const { createTask, deleteTask } = useTaskActions();
  const { updateParticipant } = useParticipantActions();
  const { updateMinute, dissociatePendingTasks, associateTasksToMinute, countPendingTasks, deleteMinute } = useMinuteActions();

  const { markAttendance } = useAttendanceActions();
  const { getMinuteRoutines, upsertMinuteRoutineStatus } = useMinuteRoutines();

  const [minuteRoutines, setMinuteRoutines] = useState<any[]>([]);
  const [isRoutinesExpanded, setIsRoutinesExpanded] = useState(true);

  // Load routines
  useEffect(() => {
    if (minuteId) {
      getMinuteRoutines(minuteId).then(({ data }) => setMinuteRoutines(data));
    }
  }, [minuteId]);

  const handleRoutineStatusChange = async (routineId: string, status: string) => {
    // routineId here might be the routine definition ID or the minute_routine ID.
    // In our merged data, `id` is either the minute_routine ID or `temp_${routine_id}`.
    // But we need the actual routine_id from the project_routines table to upsert.

    // Let's find the routine object in state to get the real IDs
    const routineObj = minuteRoutines.find(r => r.id === routineId);
    if (!routineObj) return;

    const realRoutineId = routineObj.routine_id; // This comes from the merged object structure

    await upsertMinuteRoutineStatus(minuteId!, realRoutineId, status, routineObj.notes);

    // Optimistic update
    setMinuteRoutines(minuteRoutines.map(r => r.id === routineId ? { ...r, status } : r));
  };

  const handleRoutineNotesChange = async (routineId: string, notes: string) => {
    const routineObj = minuteRoutines.find(r => r.id === routineId);
    if (!routineObj) return;

    const realRoutineId = routineObj.routine_id;

    // We debounce this in a real app, but for now direct update
    await upsertMinuteRoutineStatus(minuteId!, realRoutineId, routineObj.status, notes);
    setMinuteRoutines(minuteRoutines.map(r => r.id === routineId ? { ...r, notes } : r));
  };

  const [newTasks, setNewTasks] = useState<NewTask[]>([]);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);


  const minute = getMinuteById(minuteId!);
  const project = minute ? getProjectById(minute.project_id) : null;
  const { resources: projectResources } = useProjectResources(minute?.project_id || '');
  const tasks = getTasksByMinute(minuteId!);
  const isLocked = minute?.status === 'in_progress' || minute?.status === 'final';

  useEffect(() => {
    if (minute?.project_id) {
      countPendingTasks(minute.project_id).then(setPendingTasksCount);
    }
  }, [minute?.project_id]);

  const handleImportPendingTasks = async () => {
    if (!minute) return;
    const supabase = (await import('../lib/supabase')).getSupabase();
    if (supabase) {
      const { data: pendingTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', minute.project_id)
        .is('minute_id', null)
        .in('status', ['pending', 'in_progress']);

      if (pendingTasks && pendingTasks.length > 0) {
        const taskIds = pendingTasks.map(t => t.id);
        await associateTasksToMinute(minuteId!, taskIds);
        toast.success(`${taskIds.length} tareas pendientes vinculadas`);
        await reloadTasks();
        setPendingTasksCount(0);
      } else {
        toast.info('No hay tareas pendientes para vincular');
      }
    }
  };

  const handleTaskSuccess = async () => {
    await reloadTasks();
    setShowTaskModal(false);
    setTaskToEdit(null);
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setShowTaskModal(true);
  };

  const handleCreateTask = () => {
    setTaskToEdit(null);
    setShowTaskModal(true);
  };

  const handleAddAgendaItem = async () => {
    if (!newAgendaItem.description.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }
    try {
      await createAgendaItem(minuteId!, newAgendaItem.description, agendaItems.length + 1, newAgendaItem.notes);
      setNewAgendaItem({ description: '', notes: '' });
      reloadAgenda();
      toast.success('Item agregado a la agenda');
    } catch (error) {
      console.error('Error adding agenda item:', error);
      toast.error('Error al agregar item');
    }
  };

  const handleDeleteAgendaItem = async (id: string) => {
    if (!confirm('¿Eliminar este item de la agenda?')) return;
    try {
      await deleteAgendaItem(id);
      reloadAgenda();
      toast.success('Item eliminado');
    } catch (error) {
      console.error('Error deleting agenda item:', error);
      toast.error('Error al eliminar item');
    }
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

  const handleUpdateNewTask = (index: number, field: string, value: string) => {
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
      if (currentAssigneeId) {
        const participant = getParticipantById(currentAssigneeId);

        if (participant && !participant.area_id) {
          updateParticipant(currentAssigneeId, { area_id: value })
            .then(() => {
              reloadParticipants();
            })
            .catch(err => console.error('Error updating participant area:', err));
        }
      }
    }

    setNewTasks(updated);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!minute) return;

    // Validation: Cannot set to 'in_progress' if tasks are incomplete
    if (newStatus === 'in_progress') {
      const incompleteTasks = tasks.filter(t => !t.assignee_id || !t.due_date);
      const incompleteNewTasks = newTasks.filter(t => !t.assignee_id || !t.due_date);

      if (incompleteTasks.length > 0 || incompleteNewTasks.length > 0) {
        toast.error('No se puede poner el acta "En Curso" porque hay tareas sin responsable o fecha de vencimiento.');
        return;
      }
    }

    try {
      await updateMinute(minute.id, { status: newStatus as 'draft' | 'in_progress' | 'final' });
      window.location.reload();
    } catch (error) {
      console.error('Error updating minute status:', error);
      toast.error('Error al actualizar el estado del acta');
    }
  };

  // Filter participants: Only show those assigned to the project
  const projectParticipants = projectResources.sort((a, b) => {
    return a.first_name.localeCompare(b.first_name);
  });

  const handleExportExcel = () => {
    if (!minute || !project) return;

    // Define styles
    const titleStyle = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: "center" }
    };

    const headerLabelStyle = {
      font: { bold: true, color: { rgb: "444444" } }
    };

    const sectionHeaderStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0A4D8C" } }, // Blue background
      alignment: { horizontal: "left" },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      }
    };

    const tableHeaderStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "EEEEEE" } }, // Light gray
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      }
    };

    const cellStyle = {
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      },
      alignment: { wrapText: true, vertical: "top" }
    };

    const wb = XLSX.utils.book_new();


    // Helper to add a row with styles
    // We can't use simple AOA for styles easily with mix types, so we'll build cell objects
    // But xlsx-js-style allows treating the sheet as a collection of cells. 
    // It's easier to create the AOA first, then apply styles to the range.

    // However, simplest way with xlsx-js-style is to create cell objects directly

    let currentRow = 0;
    const ws: any = { '!ref': 'A1:E100', '!cols': [] }; // Init

    const addCell = (r: number, c: number, val: any, style: any = {}) => {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      ws[cellAddress] = { v: val, t: typeof val === 'number' ? 'n' : 's', s: style };
    };

    const mergeCells = (s_r: number, s_c: number, e_r: number, e_c: number) => {
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: s_r, c: s_c }, e: { r: e_r, c: e_c } });
    };

    // --- Title ---
    addCell(currentRow, 0, `ACTA DE REUNIÓN #${minute.minute_number}`, titleStyle);
    mergeCells(currentRow, 0, currentRow, 4); // Merge A-E
    currentRow += 2;

    // --- Info Header ---
    const infoFields = [
      ['Proyecto:', project.name],
      ['Fecha:', minute.meeting_date],
      ['Horario:', `${minute.start_time} - ${minute.end_time}`],
      ['Lugar:', minute.location || 'No especificado'],
      ['Estado:', minute.status === 'final' ? 'Finalizada' : minute.status === 'in_progress' ? 'En Curso' : 'Borrador']
    ];

    infoFields.forEach(([label, value]) => {
      addCell(currentRow, 0, label, headerLabelStyle);
      addCell(currentRow, 1, value, { alignment: { wrapText: true } });
      // Merge values across B-E for cleaner look if needed, but B is wide enough usually.
      mergeCells(currentRow, 1, currentRow, 4);
      currentRow++;
    });
    currentRow++;

    // --- SECTION GENERATOR ---
    const addSection = (title: string, headers: string[], dataRows: any[][]) => {
      // Section Title
      addCell(currentRow, 0, title, sectionHeaderStyle);
      // Fill the rest of the row with the style for visual consistency (optional, but looks better if merged)
      mergeCells(currentRow, 0, currentRow, headers.length - 1 > 0 ? headers.length - 1 : 4);
      currentRow++;

      // Table Headers
      headers.forEach((h, i) => {
        addCell(currentRow, i, h, tableHeaderStyle);
      });
      currentRow++;

      // Data
      if (dataRows.length === 0) {
        addCell(currentRow, 0, 'No hay registros', cellStyle);
        mergeCells(currentRow, 0, currentRow, headers.length - 1);
        currentRow++;
      } else {
        dataRows.forEach(row => {
          row.forEach((val, i) => {
            addCell(currentRow, i, val, cellStyle);
          });
          currentRow++;
        });
      }
      currentRow++; // Spacer
    };

    // 1. AGENDA
    const agendaRows = agendaItems.map((item, idx) => [
      idx + 1,
      item.description,
      item.notes || '-'
    ]);
    addSection('1. AGENDA DEL DÍA', ['N°', 'Tema', 'Notas'], agendaRows);

    // 2. ASISTENCIA
    const attendanceRows = participants.map(p => {
      const att = attendance.find(a => a.participant_id === p.id);
      const status = att?.status === 'present' ? 'Presente' : 'Ausente';
      return [`${p.first_name} ${p.last_name}`, p.role || '-', status];
    });
    addSection('2. ASISTENCIA', ['Nombre', 'Rol', 'Estado'], attendanceRows);

    // 3. RUTINAS
    const routineRows = minuteRoutines.map(r => {
      let statusLabel = 'Pendiente';
      if (r.status === 'completed') statusLabel = 'Cumplido';
      if (r.status === 'not_completed') statusLabel = 'No Cumplido';
      if (r.status === 'partial') statusLabel = 'Parcial';

      const freq = r.routine?.frequency === 'daily' ? 'Diaria' : r.routine?.frequency === 'weekly' ? 'Semanal' : 'Mensual';
      return [r.routine?.description || '', freq, statusLabel, r.notes || '-'];
    });
    addSection('3. SEGUIMIENTO DE RUTINAS', ['Rutina', 'Frecuencia', 'Estado', 'Observaciones'], routineRows);

    // 4. TAREAS
    const taskRows = tasks.map(t => {
      const assignee = getParticipantById(t.assignee_id);
      const assigneeName = assignee ? `${assignee.first_name} ${assignee.last_name}` : '-';
      const date = t.due_date ? new Date(t.due_date).toLocaleDateString() : '-';

      let statusLabel = 'Pendiente';
      if (t.status === 'in_progress') statusLabel = 'En Curso';
      if (t.status === 'completed') statusLabel = 'Completada';

      // Prio Translation
      const prioMap: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' };

      return [t.description, assigneeName, date, prioMap[t.priority] || t.priority, statusLabel];
    });
    addSection('4. ACUERDOS Y TAREAS', ['Descripción', 'Responsable', 'Vencimiento', 'Prioridad', 'Estado'], taskRows);

    // Set Range
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow, c: 4 } });

    // Set Column Widths
    ws['!cols'] = [
      { wch: 40 }, // A: Description/Name (Main content)
      { wch: 25 }, // B: Assignee/Role
      { wch: 20 }, // C: Date/Status
      { wch: 15 }, // D: Priority/Notes
      { wch: 15 }  // E: Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Acta");
    const fileName = `Acta_${minute.minute_number}_${project.name.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast.success('Acta exportada a Excel correctamente');
  };



  const [savingTasks, setSavingTasks] = useState(false);

  const handleSaveBatch = async () => {
    if (newTasks.length === 0) return;

    // Validate
    const valid = newTasks.every(t => t.description);
    if (!valid) {
      toast.error('Por favor completa la descripción para todas las tareas nuevas.');
      return;
    }

    setSavingTasks(true);
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
      toast.success('Tareas guardadas correctamente');
    } catch (error: unknown) {
      console.error('Error saving batch tasks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Intenta de nuevo';
      toast.error(`Error al guardar las tareas: ${errorMessage}`);
    } finally {
      setSavingTasks(false);
    }
  };

  if (!minute) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A4D8C] mb-4"></div>
        <p className="text-gray-500">Cargando acta...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/minutes" className="hover:text-[#0A4D8C]">Actas</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Acta #{minute.minute_number}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">

          {/* Header Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant={minute.status === 'final' ? 'completed' : minute.status === 'in_progress' ? 'in_progress' : 'pending'}>
                {minute.status === 'final' ? 'Finalizada' : minute.status === 'in_progress' ? 'En Curso' : 'Borrador'}
              </Badge>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {minute.meeting_date}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Acta de Reunión #{minute.minute_number}
            </h1>
            <p className="text-gray-600 text-lg">{project?.name}</p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap gap-3 pb-6 border-b border-gray-100">
            <div className="relative group">
              <select
                value={minute.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 hover:border-blue-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
              >
                <option value="draft">Borrador</option>
                <option value="in_progress">En Curso</option>
                <option value="final">Final</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="text-gray-700 border-gray-200 hover:bg-gray-50"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
              Exportar Excel
            </Button>

            {minute?.status !== 'final' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFinalizeDialog(true)}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Finalizar Acta
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditMinuteModal(true)}
            >
              Editar Detalles
            </Button>

            {minute?.status !== 'final' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Acta
              </Button>
            )}
          </div>

          {/* 1. Agenda */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs">1</span>
              Agenda del Día
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {agendaItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No hay items en la agenda
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {agendaItems.map((item, index) => (
                    <div key={item.id} className="p-4 flex justify-between items-start hover:bg-gray-50 transition-colors group">
                      <div className="flex gap-4">
                        <span className="font-medium text-gray-400 text-sm">{index + 1}.</span>
                        <div>
                          <p className="font-medium text-gray-900">{item.description}</p>
                          {item.notes && (
                            <p className="text-gray-500 text-sm mt-1">{item.notes}</p>
                          )}
                        </div>
                      </div>
                      {!isLocked && (
                        <button
                          onClick={() => handleDeleteAgendaItem(item.id)}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Eliminar item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Agenda Item Form */}
              {!isLocked && (
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Descripción del punto a tratar"
                        value={newAgendaItem.description}
                        onChange={(e) => setNewAgendaItem({ ...newAgendaItem, description: e.target.value })}
                        className="bg-white"
                      />
                      <Input
                        placeholder="Notas adicionales (opcional)"
                        value={newAgendaItem.notes}
                        onChange={(e) => setNewAgendaItem({ ...newAgendaItem, notes: e.target.value })}
                        className="bg-white text-sm"
                      />
                    </div>
                    <Button
                      variant="primary"
                      onClick={handleAddAgendaItem}
                      disabled={!newAgendaItem.description.trim()}
                      className="mt-0.5"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 2. Asistencia */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs">2</span>
                Asistencia
              </h2>
              <button
                onClick={() => setIsAttendanceExpanded(!isAttendanceExpanded)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                {isAttendanceExpanded ? 'Ocultar' : 'Mostrar'}
                <ChevronDown className={`w-4 h-4 transition-transform ${isAttendanceExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isAttendanceExpanded && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {participants.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No hay participantes registrados
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                    {participants.map((participant) => {
                      const att = attendance.find(a => a.participant_id === participant.id);
                      const status = att?.status || 'pending';

                      return (
                        <div key={participant.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-blue-200 transition-colors bg-gray-50/50">
                          <div className="flex items-center gap-3">
                            <Avatar name={`${participant.first_name} ${participant.last_name}`} size="sm" />
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{participant.first_name} {participant.last_name}</p>
                              <p className="text-xs text-gray-500">{participant.role || 'Participante'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={status === 'present'}
                                onChange={async (e) => {
                                  const newStatus = e.target.checked ? 'present' : 'absent';
                                  try {
                                    await markAttendance(minuteId!, participant.id, newStatus);
                                    await reloadAttendance();
                                    if (newStatus === 'present') {
                                      toast.success(`${participant.first_name} ${participant.last_name} registrado en asistencia`);
                                    }
                                  } catch (err) {
                                    console.error('Error:', err);
                                    toast.error('Error al actualizar asistencia');
                                  }
                                }}
                                className="w-5 h-5 text-[#0A4D8C] rounded focus:ring-[#0A4D8C] border-gray-300 cursor-pointer"
                              />
                            </div>
                            {status === 'present' && (
                              <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full animate-in fade-in duration-200">
                                Presente
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>



        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Detalles del Contexto</h3>
            </div>
            <div className="p-4 space-y-4">
              <Link to={`/projects/${project?.id}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Proyecto</p>
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{project?.name}</p>
                </div>
              </Link>

              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Horario</p>
                  <p className="text-sm font-medium text-gray-900">{minute.start_time} - {minute.end_time}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Lugar</p>
                  <p className="text-sm font-medium text-gray-900">{minute.location || 'No especificado'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-[#0A4D8C] rounded-xl shadow-sm border border-[#0A4D8C] p-6 text-white">
            <h3 className="font-semibold text-sm mb-4">Progreso del Acta</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-bold">
                {tasks.length > 0
                  ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
                  : 0}
              </span>
              <span className="text-xl font-medium mb-1">%</span>
            </div>

            <div className="w-full bg-blue-800/50 rounded-full h-2 mb-4">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{
                  width: `${tasks.length > 0
                    ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
                    : 0}%`
                }}
              ></div>
            </div>

            <p className="text-xs text-blue-100">
              {tasks.filter(t => t.status === 'completed').length} de {tasks.length} tareas completadas
            </p>
          </div>
        </div>
      </div>

      {/* 3. Seguimiento de Rutinas */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs">3</span>
            Seguimiento de Rutinas
          </h2>
          <button
            onClick={() => setIsRoutinesExpanded(!isRoutinesExpanded)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            {isRoutinesExpanded ? 'Ocultar' : 'Mostrar'}
            <ChevronDown className={`w-4 h-4 transition-transform ${isRoutinesExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isRoutinesExpanded && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {minuteRoutines.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay rutinas asociadas a este proyecto
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Rutina</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {minuteRoutines.map((routine) => (
                      <tr key={routine.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{routine.routine?.description}</p>
                          <p className="text-xs text-gray-500 capitalize">{routine.routine?.frequency === 'daily' ? 'Diaria' : routine.routine?.frequency === 'weekly' ? 'Semanal' : 'Mensual'}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRoutineStatusChange(routine.id, 'completed')}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${routine.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                              Cumplido
                            </button>
                            <button
                              onClick={() => handleRoutineStatusChange(routine.id, 'not_completed')}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${routine.status === 'not_completed' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                              No Cumplido
                            </button>
                            <button
                              onClick={() => handleRoutineStatusChange(routine.id, 'partial')}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${routine.status === 'partial' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                              Parcial
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <RoutineObservationEditor
                            initialNotes={routine.notes || ''}
                            onSave={(notes) => handleRoutineNotesChange(routine.id, notes)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. Acuerdos y Tareas */}
      <section className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs">4</span>
            Acuerdos y Tareas
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={async () => {
              const supabase = (await import('../lib/supabase')).getSupabase()
              if (supabase) {
                // Fetch pending tasks that are not associated with any minute
                const { data: pendingTasks } = await supabase
                  .from('tasks')
                  .select('id')
                  .eq('project_id', minute.project_id)
                  .is('minute_id', null)
                  .in('status', ['pending', 'in_progress']);

                if (pendingTasks && pendingTasks.length > 0) {
                  const taskIds = pendingTasks.map(t => t.id);
                  await associateTasksToMinute(minuteId!, taskIds);
                  toast.success(`${taskIds.length} tareas pendientes vinculadas`);
                  await reloadTasks();
                } else {
                  toast.info('No hay tareas pendientes para vincular');
                }
              }
            }}>
              Traer pendientes
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateTask}>
              <Plus className="w-4 h-4 mr-1" />
              Nueva Tarea
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {tasks.length === 0 && newTasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                <CheckCircle className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No hay tareas registradas</p>

              {pendingTasksCount > 0 ? (
                <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4 max-w-md mx-auto">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-blue-900 font-medium mb-1">
                        Hay {pendingTasksCount} tareas pendientes
                      </p>
                      <p className="text-blue-700 text-sm mb-3">
                        Existen tareas de actas anteriores que aún no se han completado. ¿Deseas importarlas a esta acta?
                      </p>
                      <Button variant="primary" size="sm" onClick={handleImportPendingTasks}>
                        Traer {pendingTasksCount} Pendientes
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm mt-1">Las tareas creadas aparecerán aquí</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Responsable</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vencimiento</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prioridad</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tasks.map((task) => {
                    const assignee = getParticipantById(task.assignee_id);
                    return (
                      <tr key={task.id} className="hover:bg-gray-50 group transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            to={`/tasks/${task.id}`}
                            className="text-gray-900 hover:text-[#0A4D8C] font-medium text-sm hover:underline block max-w-md truncate"
                          >
                            {task.description}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar name={`${assignee.first_name} ${assignee.last_name}`} size="sm" />
                              <span className="text-sm text-gray-600 truncate max-w-[120px]">
                                {assignee.first_name} {assignee.last_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <Chip priority={task.priority}>{task.priority}</Chip>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={task.status}>
                            {task.status === 'pending' ? 'Pendiente' : task.status === 'in_progress' ? 'En Curso' : 'Completada'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/tasks/${task.id}`}
                              className="text-gray-400 hover:text-[#0A4D8C] p-1.5 rounded-md hover:bg-blue-50"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleEditTask(task)}
                              className="text-gray-400 hover:text-[#0A4D8C] p-1.5 rounded-md hover:bg-blue-50"
                              title="Editar"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {!isLocked && (
                              <button
                                onClick={async () => {
                                  if (confirm('¿Eliminar esta tarea?')) {
                                    await deleteTask(task.id);
                                    reloadTasks();
                                  }
                                }}
                                className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50"
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
                          placeholder="Descripción de la tarea"
                          value={task.description}
                          onChange={(e) => handleUpdateNewTask(index, 'description', e.target.value)}
                          className="bg-white border-blue-200 focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <SearchableSelect
                          options={(projectParticipants || [])
                            .filter(p => projectResources.some(r => r.id === p.id))
                            .map(p => {
                              const area = areas?.find(a => a.id === p.area_id);
                              return {
                                value: p.id,
                                label: `${p.first_name} ${p.last_name}`,
                                description: p.title,
                                badge: area ? { text: area.name, color: area.color } : undefined
                              };
                            })}
                          value={task.assignee_id || ''}
                          onChange={(value) => handleUpdateNewTask(index, 'assignee_id', value)}
                          placeholder="Responsable"
                          className="w-full"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="date"
                          value={task.due_date || ''}
                          onChange={(e) => handleUpdateNewTask(index, 'due_date', e.target.value)}
                          className="bg-white border-blue-200"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Select
                          value={task.priority}
                          onChange={(e) => handleUpdateNewTask(index, 'priority', e.target.value)}
                          className="w-full border-blue-200"
                          options={[
                            { value: 'low', label: 'Baja' },
                            { value: 'medium', label: 'Media' },
                            { value: 'high', label: 'Alta' },
                            { value: 'critical', label: 'Crítica' }
                          ]}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Select
                          value={task.status}
                          onChange={(e) => handleUpdateNewTask(index, 'status', e.target.value)}
                          className="w-full border-blue-200"
                          options={[
                            { value: 'pending', label: 'Pendiente' },
                            { value: 'in_progress', label: 'En Curso' },
                            { value: 'completed', label: 'Completada' }
                          ]}
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => handleRemoveNewTask(index)}
                          className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-md"
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
              Agregar Fila Rápida
            </Button>

            {newTasks.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewTasks([])}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={savingTasks}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveBatch}
                  disabled={savingTasks}
                >
                  {savingTasks ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Nuevas Tareas
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

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

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-gray-900">Eliminar Acta</h3>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-gray-600">
                ¿Estás seguro de que deseas eliminar esta acta?
              </p>
              <p className="text-gray-600 text-sm bg-blue-50 p-3 rounded-md border border-blue-100">
                <span className="font-bold text-blue-800">Nota importante:</span> Las tareas asociadas a esta acta <strong>NO se eliminarán</strong>. Quedarán como tareas pendientes del proyecto y podrás agregarlas a una nueva acta.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700 border-red-600"
                onClick={async () => {
                  try {
                    await deleteMinute(minuteId!);
                    toast.success('Acta eliminada correctamente');
                    navigate('/minutes');
                  } catch (error) {
                    console.error('Error deleting minute:', error);
                    toast.error('Error al eliminar el acta');
                  }
                }}
              >
                Eliminar Definitivamente
              </Button>
            </div>
          </div>
        </div>
      )}

      {showFinalizeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-gray-900">Finalizar Acta</h3>
            </div>

            {(() => {
              const pendingTasksCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
              const newPendingCount = newTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
              const totalPending = pendingTasksCount + newPendingCount;

              if (totalPending > 0) {
                return (
                  <div className="space-y-3 mb-6">
                    <p className="text-gray-600">
                      Hay <span className="font-bold text-amber-600">{totalPending} tareas pendientes</span>.
                    </p>
                    <p className="text-gray-600 text-sm">
                      Estas tareas quedarán en el proyecto y podrán ser agregadas a la próxima acta utilizando la función "Traer pendientes".
                    </p>
                    <p className="text-gray-600 font-medium">
                      ¿Deseas finalizar el acta de todos modos?
                    </p>
                  </div>
                );
              }

              return (
                <p className="text-gray-600 mb-6">
                  ¿Estás seguro de finalizar el acta? Esto la marcará como definitiva y no se podrán agregar más tareas ni modificar la agenda.
                </p>
              );
            })()}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    const pendingTasksCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
                    const newPendingCount = newTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;

                    if (pendingTasksCount > 0 || newPendingCount > 0) {
                      await dissociatePendingTasks(minuteId!);
                    }

                    await handleStatusChange('final');
                    setShowFinalizeDialog(false);
                    toast.success('Acta finalizada correctamente');
                  } catch (error) {
                    console.error('Error finalizing minute:', error);
                    toast.error('Error al finalizar el acta');
                  }
                }}
              >
                Confirmar Finalización
              </Button>
            </div>
          </div>
        </div>
      )}

      {showTaskModal && (
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          taskToEdit={taskToEdit}
          minuteId={minuteId}
          projectId={minute?.project_id || ''}
          onSuccess={handleTaskSuccess}
        />
      )}
    </div>
  );
}
