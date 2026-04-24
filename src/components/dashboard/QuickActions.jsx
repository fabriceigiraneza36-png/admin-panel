import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FileText, MapPin, Calendar, Mail, Users } from 'lucide-react';
import Button from '../common/Button';

const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'New Booking',
      icon: Calendar,
      action: () => navigate('/bookings'),
      color: 'blue',
    },
    {
      label: 'New Destination',
      icon: MapPin,
      action: () => navigate('/destinations/create'),
      color: 'green',
    },
    {
      label: 'New Post',
      icon: FileText,
      action: () => navigate('/posts/create'),
      color: 'purple',
    },
    {
      label: 'View Messages',
      icon: Mail,
      action: () => navigate('/contact'),
      color: 'orange',
    },
    {
      label: 'Team Members',
      icon: Users,
      action: () => navigate('/team'),
      color: 'pink',
    },
  ];

  const colorMap = {
    blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
    green: 'bg-green-100 text-green-600 hover:bg-green-200',
    purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
    orange: 'bg-orange-100 text-orange-600 hover:bg-orange-200',
    pink: 'bg-pink-100 text-pink-600 hover:bg-pink-200',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={action.action}
            className={`p-4 rounded-xl transition-all ${colorMap[action.color]} flex flex-col items-center justify-center gap-2 hover:shadow-md`}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs font-medium text-center">{action.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default QuickActions;