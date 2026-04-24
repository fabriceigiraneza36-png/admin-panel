import { motion } from 'framer-motion';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

const StatsCard = ({ label, value, icon: Icon, trend, color }) => {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  const trendIsNegative = trend?.startsWith('-');
  const trendIsUrgent = trend === 'urgent';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', colorMap[color])}>
          <Icon className="h-6 w-6" />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-semibold',
            trendIsUrgent ? 'text-red-600' : trendIsNegative ? 'text-red-600' : 'text-green-600'
          )}>
            {trendIsUrgent ? (
              <>
                <AlertCircle className="h-4 w-4" />
                {trend}
              </>
            ) : (
              <>
                <TrendingUp className={cn('h-4 w-4', trendIsNegative && 'rotate-180')} />
                {trend}
              </>
            )}
          </div>
        )}
      </div>

      <h3 className="text-gray-600 text-sm font-medium mb-1">{label}</h3>
      <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </motion.div>
  );
};

export default StatsCard;