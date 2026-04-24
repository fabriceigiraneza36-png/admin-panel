import { motion } from 'framer-motion';
import { Trash2, Star, Archive, Mail } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { MESSAGE_PRIORITIES } from '@/utils/constants';
import { formatters } from '@/utils/formatters';

const MessageList = ({ messages, onView, onDelete, onToggleStar, onArchive }) => {
  const priorityColors = {
    low: 'info',
    normal: 'default',
    high: 'warning',
    urgent: 'error',
  };

  return (
    <Card>
      <div className="divide-y divide-gray-200">
        {messages.map((msg, index) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-4">
              <input type="checkbox" className="mt-1" />

              <div
                className="flex-1 cursor-pointer"
                onClick={() => onView(msg.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-gray-900">{msg.full_name}</p>
                    {!msg.is_read && (
                      <div className="w-2 h-2 bg-primary-600 rounded-full" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatters.timeAgo(msg.created_at)}
                  </span>
                </div>

                <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                  {msg.subject}
                </p>

                <p className="text-sm text-gray-500 line-clamp-2">
                  {msg.message}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={priorityColors[msg.priority]} size="sm">
                    {msg.priority}
                  </Badge>
                  {msg.is_read && (
                    <Badge variant="info" size="sm">Read</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onToggleStar(msg.id)}
                  className={`p-2 rounded transition-colors ${msg.is_starred ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:bg-gray-200'}`}
                >
                  <Star className="h-4 w-4" fill="currentColor" />
                </button>
                <button
                  onClick={() => onArchive(msg.id)}
                  className="p-2 rounded text-gray-400 hover:bg-gray-200 transition-colors"
                >
                  <Archive className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(msg.id)}
                  className="p-2 rounded text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};

export default MessageList;