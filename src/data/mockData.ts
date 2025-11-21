export interface Company {
  id: string;
  name: string;
  tax_id: string;
  email: string;
  phone: string;
  logo_url?: string;
}

export interface User {
  id: string;
  company_id: string;
  email: string;
  role: 'admin' | 'user';
}

export interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  role: string;
  email: string;
  phone: string;
  active: boolean;
  user_id?: string;
}

export interface Project {
  id: string;
  company_id: string;
  name: string;
  code: string;
  status: 'active' | 'completed' | 'on_hold';
  start_date: string;
  estimated_end_date: string;
  budget?: number;
}

export interface Area {
  id: string;
  name: string;
  color: string;
}

export interface Minute {
  id: string;
  project_id: string;
  minute_number: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  location: string;
  status: 'draft' | 'final';
  notes?: string;
}

export interface AgendaItem {
  id: string;
  minute_id: string;
  order: number;
  description: string;
  notes?: string;
}

export interface Attendance {
  id: string;
  minute_id: string;
  participant_id: string;
  position_in_meeting: string;
  signed: boolean;
  signed_at?: string;
  signature_url?: string;
  notes?: string;
}

export interface Task {
  id: string;
  company_id: string;
  project_id: string;
  minute_id: string;
  type: 'task' | 'agreement';
  description: string;
  assignee_id: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'canceled' | 'permanent';
  progress_percent?: number;
  area_id: string;
  previous_task_id?: string;
  started_at?: string;
  closed_at?: string;
}

export interface Comment {
  id: string;
  company_id: string;
  task_id: string;
  user_id: string;
  content: string;
  internal: boolean;
  attachments: Attachment[];
  created_at: string;
  edited: boolean;
  edited_at?: string;
}

export interface Attachment {
  type: 'image' | 'file' | 'link';
  url: string;
  name: string;
}

export interface Activity {
  id: string;
  company_id: string;
  task_id: string;
  user_id: string;
  type: 'status_changed' | 'priority_changed' | 'assignee_changed' | 'due_date_changed' | 'comment_added' | 'comment_edited' | 'comment_deleted';
  payload: any;
  created_at: string;
}

export const mockCompanies: Company[] = [
  {
    id: 'c1',
    name: 'Constructora del Sur',
    tax_id: '20123456789',
    email: 'contacto@constructoradelsur.com',
    phone: '+51987654321',
  },
];

export const mockUsers: User[] = [
  { id: 'u1', company_id: 'c1', email: 'admin@constructoradelsur.com', role: 'admin' },
  { id: 'u2', company_id: 'c1', email: 'jimmy@example.com', role: 'user' },
];

export const mockParticipants: Participant[] = [
  {
    id: 'pa1',
    first_name: 'Jimmy',
    last_name: 'Contreras',
    title: 'Ing.',
    role: 'Gerente de Proyecto',
    email: 'jimmy@example.com',
    phone: '+51987654321',
    active: true,
    user_id: 'u2',
  },
  {
    id: 'pa2',
    first_name: 'María',
    last_name: 'González',
    title: 'Arq.',
    role: 'Arquitecta Principal',
    email: 'maria@example.com',
    phone: '+51987654322',
    active: true,
  },
  {
    id: 'pa3',
    first_name: 'Carlos',
    last_name: 'Ramirez',
    title: 'Ing.',
    role: 'Supervisor de Obra',
    email: 'carlos@example.com',
    phone: '+51987654323',
    active: true,
  },
  {
    id: 'pa4',
    first_name: 'Ana',
    last_name: 'Torres',
    title: 'Ing.',
    role: 'Ingeniera Estructural',
    email: 'ana@example.com',
    phone: '+51987654324',
    active: true,
  },
];

export const mockAreas: Area[] = [
  { id: 'ar1', name: 'Estructuras', color: '#0A4D8C' },
  { id: 'ar2', name: 'Arquitectura', color: '#1B6FB3' },
  { id: 'ar3', name: 'Instalaciones Eléctricas', color: '#F0AD4E' },
  { id: 'ar4', name: 'Instalaciones Sanitarias', color: '#5CB85C' },
  { id: 'ar5', name: 'Seguridad', color: '#D9534F' },
];

export const mockProjects: Project[] = [
  {
    id: 'p1',
    company_id: 'c1',
    name: 'Granja Rinconada del Sur',
    code: 'GRS-001',
    status: 'active',
    start_date: '2025-10-01',
    estimated_end_date: '2026-04-01',
    budget: 1200000,
  },
  {
    id: 'p2',
    company_id: 'c1',
    name: 'Edificio Los Alamos',
    code: 'ELA-002',
    status: 'active',
    start_date: '2025-09-15',
    estimated_end_date: '2026-06-30',
    budget: 2500000,
  },
  {
    id: 'p3',
    company_id: 'c1',
    name: 'Centro Comercial Plaza Norte',
    code: 'CCPN-003',
    status: 'on_hold',
    start_date: '2025-08-01',
    estimated_end_date: '2026-12-31',
    budget: 5000000,
  },
];

export const mockMinutes: Minute[] = [
  {
    id: 'm1',
    project_id: 'p1',
    minute_number: '6',
    meeting_date: '2025-11-16',
    start_time: '15:00',
    end_time: '16:30',
    location: 'Sala de reuniones - Oficina Principal',
    status: 'final',
  },
  {
    id: 'm2',
    project_id: 'p1',
    minute_number: '7',
    meeting_date: '2025-11-20',
    start_time: '15:00',
    end_time: '16:30',
    location: 'Sala de reuniones - Oficina Principal',
    status: 'draft',
  },
  {
    id: 'm3',
    project_id: 'p2',
    minute_number: '3',
    meeting_date: '2025-11-18',
    start_time: '10:00',
    end_time: '11:30',
    location: 'Obra - Edificio Los Alamos',
    status: 'final',
  },
];

export const mockAgendaItems: AgendaItem[] = [
  {
    id: 'a1',
    minute_id: 'm1',
    order: 1,
    description: 'Revisión de avance de obra semana 6',
  },
  {
    id: 'a2',
    minute_id: 'm1',
    order: 2,
    description: 'Coordinación de entrega de materiales',
  },
  {
    id: 'a3',
    minute_id: 'm1',
    order: 3,
    description: 'Planificación de actividades semana 7',
  },
];

export const mockAttendance: Attendance[] = [
  {
    id: 'att1',
    minute_id: 'm1',
    participant_id: 'pa1',
    position_in_meeting: 'Gerente de Proyecto',
    signed: true,
    signed_at: '2025-11-16T16:35:00Z',
    signature_url: 'https://example.com/signature1.png',
  },
  {
    id: 'att2',
    minute_id: 'm1',
    participant_id: 'pa2',
    position_in_meeting: 'Arquitecta Principal',
    signed: true,
    signed_at: '2025-11-16T16:36:00Z',
    signature_url: 'https://example.com/signature2.png',
  },
  {
    id: 'att3',
    minute_id: 'm1',
    participant_id: 'pa3',
    position_in_meeting: 'Supervisor de Obra',
    signed: false,
  },
];

export const mockTasks: Task[] = [
  {
    id: 't1',
    company_id: 'c1',
    project_id: 'p1',
    minute_id: 'm1',
    type: 'task',
    description: 'Coordinar entrega de vigas metálicas con proveedor',
    assignee_id: 'pa1',
    due_date: '2025-11-20',
    priority: 'high',
    status: 'in_progress',
    progress_percent: 60,
    area_id: 'ar1',
    started_at: '2025-11-17T12:00:00Z',
  },
  {
    id: 't2',
    company_id: 'c1',
    project_id: 'p1',
    minute_id: 'm1',
    type: 'task',
    description: 'Revisar planos de instalaciones eléctricas - Piso 2',
    assignee_id: 'pa2',
    due_date: '2025-11-22',
    priority: 'medium',
    status: 'pending',
    area_id: 'ar3',
  },
  {
    id: 't3',
    company_id: 'c1',
    project_id: 'p1',
    minute_id: 'm1',
    type: 'task',
    description: 'Inspección de cimentaciones - Zona A',
    assignee_id: 'pa3',
    due_date: '2025-11-18',
    priority: 'critical',
    status: 'completed',
    progress_percent: 100,
    area_id: 'ar1',
    started_at: '2025-11-16T08:00:00Z',
    closed_at: '2025-11-18T17:00:00Z',
  },
  {
    id: 't4',
    company_id: 'c1',
    project_id: 'p1',
    minute_id: 'm1',
    type: 'agreement',
    description: 'Reunión semanal todos los miércoles a las 15:00',
    assignee_id: 'pa1',
    due_date: '2026-04-01',
    priority: 'low',
    status: 'permanent',
    area_id: 'ar1',
  },
  {
    id: 't5',
    company_id: 'c1',
    project_id: 'p1',
    minute_id: 'm1',
    type: 'task',
    description: 'Actualizar certificado de seguridad de obra',
    assignee_id: 'pa3',
    due_date: '2025-11-15',
    priority: 'high',
    status: 'pending',
    area_id: 'ar5',
  },
  {
    id: 't6',
    company_id: 'c1',
    project_id: 'p2',
    minute_id: 'm3',
    type: 'task',
    description: 'Verificar conexiones de agua potable',
    assignee_id: 'pa4',
    due_date: '2025-11-25',
    priority: 'medium',
    status: 'pending',
    area_id: 'ar4',
  },
];

export const mockComments: Comment[] = [
  {
    id: 'cm1',
    company_id: 'c1',
    task_id: 't1',
    user_id: 'u2',
    content: '**Confirmado**: Entrega programada para el 20/11. Proveedor confirmó disponibilidad.',
    internal: false,
    attachments: [
      {
        type: 'image',
        url: 'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg',
        name: 'Confirmación de proveedor',
      },
    ],
    created_at: '2025-11-18T10:00:00Z',
    edited: true,
    edited_at: '2025-11-18T10:30:00Z',
  },
  {
    id: 'cm2',
    company_id: 'c1',
    task_id: 't1',
    user_id: 'u1',
    content: 'Perfecto. Coordinar con el equipo de montaje para recepción.',
    internal: false,
    attachments: [],
    created_at: '2025-11-18T11:00:00Z',
    edited: false,
  },
];

export const mockActivities: Activity[] = [
  {
    id: 'ac1',
    company_id: 'c1',
    task_id: 't1',
    user_id: 'u2',
    type: 'status_changed',
    payload: { from: 'pending', to: 'in_progress' },
    created_at: '2025-11-17T12:00:00Z',
  },
  {
    id: 'ac2',
    company_id: 'c1',
    task_id: 't1',
    user_id: 'u2',
    type: 'priority_changed',
    payload: { from: 'medium', to: 'high' },
    created_at: '2025-11-17T13:00:00Z',
  },
];
