import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, Download } from 'lucide-react';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Chip from '../components/ui/Chip';
import Avatar from '../components/ui/Avatar';
import {
  useMockMinutes,
  useMockProjects,
  useMockAgenda,
  useMockAttendance,
  useMockTasks,
  useMockParticipants,
  useMockAreas,
} from '../hooks/useMockData';

export default function MinuteDetail() {
  const { minuteId } = useParams<{ minuteId: string }>();
  const [activeTab, setActiveTab] = useState<'content' | 'tasks'>('content');

  const { getMinuteById } = useMockMinutes();
  const { getProjectById } = useMockProjects();
  const { agendaItems } = useMockAgenda(minuteId!);
  const { attendance } = useMockAttendance(minuteId!);
  const { getTasksByMinute } = useMockTasks();
  const { getParticipantById } = useMockParticipants();
  const { getAreaById } = useMockAreas();

  const minute = getMinuteById(minuteId!);
  const project = minute ? getProjectById(minute.project_id) : null;
  const tasks = getTasksByMinute(minuteId!);

  if (!minute) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Acta no encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              <Badge variant={minute.status === 'final' ? 'completed' : 'draft'}>
                {minute.status === 'final' ? 'Final' : 'Borrador'}
              </Badge>
            </div>
            <p className="text-gray-600">{project?.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button variant="primary" size="sm">
              Editar Acta
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Fecha</p>
                <p className="font-medium">{minute.meeting_date}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Horario</p>
                <p className="font-medium">
                  {minute.start_time} - {minute.end_time}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Ubicación</p>
                <p className="font-medium">{minute.location}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('content')}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'content'
                ? 'border-[#0A4D8C] text-[#0A4D8C]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Contenido
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'border-[#0A4D8C] text-[#0A4D8C]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Tareas ({tasks.length})
          </button>
        </nav>
      </div>

      {activeTab === 'content' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Agenda</h2>
            </CardHeader>
            <CardContent>
              {agendaItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay items en la agenda</p>
              ) : (
                <div className="space-y-4">
                  {agendaItems.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-[#0A4D8C] text-white rounded-full flex items-center justify-center font-semibold">
                        {item.order}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.description}</p>
                        {item.notes && <p className="text-sm text-gray-600 mt-1">{item.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Asistencia</h2>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay registros de asistencia</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Participante</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Cargo en Reunión</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha/Hora Firma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((att) => {
                        const participant = getParticipantById(att.participant_id);
                        return (
                          <tr key={att.id} className="border-b border-gray-100">
                            <td className="py-3 px-4">
                              {participant && (
                                <div className="flex items-center gap-2">
                                  <Avatar
                                    name={`${participant.first_name} ${participant.last_name}`}
                                    size="sm"
                                  />
                                  <span className="font-medium">
                                    {participant.title} {participant.first_name} {participant.last_name}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">{att.position_in_meeting}</td>
                            <td className="py-3 px-4">
                              {att.signed ? (
                                <Badge variant="completed">Firmado</Badge>
                              ) : (
                                <Badge variant="pending">Pendiente</Badge>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {att.signed_at ? (
                                <span className="text-sm text-gray-600">
                                  {new Date(att.signed_at).toLocaleString('es-ES')}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
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
        </div>
      )}

      {activeTab === 'tasks' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Tareas del Acta</h2>
              <Button variant="outline" size="sm">
                Arrastrar Tareas Anteriores
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay tareas asociadas a esta acta</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Descripción</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Área</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Responsable</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Prioridad</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const assignee = getParticipantById(task.assignee_id);
                      const area = getAreaById(task.area_id);
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
                            {area && (
                              <span className="text-sm font-medium" style={{ color: area.color }}>
                                {area.name}
                              </span>
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
                            <Chip priority={task.priority}>{task.priority}</Chip>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={task.status}>{task.status}</Badge>
                          </td>
                          <td className="py-3 px-4">{task.due_date}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
