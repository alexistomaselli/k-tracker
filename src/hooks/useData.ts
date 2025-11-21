import { useEffect, useState } from 'react'
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase'
import {
  Project,
  Minute,
  Task,
} from '../data/mockData'
import {
  useMockProjects,
  useMockMinutes,
  useMockTasks,
} from './useMockData'

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