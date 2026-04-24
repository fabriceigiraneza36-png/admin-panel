import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, MessageSquare } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { MESSAGE_PRIORITIES } from '@/utils/constants';

const MessageCard = ({ message, onReply, onDelete }) => {
  const priorityColors = {
    low: 'info',
    normal: 'default',
    high: 'warning',
    urgent: 'error',
  };

  return (
    <motion.div whileHover={{ y: -4 }}>
      <Card hoverable>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {message.full_name}
              </h3>
              <Badge variant={priorityColors[message.priority]} className="mt-2">
                {message.priority}
              </Badge>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-2 border-t border-b border-gray-100 py-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <p className="text-sm text-gray-600">{message.email}</p>
            </div>
            {message.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-600">{message.phone}</p>
              </div>
            )}
          </div>

          {/* Subject & Message */}
          <div>
            {message.subject && (
              <>
                <p className="text-xs text-gray-500 font-medium">Subject</p>
                <p className="text-sm text-gray-900 font-medium mb-3">
                  {message.subject}
                </p>
              </>
            )}
            <p className="text-sm text-gray-700 leading-relaxed">
              {message.message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <Button
              size="sm"
              icon={MessageSquare}
              onClick={() => onReply(message.id)}
              fullWidth
            >
              Reply
            </Button>
            <button
              onClick={() => onDelete(message.id)}
              className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default MessageCard;