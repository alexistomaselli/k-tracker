import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import Login from './pages/Login';
import LoginResponsable from './pages/LoginResponsable';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Minutes from './pages/Minutes';
import MinuteDetail from './pages/MinuteDetail';
import TaskDetail from './pages/TaskDetail';
import MyTasks from './pages/MyTasks';
import AppLayout from './components/layout/AppLayout';
import { RequireAuth } from './hooks/useAuth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login-responsable" element={<LoginResponsable />} />

        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/minutes" element={<Minutes />} />
          <Route path="/minutes/:minuteId" element={<MinuteDetail />} />
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
          <Route path="/my-tasks" element={<MyTasks />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
