import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import Login from './pages/Login';
import LoginResponsable from './pages/LoginResponsable';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Minutes from './pages/Minutes';
import MinuteDetail from './pages/MinuteDetail';
import TaskDetail from './pages/TaskDetail';
import MyTasks from './pages/MyTasks';
import Areas from './pages/Areas';
import HumanResources from './pages/HumanResources';
import AppLayout from './components/layout/AppLayout';
import { RequireAuth, RequireAdmin } from './components/auth/ProtectedRoutes';
import { ToastProvider } from './context/ToastContext';

import MyAccount from './pages/MyAccount';
import Billing from './pages/Billing';
import AdminLayout from './components/layout/AdminLayout';
import { AdminDashboard } from './pages/admin/Placeholders';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminPlans from './pages/admin/AdminPlans';
import AdminPayments from './pages/admin/AdminPayments';
import AdminBankAccounts from './pages/admin/AdminBankAccounts';
import WhatsAppSettings from './pages/WhatsAppSettings';

import SelectPlan from './pages/SelectPlan';

import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';

function App() {
  return (
    <UserProvider>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/login-responsable" element={<LoginResponsable />} />

              <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Admin Only Routes */}
                <Route element={<RequireAdmin><Outlet /></RequireAdmin>}>
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:projectId" element={<ProjectDetail />} />
                  <Route path="/areas" element={<Areas />} />
                  <Route path="/hr" element={<HumanResources />} />
                  <Route path="/minutes" element={<Minutes />} />
                </Route>

                <Route path="/minutes/:minuteId" element={<MinuteDetail />} />
                <Route path="/tasks/:taskId" element={<TaskDetail />} />
                <Route path="/my-tasks" element={<MyTasks />} />
                <Route path="/my-account" element={<MyAccount />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/select-plan" element={<SelectPlan />} />
                <Route path="/whatsapp" element={<WhatsAppSettings />} />
              </Route>

              {/* KAI PRO Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="companies" element={<AdminCompanies />} />
                <Route path="plans" element={<AdminPlans />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="bank-accounts" element={<AdminBankAccounts />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </UserProvider>
  );
}

export default App;
