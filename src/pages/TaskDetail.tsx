import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Building2, FileText, Link2, Image as ImageIcon, Paperclip, Clock } from 'lucide-react';
import { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Chip from '../components/ui/Chip';
import Avatar from '../components/ui/Avatar';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { calculateDaysLeft, isTaskOverdue } from '../hooks/useMockData';
import { useTasks, useMinutes, useProjects, useTaskFeed, useTaskActions } from '../hooks/useData';
import { useMockParticipants, useMockAreas } from '../hooks/useMockData';
import { Activity, Comment } from '../data/mockData';

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const [newComment, setNewComment] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const { getTaskById } = useTasks();
  const { getProjectById } = useProjects();
  const { getMinuteById } = useMinutes();
  const { getParticipantById, participants } = useMockParticipants();
  const { getAreaById } = useMockAreas();
  const { feed } = useTaskFeed(taskId!);
  const { setTaskStatus, reassignTask, addTaskComment } = useTaskActions();

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

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Tarea no encontrada</p>
      </div>
    );
  }

  const handleAddComment = async () => {
    await addTaskComment(task.id, newComment, attachmentUrl || undefined);
    setNewComment('');
    setAttachmentUrl('');
  };

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      status_changed: 'cambió el estado',
      priority_changed: 'cambió la prioridad',
      assignee_changed: 'reasignó la tarea',
      due_date_changed: 'cambió la fecha de vencimiento',
      comment_added: 'agregó un comentario',
      comment_edited: 'editó un comentario',
      comment_deleted: 'eliminó un comentario',
    };
    return labels[type] || type;
  };

  const renderFeedItem = (item: Activity | Comment) => {
    const isComment = 'content' in item;
    const user = getParticipantById(item.user_id);

    if (isComment) {
      const comment = item as Comment;
      return (
        <div key={item.id} className="flex gap-4">
          {user && <Avatar name={`${user.first_name} ${user.last_name}`} size="md" className="mt-1" />}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">
                {user ? `${user.first_name} ${user.last_name}` : 'Usuario'}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(comment.created_at).toLocaleString('es-ES')}
              </span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg rounded-tl-none">
              <p className="text-gray-700 whitespace-pre-wrap text-sm">{comment.content}</p>
              {comment.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {comment.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-1.5 bg-white border border-gray-200 rounded text-xs"
                    >
                      {attachment.type === 'image' && <ImageIcon className="w-3 h-3 text-gray-500" />}
                      {attachment.type === 'file' && <Paperclip className="w-3 h-3 text-gray-500" />}
                      {attachment.type === 'link' && <Link2 className="w-3 h-3 text-gray-500" />}
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0A4D8C] hover:underline truncate"
                      >
                        {attachment.name}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    const activity = item as Activity;
    return (
      <div key={item.id} className="flex gap-4">
        {user && <Avatar name={`${user.first_name} ${user.last_name}`} size="md" className="mt-1" />}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">
              {user ? `${user.first_name} ${user.last_name}` : 'Usuario'}
            </span>
            <span className="text-sm text-gray-600">{getActivityLabel(activity.type)}</span>
            <span className="text-xs text-gray-400">
              {new Date(activity.created_at).toLocaleString('es-ES')}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1 bg-gray-50 p-2 rounded inline-block">
            {activity.type === 'status_changed' && (
              <span className="flex items-center gap-2">
                <Badge variant={activity.payload.from}>{activity.payload.from}</Badge>
                <ArrowLeft className="w-3 h-3 rotate-180 text-gray-400" />
                <Badge variant={activity.payload.to}>{activity.payload.to}</Badge>
              </span>
            )}
            {activity.type === 'priority_changed' && (
              <span className="flex items-center gap-2">
                <Chip priority={activity.payload.from}>{activity.payload.from}</Chip>
                <ArrowLeft className="w-3 h-3 rotate-180 text-gray-400" />
                <Chip priority={activity.payload.to}>{activity.payload.to}</Chip>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <Link
          to={`/projects/${project?.id}`}
          className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver al Proyecto
        </Link>

        <div className="flex items-center gap-3 mb-3">
          <Badge variant={statusSel}>{statusSel === 'in_progress' ? 'En Progreso' : statusSel === 'pending' ? 'Pendiente' : statusSel === 'completed' ? 'Completada' : 'Cancelada'}</Badge>
          <Chip priority={task.priority}>{task.priority}</Chip>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">{task.description}</h1>

        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Sin asignar'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{task.due_date}</span>
            {overdue && <span className="text-red-600 font-medium">({daysLeft > 0 ? `${daysLeft} días restantes` : 'Vencida'})</span>}
          </div>
          {task.started_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Iniciado: {new Date(task.started_at).toLocaleDateString('es-ES')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8 flex flex-wrap gap-4 shadow-sm">
        <div className="w-48">
          <Select
            value={statusSel}
            onChange={async (e) => {
              const val = (e.target as HTMLSelectElement).value as any;
              setStatusSel(val);
              await setTaskStatus(task.id, val);
            }}
            options={[
              { value: 'pending', label: 'Cambiar estado' }, // Placeholder-ish
              { value: 'in_progress', label: 'En Progreso' },
              { value: 'completed', label: 'Completada' },
              { value: 'canceled', label: 'Cancelada' },
            ]}
            className="w-full"
          />
        </div>
        <div className="w-48">
          <Select
            value={assigneeSel}
            onChange={async (e) => {
              const val = (e.target as HTMLSelectElement).value;
              setAssigneeSel(val);
              await reassignTask(task.id, val);
            }}
            options={[
              { value: '', label: 'Reasignar' },
              ...participants.map((p) => ({
                value: p.id,
                label: `${p.first_name} ${p.last_name}`,
              }))
            ]}
            className="w-full"
          />
        </div>
        <div className="w-48">
          <Select
            value={prioritySel}
            onChange={async (e) => {
              // Mock priority change
              setPrioritySel(e.target.value as any);
            }}
            options={[
              { value: 'low', label: 'Baja' },
              { value: 'medium', label: 'Media' },
              { value: 'high', label: 'Alta' },
              { value: 'critical', label: 'Crítica' },
            ]}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Actividad y Comentarios</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6 mb-8">
                {feed.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay actividad registrada</p>
                ) : (
                  feed.map((item) => renderFeedItem(item))
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Agregar un comentario... (Soporta **negrita** y *cursiva*)"
                  className="w-full p-3 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0A4D8C] focus:border-[#0A4D8C] min-h-[100px] text-sm mb-3"
                />
                <Input
                  placeholder="URL de archivo adjunto (opcional)"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="mb-3 bg-white"
                />
                <div className="flex justify-between items-center">
                  <button className="text-gray-400 hover:text-gray-600">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <Button onClick={handleAddComment} disabled={!newComment.trim()} size="sm">
                    <div className="flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                      Enviar
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Info */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Información</h2>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm">Proyecto</span>
                </div>
                <Link to={`/projects/${project?.id}`} className="font-medium text-gray-900 hover:text-[#0A4D8C]">
                  {project?.name}
                </Link>
              </div>

              <div>
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Acta</span>
                </div>
                <Link to={`/minutes/${minute?.id}`} className="font-medium text-gray-900 hover:text-[#0A4D8C]">
                  Acta #{minute?.minute_number}
                </Link>
              </div>

              {area && (
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: area.color }} />
                    <span className="text-sm">Área</span>
                  </div>
                  <p className="font-medium text-gray-900">{area.name}</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-sm">Progreso</span>
                  <span className="text-sm font-medium text-gray-900">
                    {statusSel === 'completed' ? '100%' : statusSel === 'in_progress' ? '50%' : '0%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#0A4D8C] h-2 rounded-full transition-all duration-500"
                    style={{ width: statusSel === 'completed' ? '100%' : statusSel === 'in_progress' ? '50%' : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
