import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, MapPin, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import StatsCard from '@/components/dashboard/StatsCard';
import RecentActivity from '@/components/dashboard/RecentActivity';
import RevenueChart from '@/components/dashboard/RevenueChart';
import BookingsChart from '@/components/dashboard/BookingsChart';
import PopularDestinations from '@/components/dashboard/PopularDestinations';
import QuickActions from '@/components/dashboard/QuickActions';
import axiosInstance from '@/api/axios';

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [bookings, destinations, countries, contacts] = await Promise.all([
        axiosInstance.get('/api/bookings/stats'),
        axiosInstance.get('/api/destinations/stats'),
        axiosInstance.get('/api/countries/stats'),
        axiosInstance.get('/api/contact/stats'),
      ]);
      return {
        bookings: bookings.data,
        destinations: destinations.data,
        countries: countries.data,
        contacts: contacts.data,
      };
    },
  });

  const statsData = [
    {
      label: 'Total Bookings',
      value: stats?.bookings?.total || 0,
      icon: Calendar,
      trend: '+12.5%',
      color: 'blue',
    },
    {
      label: 'Destinations',
      value: stats?.destinations?.total || 0,
      icon: MapPin,
      trend: '+8.2%',
      color: 'green',
    },
    {
      label: 'Countries',
      value: stats?.countries?.total || 0,
      icon: Users,
      trend: '+3.1%',
      color: 'purple',
    },
    {
      label: 'Messages',
      value: stats?.contacts?.unread || 0,
      icon: TrendingUp,
      trend: 'urgent',
      color: 'red',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back! Here's what's happening with your platform today.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Cards */}
      {statsLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatsCard {...stat} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <RevenueChart />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <BookingsChart />
        </motion.div>
      </div>

      {/* Popular Destinations & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <PopularDestinations />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <RecentActivity />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;