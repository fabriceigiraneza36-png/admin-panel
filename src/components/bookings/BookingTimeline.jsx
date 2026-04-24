import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Card from '../common/Card';
import { formatters } from '@/utils/formatters';

const BookingTimeline = ({ booking }) => {
  const timeline = [
    {
      status: 'created',
      label: 'Booking Created',
      date: booking.created_at,
      icon: CheckCircle,
      color: 'green',
    },
    {
      status: 'pending',
      label: 'Awaiting Confirmation',
      date: booking.pending_since,
      icon: Clock,
      color: 'yellow',
    },
    {
      status: 'confirmed',
      label: 'Booking Confirmed',
      date: booking.confirmed_at,
      icon: CheckCircle,
      color: 'green',
    },
  ];

  const colorMap = {
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <Card title="Timeline" subtitle="Booking history">
      <div className="space-y-4">
        {timeline.map((event, index) => {
          const Icon = event.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-4"
            >
              <div className="flex flex-col items-center">
                <div className={`p-2 rounded-full ${colorMap[event.color]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                {index < timeline.length - 1 && (
                  <div className="w-0.5 h-12 bg-gray-200 mt-2" />
                )}
              </div>
              <div className="pt-1">
                <p className="font-medium text-gray-900">{event.label}</p>
                {event.date && (
                  <p className="text-sm text-gray-500">
                    {formatters.dateTime(event.date)}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
};

export default BookingTimeline;