
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, User, Building2, FileText, Link2, Paperclip, Clock, ChevronDown, MessageSquare, AlertCircle, RefreshCw, ArrowRight, Activity as ActivityIcon, X, Pencil } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Chip from '../components/ui/Chip';
import Avatar from '../components/ui/Avatar';
import { calculateDaysLeft, isTaskOverdue } from '../hooks/useMockData';
import { useTasks, useMinutes, useProjects, useTaskFeed, useTaskActions, useParticipants, useAreas } from '../hooks/useData';
import { Activity, Comment } from '../data/mockData';

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const [newComment, setNewComment] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { getTaskById } = useTasks();
  const { getProjectById } = useProjects();
  const { getMinuteById } = useMinutes();
  const { getParticipantById, participants } = useParticipants();
  const { getAreaById } = useAreas();
  const { feed, reloadFeed } = useTaskFeed(taskId!);
  const { setTaskStatus, reassignTask, setTaskPriority, addTaskComment, updateTask, uploadTaskAttachment } = useTaskActions();

  const task = getTaskById(taskId!);
  const project = task ? getProjectById(task.project_id) : null;
  const minute = task ? getMinuteById(task.minute_id) : null;
  const assignee = task ? getParticipantById(task.assignee_id) : null;
  const area = task ? getAreaById(task.area_id) : null;

  const daysLeft = task ? calculateDaysLeft(task.due_date) : 0;
  const overdue = task ? isTaskOverdue(task) : false;

  const [statusSel, setStatusSel] = useState<'pending' | 'in_progress' | 'completed' | 'canceled' | 'permanent'>(task?.status as any || 'pending');
  const [assigneeSel, setAssigneeSel] = useState(task?.assignee_id || '');
  const [prioritySel, setPrioritySel] = useState(task?.priority || 'medium');
  const [dueDateSel, setDueDateSel] = useState(task?.due_date ? task.due_date.split('T')[0] : '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionSel, setDescriptionSel] = useState(task?.description || '');

  // Update local state when task data loads
  useEffect(() => {
    if (task) {
      setStatusSel(task.status as any);
      setAssigneeSel(task.assignee_id || '');
      setPrioritySel(task.priority);
      setDueDateSel(task.due_date ? task.due_date.split('T')[0] : '');
      setDescriptionSel(task.description || '');
    }
  }, [task]);

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A4D8C] mb-4"></div>
        <p className="text-gray-500">Cargando tarea...</p>
      </div>
    );
  }

  const handleAddComment = async () => {
    let finalUrl = attachmentUrl;
    if (selectedFile) {
      try {
        const url = await uploadTaskAttachment(selectedFile);
        if (url) finalUrl = url;
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Error al subir el archivo');
        return;
      }
    }

    await addTaskComment(task.id, newComment, finalUrl || undefined);
    await reloadFeed();
    setNewComment('');
    setAttachmentUrl('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      status_changed: 'cambió el estado',
      priority_changed: 'cambió la prioridad',
      assignee_changed: 'reasignó la tarea',
      due_date_changed: 'cambió la fecha de vencimiento',
      comment_added: 'comentó',
      comment_edited: 'editó un comentario',
      comment_deleted: 'eliminó un comentario',
      description_changed: 'cambió la descripción',
    };
    return labels[type] || type;
  };

  const formatContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);

  const renderFeedItem = (item: Activity | Comment, _index: number, isLast: boolean) => {
    const isComment = 'content' in item;
    const user = participants.find(p => p.id === item.user_id || p.user_id === item.user_id);

    return (
      <div key={item.id} className="relative flex gap-3 sm:gap-4">
        {/* Timeline Line */}
        {!isLast && (
          <div className="absolute left-[19px] top-10 bottom-[-24px] w-0.5 bg-gray-200" />
        )}

        <div className="relative z-10">
          <Avatar name={`${user?.first_name || '?'} ${user?.last_name || '?'} `} size="md" className="border-2 border-white shadow-sm" />
        </div>

        <div className="flex-1 pb-6">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              {user ? `${user.first_name} ${user.last_name} ` : 'Usuario desconocido'}
              {isComment && <MessageSquare className="w-3.5 h-3.5 text-blue-500" />}
            </span>
            {!isComment && (
              <span className="text-sm text-gray-500">{getActivityLabel((item as Activity).type)}</span>
            )}
            <span className="text-xs text-gray-400 ml-auto">
              {new Date(item.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {isComment ? (
            <div className="bg-white border border-gray-200 rounded-lg rounded-tl-none p-3 sm:p-4 shadow-sm mt-1 overflow-hidden">
              <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">{formatContent((item as Comment).content)}</p>
              {(item as Comment).attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {(item as Comment).attachments.map((attachment, idx) => (
                    <div key={idx}>
                      {isImage(attachment.url) ? (
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block mt-2 group relative w-fit">
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="w-full sm:max-w-[240px] max-h-[240px] rounded-lg border border-gray-200 shadow-sm object-cover transition-transform group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Link2 className="w-6 h-6 text-white drop-shadow-md" />
                          </div>
                        </a>
                      ) : (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-[#0A4D8C] hover:underline group"
                        >
                          <div className="p-1.5 bg-blue-50 rounded text-blue-600 group-hover:bg-blue-100 transition-colors">
                            {attachment.type === 'file' ? <Paperclip className="w-3.5 h-3.5" /> :
                              <Link2 className="w-3.5 h-3.5" />}
                          </div>
                          {attachment.name}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1">
              {(item as Activity).type === 'status_changed' && (
                <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-md border border-gray-100 inline-flex">
                  <Badge variant={(item as Activity).payload.from}>{(item as Activity).payload.from}</Badge>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <Badge variant={(item as Activity).payload.to}>{(item as Activity).payload.to}</Badge>
                </div>
              )}
              {(item as Activity).type === 'priority_changed' && (
                <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-md border border-gray-100 inline-flex">
                  <Chip priority={(item as Activity).payload.from}>{(item as Activity).payload.from}</Chip>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <Chip priority={(item as Activity).payload.to}>{(item as Activity).payload.to}</Chip>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/projects" className="hover:text-[#0A4D8C]">Proyectos</Link>
        <span>/</span>
        <Link to={`/projects/${project?.id}`} className="hover:text-[#0A4D8C]">{project?.name || '...'}</Link>
        <span>/</span>
        <Link to={`/minutes/${minute?.id}`} className="hover:text-[#0A4D8C]">Acta #{minute?.minute_number || '...'}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-[200px]">Tarea</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Header Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex gap-2">
                <Badge variant={statusSel}>{statusSel === 'in_progress' ? 'En Progreso' : statusSel === 'pending' ? 'Pendiente' : statusSel === 'completed' ? 'Completada' : 'Cancelada'}</Badge>
                <Chip priority={task.priority}>{task.priority}</Chip>
              </div>
              <div className="text-sm text-gray-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{task.started_at ? `Iniciada el ${new Date(task.started_at).toLocaleDateString()}` : 'Sin fecha de inicio'}</span>
              </div>
            </div>

            {isEditingDescription ? (
              <div className="mb-6 space-y-3">
                <textarea
                  value={descriptionSel}
                  onChange={(e) => setDescriptionSel(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px] text-2xl sm:text-3xl font-bold text-gray-900 leading-tight resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingDescription(false);
                      setDescriptionSel(task.description || '');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await updateTask(task.id, { description: descriptionSel });
                      await new Promise(resolve => setTimeout(resolve, 500));
                      await reloadFeed();
                      setIsEditingDescription(false);
                    }}
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="group relative mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight pr-8">
                  {task.description}
                </h1>
                <button
                  onClick={() => setIsEditingDescription(true)}
                  className="absolute top-1 right-0 p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                  title="Editar descripción"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  {assignee ? (
                    <Avatar name={`${assignee.first_name} ${assignee.last_name}`} size="md" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Responsable</p>
                  <p className="text-sm font-medium text-gray-900">
                    {assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Sin asignar'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${overdue ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'}`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vencimiento</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dueDateSel}
                      disabled={minute?.status === 'in_progress'}
                      title={minute?.status === 'in_progress' ? 'No se puede cambiar la fecha porque el acta está en curso' : ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setDueDateSel(val);
                        await updateTask(task.id, { due_date: val });
                        await reloadFeed();
                      }}
                      className={`text-sm font-medium bg-transparent border-none p-0 focus:ring-0 cursor-pointer ${overdue ? 'text-red-600' : 'text-gray-900'} ${minute?.status === 'in_progress' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {overdue && <span className="text-xs text-red-500 font-normal">({daysLeft} días)</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 flex flex-wrap gap-2 items-center">
            <div className="relative group">
              <select
                value={statusSel}
                onChange={async (e) => {
                  const val = (e.target as HTMLSelectElement).value as any;
                  setStatusSel(val);
                  await setTaskStatus(task.id, val);
                  await reloadFeed();
                }}
                className="appearance-none pl-9 pr-8 py-2 bg-white border border-gray-200 hover:border-blue-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
              >
                <option value="pending">Pendiente</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completada</option>
                <option value="canceled">Cancelada</option>
              </select>
              <RefreshCw className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

            <div className="relative flex-1 min-w-[200px]">
              <select
                value={assigneeSel}
                onChange={async (e) => {
                  const val = (e.target as HTMLSelectElement).value;
                  setAssigneeSel(val);
                  await reassignTask(task.id, val);
                  await reloadFeed();
                }}
                className="w-full appearance-none pl-9 pr-8 py-2 bg-white border border-gray-200 hover:border-blue-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
              >
                <option value="">Asignar a...</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
              <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative w-32">
              <select
                value={prioritySel}
                onChange={async (e) => {
                  const val = e.target.value as any;
                  setPrioritySel(val);
                  await setTaskPriority(task.id, val);
                  await reloadFeed();
                }}
                className="w-full appearance-none pl-9 pr-8 py-2 bg-white border border-gray-200 hover:border-blue-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
              <AlertCircle className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-gray-500" />
                Actividad
              </h2>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {feed.length} eventos
              </span>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-8">
                {feed.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No hay actividad registrada aún</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {feed.map((item, index) => renderFeedItem(item, index, index === feed.length - 1))}
                  </div>
                )}
              </div>

              {/* Comment Input */}
              <div className="flex gap-4 pt-6 border-t border-gray-100">
                <div className="hidden sm:block">
                  <Avatar name="Yo" size="md" className="bg-blue-100 text-blue-700" />
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escribe un comentario o actualización..."
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0A4D8C] focus:border-transparent min-h-[100px] text-sm resize-none transition-all"
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                        title="Adjuntar archivo"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {selectedFile && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg w-fit animate-in fade-in slide-in-from-top-1">
                      <Paperclip className="w-3 h-3 text-gray-400" />
                      <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-gray-400 hover:text-red-500 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {(newComment.trim() || selectedFile) && (
                    <div className="mt-3 flex justify-end animate-in fade-in slide-in-from-top-2 duration-200">
                      <Button onClick={handleAddComment} size="sm" className="rounded-lg shadow-sm">
                        Comentar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Detalles del Contexto</h3>
            </div>
            <div className="p-4 space-y-4">
              <Link to={`/ projects / ${project?.id} `} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Proyecto</p>
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{project?.name}</p>
                </div>
              </Link>

              {/* Description */}

              <Link to={`/ minutes / ${minute?.id} `} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Acta de Reunión</p>
                  <p className="text-sm font-medium text-gray-900">Acta #{minute?.minute_number}</p>
                </div>
              </Link>

              {area && (
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${area.color} 20`, color: area.color }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: area.color }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Área Responsable</p>
                    <p className="text-sm font-medium text-gray-900">{area.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-gradient-to-br from-[#0A4D8C] to-[#06315C] rounded-xl shadow-lg p-6 text-white">
            <h3 className="font-semibold text-sm opacity-90 mb-4">Progreso de la Tarea</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-bold">
                {statusSel === 'completed' ? '100' : statusSel === 'in_progress' ? '50' : '0'}
              </span>
              <span className="text-lg opacity-80 mb-1">%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5 mb-4">
              <div
                className="bg-white h-1.5 rounded-full transition-all duration-1000 ease-out"
                style={{ width: statusSel === 'completed' ? '100%' : statusSel === 'in_progress' ? '50%' : '0%' }}
              />
            </div>
            <p className="text-xs opacity-70 leading-relaxed">
              {statusSel === 'completed'
                ? '¡Excelente! Esta tarea ha sido completada.'
                : statusSel === 'in_progress'
                  ? 'La tarea está en curso. Mantén el ritmo.'
                  : 'Aún no se ha iniciado el trabajo en esta tarea.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
