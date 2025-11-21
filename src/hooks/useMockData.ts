import { useState } from 'react';
import {
  mockProjects,
  mockMinutes,
  mockTasks,
  mockParticipants,
  mockAreas,
  mockComments,
  mockActivities,
  mockAgendaItems,
  mockAttendance,
  Project,
  Minute,
  Task,
  Participant,
  Area,
  Comment,
  Activity,
} from '../data/mockData';

export function useMockProjects() {
  const [projects] = useState<Project[]>(mockProjects);
  const [loading] = useState(false);

  const getProjectById = (id: string) => projects.find((p) => p.id === id);

  return { projects, loading, getProjectById };
}

export function useMockMinutes() {
  const [minutes] = useState<Minute[]>(mockMinutes);
  const [loading] = useState(false);

  const getMinuteById = (id: string) => minutes.find((m) => m.id === id);
  const getMinutesByProject = (projectId: string) =>
    minutes.filter((m) => m.project_id === projectId);

  return { minutes, loading, getMinuteById, getMinutesByProject };
}

export function useMockTasks() {
  const [tasks] = useState<Task[]>(mockTasks);
  const [loading] = useState(false);

  const getTaskById = (id: string) => tasks.find((t) => t.id === id);
  const getTasksByProject = (projectId: string) =>
    tasks.filter((t) => t.project_id === projectId);
  const getTasksByMinute = (minuteId: string) =>
    tasks.filter((t) => t.minute_id === minuteId);
  const getTasksByAssignee = (assigneeId: string) =>
    tasks.filter((t) => t.assignee_id === assigneeId);

  return {
    tasks,
    loading,
    getTaskById,
    getTasksByProject,
    getTasksByMinute,
    getTasksByAssignee,
  };
}

export function useMockParticipants() {
  const [participants] = useState<Participant[]>(mockParticipants);
  const [loading] = useState(false);

  const getParticipantById = (id: string) => participants.find((p) => p.id === id);

  return { participants, loading, getParticipantById };
}

export function useMockAreas() {
  const [areas] = useState<Area[]>(mockAreas);

  const getAreaById = (id: string) => areas.find((a) => a.id === id);

  return { areas, getAreaById };
}

export function useMockTaskFeed(taskId: string) {
  const [comments] = useState<Comment[]>(
    mockComments.filter((c) => c.task_id === taskId)
  );
  const [activities] = useState<Activity[]>(
    mockActivities.filter((a) => a.task_id === taskId)
  );
  const [loading] = useState(false);

  const feed = [...comments, ...activities].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return { comments, activities, feed, loading };
}

export function useMockAgenda(minuteId: string) {
  const [agendaItems] = useState(
    mockAgendaItems.filter((a) => a.minute_id === minuteId)
  );
  const [loading] = useState(false);

  return { agendaItems, loading };
}

export function useMockAttendance(minuteId: string) {
  const [attendance] = useState(
    mockAttendance.filter((a) => a.minute_id === minuteId)
  );
  const [loading] = useState(false);

  return { attendance, loading };
}

export function calculateDaysLeft(dueDate: string): number {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function isTaskOverdue(task: Task): boolean {
  if (task.status === 'completed' || task.status === 'canceled' || task.status === 'permanent') {
    return false;
  }
  return calculateDaysLeft(task.due_date) < 0;
}
