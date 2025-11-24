import { useEffect, useState } from 'react'
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase'
import { Project, Minute, Task, Participant, Area } from '../data/mockData'
import { useMockProjects, useMockMinutes, useMockTasks, useMockTaskFeed, useMockParticipants, useMockAreas } from './useMockData'

export function useProjects() {
  const mock = useMockProjects()
  const [projects, setProjects] = useState<Project[]>(mock.projects)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!SUPABASE_CONFIGURED) return
      setLoading(true)
      const supabase = getSupabase()
      const { data } = await supabase!.from('project').select('*').order('created_at', { ascending: false })
      setProjects((data as Project[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const getProjectById = (id: string) => projects.find((p) => p.id === id)

  return { projects, loading, getProjectById }
}

export function useMinutes() {
  const mock = useMockMinutes()
  const [minutes, setMinutes] = useState<Minute[]>(mock.minutes)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!SUPABASE_CONFIGURED) return
      setLoading(true)
      const supabase = getSupabase()
      const { data } = await supabase!.from('minutes').select('*').order('meeting_date', { ascending: false })
      setMinutes((data as Minute[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const getMinuteById = (id: string) => minutes.find((m) => m.id === id)
  const getMinutesByProject = (projectId: string) => minutes.filter((m) => m.project_id === projectId)

  return { minutes, loading, getMinuteById, getMinutesByProject }
}

export function useTasks() {
  const mock = useMockTasks()
  const [tasks, setTasks] = useState<Task[]>(mock.tasks)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!SUPABASE_CONFIGURED) return
      setLoading(true)
      const supabase = getSupabase()
      const { data } = await supabase!.from('tasks').select('*').order('due_date', { ascending: true })
      setTasks((data as Task[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const getTaskById = (id: string) => tasks.find((t) => t.id === id)
  const getTasksByProject = (projectId: string) => tasks.filter((t) => t.project_id === projectId)
  const getTasksByMinute = (minuteId: string) => tasks.filter((t) => t.minute_id === minuteId)
  const getTasksByAssignee = (assigneeId: string) => tasks.filter((t) => t.assignee_id === assigneeId)

  return { tasks, loading, getTaskById, getTasksByProject, getTasksByMinute, getTasksByAssignee }
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
  useEffect(() => {
    async function load() {
      if (!minuteId) return
      if (!SUPABASE_CONFIGURED) return
      setLoading(true)
      const supabase = getSupabase()
      const { data } = await supabase!.from('minute_attendance').select('*').eq('minute_id', minuteId)
      setRows(data ?? [])
      setLoading(false)
    }
    load()
  }, [minuteId])
  return { attendance: rows, loading }
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
  return { setTaskStatus, reassignTask, addTaskComment }
}
export function useParticipants() {
  const mock = useMockParticipants()
  const [participants, setParticipants] = useState<Participant[]>(mock.participants)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!SUPABASE_CONFIGURED) return
      setLoading(true)
      const supabase = getSupabase()
      const { data } = await supabase!.from('participants').select('*').order('last_name', { ascending: true })
      setParticipants((data as Participant[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const getParticipantById = (id: string) => participants.find((p) => p.id === id)

  return { participants, loading, getParticipantById }
}

export function useAreas() {
  const mock = useMockAreas()
  const [areas, setAreas] = useState<Area[]>(mock.areas)

  useEffect(() => {
    async function load() {
      if (!SUPABASE_CONFIGURED) return
      const supabase = getSupabase()
      const { data } = await supabase!.from('area').select('*').order('name', { ascending: true })
      setAreas((data as Area[]) ?? [])
    }
    load()
  }, [])

  const getAreaById = (id: string) => areas.find((a) => a.id === id)

  return { areas, getAreaById }
}
