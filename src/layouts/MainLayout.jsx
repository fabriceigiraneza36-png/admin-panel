import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useSocket } from '@/hooks/useSocket';
import { motion } from 'framer-motion';

const MainLayout = () => {
  const { isAuthenticated } = useAuthStore();
  const { sidebarOpen, sidebarCollapsed } = useUIStore();

  // Initialize socket connection
  useSocket();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const getMainMargin = () => {
    if (!sidebarOpen) return 'ml-0';
    if (sidebarCollapsed) return 'ml-20';
    return 'ml-[280px]';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarOpen ? (sidebarCollapsed ? 80 : 280) : 0 }}
        transition={{ duration: 0.3 }}
        className="pt-16 min-h-screen transition-all duration-300"
      >
        <div className="p-6">
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
};

export default MainLayout;