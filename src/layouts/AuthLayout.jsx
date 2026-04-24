import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';

const AuthLayout = () => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Altuvera Admin</h1>
          <p className="text-gray-600 mt-2">Manage your travel platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Outlet />
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          © 2024 Altuvera Travel. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};

export default AuthLayout;