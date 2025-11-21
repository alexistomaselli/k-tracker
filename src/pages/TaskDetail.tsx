import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Building2, FileText, Link2, Image as ImageIcon, Paperclip, Edit2 } from 'lucide-react';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Chip from '../components/ui/Chip';
import Avatar from '../components/ui/Avatar';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import {
  useMockTasks,
  useMockProjects,
  useMockMinutes,
  useMockParticipants,
  useMockAreas,
  useMockTaskFeed,
  calculateDaysLeft,
  isTaskOverdue,
} from '../hooks/useMockData';
import { Activity, Comment } from '../data/mockData';

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const [newComment, setNewComment] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const { getTaskById } = useMockTasks();
  const { getProjectById } = useMockProjects();
  const { getMinuteById } = useMockMinutes();
  const { getParticipantById, participants } = useMockParticipants();
  const { getAreaById } = useMockAreas();
  const { feed } = useMockTaskFeed(taskId!);

  const task = getTaskById(taskId!);
  const project = task ? getProjectById(task.project_id) : null;
  const minute = task ? getMinuteById(task.minute_id) : null;
  const assignee = task ? getParticipantById(task.assignee_id) : null;
  const area = task ? getAreaById(task.area_id) : null;

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Tarea no encontrada</p>
      </div>
    );
  }

  const daysLeft = calculateDaysLeft(task.due_date);
  const overdue = isTaskOverdue(task);

  const handleAddComment = () => {
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
        <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
          {user && <Avatar name={`${user.first_name} ${user.last_name}`} size="md" />}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-gray-900">
                {user ? `${user.first_name} ${user.last_name}` : 'Usuario'}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(comment.created_at).toLocaleString('es-ES')}
              </span>
              {comment.edited && (
                <span className="text-xs text-gray-400 italic">(editado)</span>
              )}
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            </div>
            {comment.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {comment.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-md"
                  >
                    {attachment.type === 'image' && <ImageIcon className="w-4 h-4 text-gray-500" />}
                    {attachment.type === 'file' && <Paperclip className="w-4 h-4 text-gray-500" />}
                    {attachment.type === 'link' && <Link2 className="w-4 h-4 text-gray-500" />}
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#0A4D8C] hover:underline"
                    >
                      {attachment.name}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    const activity = item as Activity;
    return (
      <div key={item.id} className="flex gap-4 p-4">
        {user && <Avatar name={`${user.first_name} ${user.last_name}`} size="sm" />}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {user ? `${user.first_name} ${user.last_name}` : 'Usuario'}
            </span>
            <span className="text-sm text-gray-600">{getActivityLabel(activity.type)}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {activity.type === 'status_changed' && (
              <span>
                de <Badge variant={activity.payload.from}>{activity.payload.from}</Badge> a{' '}
                <Badge variant={activity.payload.to}>{activity.payload.to}</Badge>
              </span>
            )}
            {activity.type === 'priority_changed' && (
              <span>
                de <Chip priority={activity.payload.from}>{activity.payload.from}</Chip> a{' '}
                <Chip priority={activity.payload.to}>{activity.payload.to}</Chip>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(activity.created_at).toLocaleString('es-ES')}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/projects/${project?.id}`}
          className="inline-flex items-center text-[#0A4D8C] hover:underline mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver al Proyecto
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-3">{task.description}</h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={task.status}>{task.status}</Badge>
                    <Chip priority={task.priority}>{task.priority}</Chip>
                    {overdue && <Badge variant="overdue">Vencida</Badge>}
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Responsable</p>
                    {assignee && (
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar
                          name={`${assignee.first_name} ${assignee.last_name}`}
                          size="sm"
                        />
                        <span className="font-medium">
                          {assignee.first_name} {assignee.last_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Vencimiento</p>
                    <p className="font-medium">{task.due_date}</p>
                    {!overdue && task.status !== 'completed' && (
                      <p className="text-sm text-gray-600">
                        ({daysLeft > 0 ? `${daysLeft} días restantes` : 'Vence hoy'})
                      </p>
                    )}
                  </div>
                </div>
                {task.started_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Iniciada</p>
                      <p className="font-medium">
                        {new Date(task.started_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                )}
                {task.closed_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Completada</p>
                      <p className="font-medium">
                        {new Date(task.closed_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Actividad y Comentarios</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                {feed.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay actividad registrada</p>
                ) : (
                  feed.map((item) => renderFeedItem(item))
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Agregar Comentario</h3>
                <div className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe tu comentario aquí..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0A4D8C] focus:border-[#0A4D8C] min-h-[100px]"
                  />
                  <Input
                    placeholder="URL del adjunto (opcional)"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                      Agregar Comentario
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Select
                  label="Cambiar Estado"
                  options={[
                    { value: 'pending', label: 'Pendiente' },
                    { value: 'in_progress', label: 'En Progreso' },
                    { value: 'completed', label: 'Completada' },
                    { value: 'canceled', label: 'Cancelada' },
                  ]}
                  value={task.status}
                  onChange={() => {}}
                />
                <Select
                  label="Reasignar a"
                  options={participants.map((p) => ({
                    value: p.id,
                    label: `${p.first_name} ${p.last_name}`,
                  }))}
                  value={task.assignee_id}
                  onChange={() => {}}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Información</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Building2 className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Empresa</p>
                    <p className="font-medium">Constructora del Sur</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Proyecto</p>
                    <Link to={`/projects/${project?.id}`} className="font-medium text-[#0A4D8C] hover:underline">
                      {project?.name}
                    </Link>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Acta</p>
                    <Link to={`/minutes/${minute?.id}`} className="font-medium text-[#0A4D8C] hover:underline">
                      Acta #{minute?.minute_number}
                    </Link>
                  </div>
                </div>
                {area && (
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full mt-0.5" style={{ backgroundColor: area.color }} />
                    <div>
                      <p className="text-sm text-gray-500">Área</p>
                      <p className="font-medium">{area.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
