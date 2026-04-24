import { useQuery } from '@tanstack/react-query';
import { Calendar, Mail, User, MapPin } from 'lucide-react';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatters } from '@/utils/formatters';
import axiosInstance from '@/api/axios';

const RecentActivity = () => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/bookings', {
        params: { limit: 5, sort: 'created_at', order: 'DESC' },
      });
      return response.data;
    },
  });

  const getActivityIcon = (type) => {
    switch (type) {
      case 'booking':
        return Calendar;
      case 'message':
        return Mail;
      case 'destination':
        return MapPin;
      default:
        return User;
    }
  };

  return (
    <Card title="Recent Activity" subtitle="Latest bookings and updates">
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-3">
          {activities?.data?.map((activity) => {
            const Icon = getActivityIcon('booking');
            return (
              <div key={activity.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    New booking from {activity.full_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatters.timeAgo(activity.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default RecentActivity;