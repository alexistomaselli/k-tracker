import { useEffect, useState } from 'react'
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase'
import {
  Project,
  Minute,
  Task,
  Participant,
  Area,
} from '../data/mockData'
import {
  useMockProjects,
  useMockMinutes,
  useMockTasks,
  useMockParticipants,
  useMockAreas,
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
