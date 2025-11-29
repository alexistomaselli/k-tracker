import { useEffect, useState } from 'react'
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase'
import { Project, Minute, Task, Participant, Area } from '../data/mockData'
import { useMockProjects, useMockMinutes, useMockTasks, useMockTaskFeed, useMockParticipants, useMockAreas } from './useMockData'

export function useProjects() {
  const mock = useMockProjects()
  const [projects, setProjects] = useState<Project[]>(mock.projects)
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
  const [minutes, setMinutes] = useState<Minute[]>(mock.minutes)
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
  const [tasks, setTasks] = useState<Task[]>(mock.tasks)
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
  return { agendaItems: items, loading }
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
  useEffect(() => {
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
      const mappedActivity = (activity ?? []).map((a: any) => ({
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
    load()
  }, [taskId])
  return { feed }
}

export function useTaskActions() {
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
    const { data: project } = await supabase!.from('project').select('company_id').eq('id', payload.project_id).single()
    if (!project) throw new Error('Project not found')

    const insertPayload = {
      ...payload,
      company_id: project.company_id,
      status: payload.status || 'pending',
      priority: payload.priority || 'medium'
    }

    const { data, error } = await supabase!.from('tasks').insert(insertPayload).select().single()
    if (error) throw error
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

  return { setTaskStatus, reassignTask, addTaskComment, createTask, updateTask, deleteTask }
}
export function useParticipants() {
  const mock = useMockParticipants()
  const [participants, setParticipants] = useState<Participant[]>(mock.participants)
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

    if (!companyId) throw new Error('No company ID found')

    const { data, error } = await supabase!.from('participants').insert({
      ...payload,
      company_id: companyId,
      active: true
    }).select().single()

    if (error) throw error
    return data
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
    const { error } = await supabase!.from('participants').delete().eq('id', id)
    if (error) throw error
  }

  return { createParticipant, updateParticipant, deleteParticipant }
}

export function useAreas() {
  const mock = useMockAreas()
  const [areas, setAreas] = useState<Area[]>(mock.areas)
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
    const { data: sessionRes } = await supabase!.auth.getSession()
    const userObj = sessionRes?.session?.user
    const uid = userObj?.id
    const claimCompany = (userObj?.user_metadata as any)?.company_id

    if (!claimCompany) throw new Error('No company ID found')

    const { data, error } = await supabase!.from('area').insert({
      company_id: claimCompany,
      name,
      color
    }).select().single()

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

  return { createMinute, countPendingTasks, copyTasksToMinute, updateMinute }
}

