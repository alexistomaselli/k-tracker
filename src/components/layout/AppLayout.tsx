import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useCurrentUser } from '../../hooks/useData';

import Gatekeeper from '../auth/Gatekeeper';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isPlatformAdmin, loading } = useCurrentUser();

  useEffect(() => {
    if (!loading && isPlatformAdmin) {
      navigate('/admin');
    }
  }, [isPlatformAdmin, loading, navigate]);

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <Navbar
        isAuthenticated={isAuthenticated}
        onMenuClick={() => setSidebarOpen(true)}
        onLogout={handleLogout}
        userLabel={user?.email || (user?.user_metadata as { name?: string })?.name || 'Usuario'}
      />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8" role="main">
          <Gatekeeper>
            <Outlet />
          </Gatekeeper>
        </main>
      </div>
    </div>
  );
}
