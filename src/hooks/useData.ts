import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase'
import { Project, Minute, Task, Participant, Area } from '../data/mockData'
import { useMockProjects, useMockMinutes, useMockTasks, useMockTaskFeed, useMockParticipants, useMockAreas } from './useMockData'

export function useProjects() {
  const mock = useMockProjects()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!SUPABASE_CONFIGURED) return
    setLoading(true)
    setError(null)
    const supabase = getSupabase()
    const { data, error } = await supabase!.from('project').select('*').order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
    }
    setProjects((data as Project[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const getProjectById = (id: string) => projects.find((p) => p.id === id)

  async function createProject(payload: { name: string; code: string; status: Project['status']; start_date: string; estimated_end_date: string; budget?: number }) {
    if (SUPABASE_CONFIGURED) {
      const supabase = getSupabase()
      const { data: sessionRes } = await supabase!.auth.getSession()
      const userObj = sessionRes?.session?.user
      const uid = userObj?.id
      const claimCompany = (userObj?.user_metadata as any)?.company_id || (userObj?.user_metadata as any)?.claims?.company_id || (userObj as any)?.app_metadata?.claims?.company_id || null
      if (!uid) throw new Error('Usuario no autenticado')
      let companyId: string | null = null
      if (claimCompany) companyId = claimCompany as string
      if (!companyId) {
        const vc = await supabase!.from('user_company').select('company_id').eq('user_id', uid).limit(1).single()
        if (vc.data?.company_id) companyId = vc.data.company_id as string
      }
      if (!companyId) throw new Error('No se pudo resolver compañía del usuario')
      const insertPayload = { ...payload, company_id: companyId }
      const { data, error } = await supabase!.from('project').insert(insertPayload).select().single()
      if (error) throw new Error(error.message)
      setProjects((prev) => [data as Project, ...prev])
      return data as Project
    } else {
      const mockProject: Project = {
        id: 'p' + Date.now(),
        company_id: 'c1',
        name: payload.name,
        code: payload.code,
        status: payload.status,
        start_date: payload.start_date,
        estimated_end_date: payload.estimated_end_date,
        budget: payload.budget,
      }
      setProjects((prev) => [mockProject, ...prev])
      return mockProject
    }
  }

  async function reloadProjects() {
    await load()
  }

  return { projects, loading, error, getProjectById, createProject, reloadProjects }
}

export function useMinutes() {
  const mock = useMockMinutes()
  const [minutes, setMinutes] = useState<Minute[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!SUPABASE_CONFIGURED) return
    setLoading(true)
    setError(null)
    const supabase = getSupabase()
    const { data, error } = await supabase!.from('minutes').select('*').order('meeting_date', { ascending: false })
    if (error) {
      setError(error.message)
    }
    setMinutes((data as Minute[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const getMinuteById = (id: string) => minutes.find((m) => m.id === id)
  const getMinutesByProject = (projectId: string) => minutes.filter((m) => m.project_id === projectId)

  async function reloadMinutes() {
    await load()
  }

  return { minutes, loading, error, getMinuteById, getMinutesByProject, reloadMinutes }
}

export function useTasks() {
  const mock = useMockTasks()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!SUPABASE_CONFIGURED) return
    setLoading(true)
    setError(null)
    const supabase = getSupabase()
    const { data, error } = await supabase!.from('tasks').select('*').order('due_date', { ascending: true })
    if (error) {
      setError(error.message)
    }
    setTasks((data as Task[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const getTaskById = (id: string) => tasks.find((t) => t.id === id)
  const getTasksByProject = (projectId: string) => tasks.filter((t) => t.project_id === projectId)
  const getTasksByMinute = (minuteId: string) => tasks.filter((t) => t.minute_id === minuteId)
  const getTasksByAssignee = (assigneeId: string) => tasks.filter((t) => t.assignee_id === assigneeId)

  async function reloadTasks() {
    await load()
  }

  return { tasks, loading, error, getTaskById, getTasksByProject, getTasksByMinute, getTasksByAssignee, reloadTasks }
}


export function useAgenda(minuteId: string) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    async function load() {
      if (!minuteId) return
      if (!SUPABASE_CONFIGURED) return
      setLoading(true)
      const supabase = getSupabase()
      const { data } = await supabase!.from('minute_agenda_items').select('*').eq('minute_id', minuteId).order('order', { ascending: true })
      setItems(data ?? [])
      setLoading(false)
    }
    load()
  }, [minuteId])
  return {
    agendaItems: items, loading, reloadAgenda: () => {
      const supabase = getSupabase()
      if (!minuteId || !supabase) return
      supabase.from('minute_agenda_items').select('*').eq('minute_id', minuteId).order('order', { ascending: true }).then(({ data }) => setItems(data ?? []))
    }
  }
}

export function useAgendaActions() {
  async function createAgendaItem(minuteId: string, description: string, order: number, notes?: string) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()

    // Get company_id from minute
    const { data: minuteData, error: minuteError } = await supabase!
      .from('minutes')
      .select('company_id')
      .eq('id', minuteId)
      .single()

    if (minuteError || !minuteData) throw new Error('Minute not found')

    const { data, error } = await supabase!.from('minute_agenda_items').insert({
      minute_id: minuteId,
      company_id: minuteData.company_id,
      description,
      order,
      notes
    }).select().single()

    if (error) throw error
    return data
  }

  async function updateAgendaItem(id: string, payload: { description?: string; notes?: string; order?: number }) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()
    const { data, error } = await supabase!.from('minute_agenda_items').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  }

  async function deleteAgendaItem(id: string) {
    if (!SUPABASE_CONFIGURED) return
    const supabase = getSupabase()
    const { error } = await supabase!.from('minute_agenda_items').delete().eq('id', id)
    if (error) throw error
  }

  return { createAgendaItem, updateAgendaItem, deleteAgendaItem }
}

export function useAttendance(minuteId: string) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!minuteId) return
    if (!SUPABASE_CONFIGURED) return
    setLoading(true)
    const supabase = getSupabase()
    const { data } = await supabase!.from('minute_attendance').select('*').eq('minute_id', minuteId)
    setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [minuteId])

  return { attendance: rows, loading, reloadAttendance: load }
}

export function useAttendanceActions() {
  async function markAttendance(minuteId: string, participantId: string, status: string, notes?: string) {
    if (!SUPABASE_CONFIGURED) return
    const supabase = getSupabase()

    // Get company_id from minute
    const { data: minuteData, error: minuteError } = await supabase!
      .from('minutes')
      .select('company_id')
      .eq('id', minuteId)
      .single()

    if (minuteError || !minuteData) throw new Error('Minute not found')

    // Use upsert for atomic update/insert
    const { error } = await supabase!
      .from('minute_attendance')
      .upsert({
        minute_id: minuteId,
        participant_id: participantId,
        company_id: minuteData.company_id,
        status,
        notes,
        updated_at: new Date().toISOString()
      }, { onConflict: 'minute_id,participant_id' })

    if (error) throw error
  }

  return { markAttendance }
}

export function useTaskFeed(taskId: string) {
  const mock = useMockTaskFeed(taskId)
  const [feed, setFeed] = useState<any[]>(mock.feed)

  async function load() {
    if (!taskId) return
    if (!SUPABASE_CONFIGURED) return
    const supabase = getSupabase()
    const { data: comments } = await supabase!.from('task_comments').select('*').eq('task_id', taskId)
    const { data: activity } = await supabase!.from('task_activity').select('*').eq('task_id', taskId)
    const mappedComments = (comments ?? []).map((c: any) => ({
      id: c.id,
      task_id: c.task_id,
      user_id: c.user_id,
      content: c.content,
      attachments: c.attachments ?? [],
      edited: !!c.edited,
      created_at: c.created_at,
    }))
    const mappedActivity = (activity ?? [])
      .filter((a: any) => a.type !== 'comment_added') // Filter out comment_added to avoid duplication with actual comments
      .map((a: any) => ({
        id: a.id,
        task_id: a.task_id,
        user_id: a.user_id,
        type: a.type,
        payload: a.payload ?? {},
        created_at: a.created_at,
      }))
    const combined = [...mappedComments, ...mappedActivity].sort((x: any, y: any) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime())
    setFeed(combined)
  }

  useEffect(() => {
    load()
  }, [taskId])
  return { feed, reloadFeed: load }
}

export function useTaskActions() {
  const getAppUrl = () => {
    return import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin
  }

  async function setTaskStatus(taskId: string, status: string) {
    if (!SUPABASE_CONFIGURED) return
    const supabase = getSupabase()
    const rpc = await supabase!.rpc('set_task_status', { p_task_id: taskId, p_status: status })
    if (rpc.error) await supabase!.from('tasks').update({ status }).eq('id', taskId)
  }
  async function reassignTask(taskId: string, assigneeId: string) {
    if (!SUPABASE_CONFIGURED) return
    const supabase = getSupabase()
    const rpc = await supabase!.rpc('reassign_task', { p_task_id: taskId, p_assignee_id: assigneeId })
    if (rpc.error) await supabase!.from('tasks').update({ assignee_id: assigneeId }).eq('id', taskId)

    // Notify new assignee
    if (assigneeId) {
      try {
        await supabase!.from('notifications').insert({
          user_id: assigneeId,
          title: 'Nueva Tarea Asignada',
          message: 'Se te ha reasignado una tarea.',
          type: 'task_assigned',
          link: `/tasks/${taskId}`
        })

        // Send Email Notification
        const { data: assignee } = await supabase!.from('participants').select('email, first_name').eq('id', assigneeId).single()
        const { data: task } = await supabase!.from('tasks').select('description, project_id, priority, due_date').eq('id', taskId).single()

        if (assignee?.email && task) {
          const { data: project } = await supabase!.from('project').select('name').eq('id', task.project_id).single()

          await supabase!.functions.invoke('send-email', {
            body: {
              to: assignee.email,
              subject: `Tarea Reasignada: ${project?.name || 'K-Tracker'}`,
              html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K-Tracker</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background-color: #0A4D8C; padding: 20px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .button { display: inline-block; background-color: #0A4D8C; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; margin: 20px 0; }
    .alert-box { background-color: #eef6fc; border-left: 4px solid #0A4D8C; padding: 15px; margin-top: 20px; font-size: 14px; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .link-text { color: #0A4D8C; word-break: break-all; }
    .task-details { background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0; border: 1px solid #eee; }
    .task-details p { margin: 5px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>K-Tracker</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${assignee.first_name || 'Usuario'}</strong>,</p>
      <p>Se te ha reasignado una tarea en el proyecto <strong>${project?.name || 'Sin nombre'}</strong>.</p>
      
      <div class="task-details">
        <p><strong>Descripción:</strong> ${task.description}</p>
        <p><strong>Prioridad:</strong> <span style="color: ${task.priority === 'high' || task.priority === 'critical' ? '#e11d48' : '#333'}; font-weight: bold;">${task.priority || 'Media'}</span></p>
        <p><strong>Vencimiento:</strong> ${task.due_date ? task.due_date.split('-').reverse().join('-') : 'Sin fecha'}</p>
      </div>

      <p>Para ver más detalles o comenzar a trabajar, accede a la tarea:</p>
      
      <div style="text-align: center;">
        <a href="${getAppUrl()}/tasks/${taskId}" class="button">Ver Tarea en K-Tracker</a>
      </div>

      <div class="alert-box">
        <strong>💡 Consejo:</strong><br>
        Mantén el estado de la tarea actualizado para que todo el equipo esté al tanto del progreso.
      </div>
      
      <p style="margin-top: 20px; font-size: 12px; color: #999;">Si el botón no funciona, copia este enlace: <br>
      <a href="${getAppUrl()}/tasks/${taskId}" class="link-text">${getAppUrl()}/tasks/${taskId}</a></p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} K-Tracker. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
              `
            }
          })
        }

      } catch (notifyError) {
        console.error('Error creating notification/email (reassign):', notifyError)
      }
    }
  }
  async function setTaskPriority(taskId: string, priority: string) {
    if (!SUPABASE_CONFIGURED) return
    const supabase = getSupabase()
    await supabase!.from('tasks').update({ priority }).eq('id', taskId)
  }
  async function uploadTaskAttachment(file: File) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase!.storage.from('task-attachments').upload(filePath, file)
    if (uploadError) throw uploadError

    const { data } = supabase!.storage.from('task-attachments').getPublicUrl(filePath)
    return data.publicUrl
  }

  async function addTaskComment(taskId: string, content: string, attachmentUrl?: string) {
    if (!SUPABASE_CONFIGURED) return
    const supabase = getSupabase()
    const attachments = attachmentUrl ? [{ type: 'link', url: attachmentUrl, name: attachmentUrl }] : []
    const rpc = await supabase!.rpc('create_task_comment', { p_task_id: taskId, p_content: content, p_attachments: attachments })
    if (rpc.error) await supabase!.from('task_comments').insert({ task_id: taskId, content, attachments })
  }

  async function createTask(payload: {
    project_id: string
    description: string
    assignee_id?: string
    due_date?: string
    priority?: string
    status?: string
    minute_id?: string
    area_id?: string
  }) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()

    // Get company_id from project
    const { data: projectData } = await supabase!.from('project').select('company_id').eq('id', payload.project_id).single()
    if (!projectData) throw new Error('Project not found')

    const { data, error } = await supabase!.from('tasks').insert({
      ...payload,
      company_id: projectData.company_id,
      status: payload.status || 'pending',
      priority: payload.priority || 'medium'
    }).select().single()

    if (error) throw error

    // Notify assignee
    if (data && payload.assignee_id) {
      try {
        await supabase!.from('notifications').insert({
          user_id: payload.assignee_id,
          title: 'Nueva Tarea Asignada',
          message: `Se te ha asignado una nueva tarea: "${payload.description.substring(0, 50)}${payload.description.length > 50 ? '...' : ''}"`,
          type: 'task_assigned',
          link: `/tasks/${data.id}`
        })

        // Send Email Notification
        const { data: assignee } = await supabase!.from('participants').select('email, first_name').eq('id', payload.assignee_id).single()
        const { data: project } = await supabase!.from('project').select('name').eq('id', payload.project_id).single()

        if (assignee?.email) {
          await supabase!.functions.invoke('send-email', {
            body: {
              to: assignee.email,
              subject: `Nueva Tarea Asignada: ${project?.name || 'K-Tracker'}`,
              html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K-Tracker</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background-color: #0A4D8C; padding: 20px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .button { display: inline-block; background-color: #0A4D8C; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; margin: 20px 0; }
    .alert-box { background-color: #eef6fc; border-left: 4px solid #0A4D8C; padding: 15px; margin-top: 20px; font-size: 14px; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .link-text { color: #0A4D8C; word-break: break-all; }
    .task-details { background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0; border: 1px solid #eee; }
    .task-details p { margin: 5px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>K-Tracker</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${assignee.first_name || 'Usuario'}</strong>,</p>
      <p>Se te ha asignado una nueva tarea en el proyecto <strong>${project?.name || 'Sin nombre'}</strong>.</p>
      
      <div class="task-details">
        <p><strong>Descripción:</strong> ${payload.description}</p>
        <p><strong>Prioridad:</strong> <span style="color: ${payload.priority === 'high' || payload.priority === 'critical' ? '#e11d48' : '#333'}; font-weight: bold;">${payload.priority || 'Media'}</span></p>
        <p><strong>Vencimiento:</strong> ${payload.due_date ? payload.due_date.split('-').reverse().join('-') : 'Sin fecha'}</p>
      </div>

      <p>Para ver más detalles o comenzar a trabajar, accede a la tarea:</p>
      
      <div style="text-align: center;">
        <a href="${getAppUrl()}/tasks/${data.id}" class="button">Ver Tarea en K-Tracker</a>
      </div>

      <div class="alert-box">
        <strong>💡 Consejo:</strong><br>
        Mantén el estado de la tarea actualizado para que todo el equipo esté al tanto del progreso.
      </div>
      
      <p style="margin-top: 20px; font-size: 12px; color: #999;">Si el botón no funciona, copia este enlace: <br>
      <a href="${getAppUrl()}/tasks/${data.id}" class="link-text">${getAppUrl()}/tasks/${data.id}</a></p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} K-Tracker. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
              `
            }
          })
        }

      } catch (notifyError) {
        console.error('Error creating notification/email:', notifyError)
        // Don't throw, just log. Task is already created.
      }
    }

    return data
  }

  async function updateTask(taskId: string, payload: {
    description?: string
    assignee_id?: string
    priority?: string
    status?: string
    due_date?: string
    area_id?: string
  }) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()

    const { data, error } = await supabase!.from('tasks').update(payload).eq('id', taskId).select().single()
    if (error) throw error
    return data
  }

  async function deleteTask(taskId: string) {
    if (!SUPABASE_CONFIGURED) return
    const supabase = getSupabase()
    const { error } = await supabase!.from('tasks').delete().eq('id', taskId)
    if (error) throw error
  }

  return { setTaskStatus, reassignTask, setTaskPriority, addTaskComment, createTask, updateTask, deleteTask, uploadTaskAttachment }
}
export function useParticipants() {
  const mock = useMockParticipants()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!SUPABASE_CONFIGURED) return
    setLoading(true)
    setError(null)
    const supabase = getSupabase()
    const { data, error } = await supabase!.from('participants').select('*').order('last_name', { ascending: true })
    if (error) {
      setError(error.message)
    }
    setParticipants((data as Participant[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function reloadParticipants() {
    await load()
  }

  const getParticipantById = (id: string) => participants.find((p) => p.id === id)

  return { participants, loading, error, getParticipantById, reloadParticipants }
}

export function useParticipantActions() {
  async function createParticipant(payload: {
    first_name: string
    last_name: string
    email: string
    title?: string
    role?: string
    phone?: string
    area_id?: string
  }) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()

    // Get company_id
    const { data: sessionRes } = await supabase!.auth.getSession()
    const userObj = sessionRes?.session?.user

    if (!userObj?.id) throw new Error('Usuario no autenticado')

    let companyId = (userObj?.user_metadata as any)?.company_id

    if (!companyId) {
      const vc = await supabase!.from('user_company').select('company_id').eq('user_id', userObj.id).limit(1).single()
      if (vc.data?.company_id) companyId = vc.data.company_id
    }

    console.log('DEBUG: createParticipant companyId:', companyId)

    if (!companyId) throw new Error('No company ID found')

    // Sanitize payload
    const sanitizedPayload = {
      ...payload,
      title: payload.title?.trim() || null,
      role: payload.role?.trim() || null,
      phone: payload.phone?.trim() || null,
      area_id: payload.area_id || null,
    }

    // Invite user via Supabase Auth (Secondary Client)
    let userId = null
    let inviteSent = false
    try {
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      )

      // Generate a random temp password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: payload.email,
        password: tempPassword,
        options: {
          data: {
            first_name: payload.first_name,
            last_name: payload.last_name,
            company_id: companyId
          }
        }
      })

      if (authError) {
        console.error('Error inviting user:', authError)
        // We continue even if auth fails, to at least create the participant record
      } else if (authData.user) {
        userId = authData.user.id
        // Check if the user was actually created (identities array is not empty)
        // or if we got a user object back, we assume invite/signup was successful.
        // For existing users, signUp might return the user but not send an email if already confirmed.
        // But typically for new users, email is sent.
        inviteSent = true
      }
    } catch (err) {
      console.error('Error in invite process:', err)
    }

    const { data, error } = await supabase!.from('participants').insert({
      ...sanitizedPayload,
      company_id: companyId,
      user_id: userId,
      active: true
    }).select().single()

    if (error) throw error
    return { participant: data, inviteSent }
  }

  async function updateParticipant(id: string, payload: {
    first_name?: string
    last_name?: string
    email?: string
    title?: string
    role?: string
    phone?: string
    area_id?: string
    active?: boolean
  }) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()
    const { data, error } = await supabase!.from('participants').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  }

  async function deleteParticipant(id: string) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()

    // Get email before deleting to clean up auth user
    const { data: participant } = await supabase!.from('participants').select('email').eq('id', id).single()

    const { error } = await supabase!.from('participants').delete().eq('id', id)
    if (error) throw error

    // Try to delete from auth.users to allow re-registration (useful for testing)
    if (participant?.email) {
      try {
        await supabase!.rpc('delete_user_by_email', { email_input: participant.email })
      } catch (e) {
        console.warn('Could not delete auth user (likely permission issue or not needed):', e)
      }
    }
  }

  return { createParticipant, updateParticipant, deleteParticipant }
}

export function useAreas() {
  const mock = useMockAreas()
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!SUPABASE_CONFIGURED) return
    setLoading(true)
    const supabase = getSupabase()
    const { data, error } = await supabase!.from('area').select('*').order('name', { ascending: true })
    if (error) {
      setError(error.message)
    }
    setAreas((data as Area[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function reloadAreas() {
    await load()
  }

  const getAreaById = (id: string) => areas.find((a) => a.id === id)

  return { areas, loading, error, getAreaById, reloadAreas }
}

export function useAreaActions() {

  async function createArea(name: string, color: string) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()

    // Get company_id
    const { data: { user } } = await supabase!.auth.getUser()
    if (!user) return null

    let companyId = null
    const { data: uc } = await supabase!.from('user_company').select('company_id').eq('user_id', user.id).single()
    if (uc) companyId = uc.company_id
    else {
      const { data: p } = await supabase!.from('participants').select('company_id').eq('user_id', user.id).single()
      if (p) companyId = p.company_id
    }

    if (!companyId) throw new Error('No company found for user')

    const { data, error } = await supabase!.from('area').insert({ name, color, company_id: companyId }).select().single()
    if (error) throw error
    return data
  }

  async function updateArea(id: string, name: string, color: string) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()
    const { data, error } = await supabase!.from('area').update({ name, color }).eq('id', id).select().single()
    if (error) throw error
    return data
  }

  async function deleteArea(id: string) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()
    const { error } = await supabase!.from('area').delete().eq('id', id)
    if (error) throw error
  }

  async function createDefaultAreas(areasToCreate?: { name: string; color: string }[]) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()

    // Get company_id with fallback
    const { data: sessionRes } = await supabase!.auth.getSession()
    const userObj = sessionRes?.session?.user

    if (!userObj?.id) throw new Error('Usuario no autenticado')

    let companyId = (userObj?.user_metadata as any)?.company_id

    if (!companyId) {
      const vc = await supabase!.from('user_company').select('company_id').eq('user_id', userObj.id).limit(1).single()
      if (vc.data?.company_id) companyId = vc.data.company_id
    }

    if (!companyId) throw new Error('No company ID found')

    if (areasToCreate && areasToCreate.length > 0) {
      // Insert specific areas
      const payload = areasToCreate.map(area => ({
        company_id: companyId,
        name: area.name,
        color: area.color
      }))

      const { error } = await supabase!.from('area').upsert(payload, { onConflict: 'company_id, name', ignoreDuplicates: true })
      if (error) throw error
    } else {
      // Fallback to RPC if no areas provided (legacy behavior)
      const { error } = await supabase!.rpc('create_default_areas', {
        target_company_id: companyId
      })
      if (error) throw error
    }
  }

  return { createArea, updateArea, deleteArea, createDefaultAreas }
}

export function useCompany() {
  const updateCompany = async (id: string, updates: Partial<Company>) => {
    if (!SUPABASE_CONFIGURED) return { error: null }
    const supabase = getSupabase()!
    const { error } = await supabase
      .from('company')
      .update(updates)
      .eq('id', id)

    return { error }
  }

  return { updateCompany }
}

import { Company } from '../data/mockData';

export function useCurrentUser() {
  const [user, setUser] = useState<any>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [approvalStatus, setApprovalStatus] = useState<string>('pending')
  const [isInTrial, setIsInTrial] = useState(false)
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false)
      return
    }
    const supabase = getSupabase()!

    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          let fetchedCompanyId = null;

          // Check if user is a Platform Admin
          const { data: adminUser } = await supabase.from('admin_users').select('role').eq('user_id', user.id).maybeSingle()
          if (adminUser) {
            setIsPlatformAdmin(true)
          }

          // Check if user is an admin (exists in user_company)
          const { data: userCompany } = await supabase.from('user_company').select('id, company_id').eq('user_id', user.id).maybeSingle()
          if (userCompany) {
            setIsAdmin(true)
            fetchedCompanyId = userCompany.company_id
          }

          // Also fetch participant data (admins can also be participants)
          const { data: participantData } = await supabase.from('participants').select('*').eq('user_id', user.id).maybeSingle()
          setParticipant(participantData)

          // If not admin but is participant, use participant's company_id
          if (!fetchedCompanyId && participantData) {
            fetchedCompanyId = participantData.company_id
          }

          // Fetch Company Details if we have an ID
          if (fetchedCompanyId) {
            const { data: companyData } = await supabase.from('company').select('*').eq('id', fetchedCompanyId).single()
            setCompany(companyData)

            if (companyData) {
              setApprovalStatus(companyData.approval_status || 'pending')

              const trialDays = companyData.trial_days || 14
              const createdAt = new Date(companyData.created_at)
              const trialEnd = new Date(createdAt.getTime() + (trialDays * 24 * 60 * 60 * 1000))
              setTrialEndsAt(trialEnd)

              setIsInTrial(new Date() < trialEnd)
            }
          }
        }
      } catch (e) {
        console.error('Error fetching current user:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, []) // Run once on mount

  return { user, participant, isAdmin, isPlatformAdmin, company, loading, approvalStatus, isInTrial, trialEndsAt }
}





export function useProjectResources(projectId: string) {
  const [resources, setResources] = useState<Participant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!projectId) return
    if (!SUPABASE_CONFIGURED) return
    setLoading(true)
    setError(null)
    const supabase = getSupabase()

    // Join project_participants with participants
    const { data, error } = await supabase!
      .from('project_participants')
      .select('participant_id, participants(*)')
      .eq('project_id', projectId)

    if (error) {
      setError(error.message)
    }

    // Flatten the result to return just the participant objects
    const mappedResources = (data || []).map((item: any) => item.participants).filter(Boolean) as Participant[]
    setResources(mappedResources)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [projectId])

  async function addResource(participantId: string, role?: string) {
    if (!SUPABASE_CONFIGURED) return
    const supabase = getSupabase()
    const { error } = await supabase!.from('project_participants').insert({
      project_id: projectId,
      participant_id: participantId,
      role
    })
    if (error) throw error
    await load()
  }

  async function removeResource(participantId: string) {
    if (!SUPABASE_CONFIGURED) return
    const supabase = getSupabase()
    const { error } = await supabase!.from('project_participants').delete().match({
      project_id: projectId,
      participant_id: participantId
    })
    if (error) throw error
    await load()
  }

  return { resources, loading, error, addResource, removeResource, reloadResources: load }
}


export function useMinuteActions() {
  async function createMinute(
    projectId: string,
    meetingDate: string,
    location?: string,
    startTime?: string,
    endTime?: string,
    notes?: string
  ) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()
    const { data, error } = await supabase!.rpc('create_minute_with_number', {
      p_project_id: projectId,
      p_meeting_date: meetingDate,
      p_location: location,
      p_start_time: startTime,
      p_end_time: endTime,
      p_notes: notes
    })
    if (error) throw error
    return data?.[0]
  }

  async function countPendingTasks(projectId: string) {
    if (!SUPABASE_CONFIGURED) return 0
    const supabase = getSupabase()
    const { data, error } = await supabase!.rpc('count_pending_tasks_for_project', {
      p_project_id: projectId
    })
    if (error) throw error
    return data || 0
  }

  async function copyTasksToMinute(minuteId: string) {
    if (!SUPABASE_CONFIGURED) return []
    const supabase = getSupabase()
    const { data, error } = await supabase!.rpc('copy_tasks_to_new_minute', {
      new_minute_id: minuteId
    })
    if (error) throw error
    return data || []
  }

  async function updateMinute(minuteId: string, payload: { status?: string; meeting_date?: string; location?: string; start_time?: string; end_time?: string; notes?: string }) {
    if (!SUPABASE_CONFIGURED) return null
    const supabase = getSupabase()
    const { data, error } = await supabase!.from('minutes').update(payload).eq('id', minuteId).select().single()
    if (error) throw error
    return data
  }

  async function dissociatePendingTasks(minuteId: string) {
    if (!SUPABASE_CONFIGURED) return
    const supabase = getSupabase()
    const { error } = await supabase!.rpc('dissociate_pending_tasks', { p_minute_id: minuteId })
    if (error) throw error
  }

  async function associateTasksToMinute(minuteId: string, taskIds: string[]) {
    if (!SUPABASE_CONFIGURED) return
    const supabase = getSupabase()
    const { error } = await supabase!.rpc('associate_tasks_to_minute', { p_minute_id: minuteId, p_task_ids: taskIds })
    if (error) throw error
  }

  return { createMinute, countPendingTasks, copyTasksToMinute, updateMinute, dissociatePendingTasks, associateTasksToMinute }
}

