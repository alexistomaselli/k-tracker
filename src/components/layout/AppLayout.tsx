import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <Navbar isAuthenticated onMenuClick={() => setSidebarOpen(true)} onLogout={handleLogout} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
