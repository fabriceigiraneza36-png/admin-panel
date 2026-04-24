import { motion } from 'framer-motion';
import { Edit2, Trash2, Eye, Calendar, User } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { formatters } from '@/utils/formatters';

const PostCard = ({ post, onEdit, onDelete, onView }) => {
  return (
    <motion.div whileHover={{ y: -4 }}>
      <Card hoverable>
        {/* Image */}
        {post.image_url && (
          <div className="h-40 -m-6 mb-4 rounded-t-xl overflow-hidden">
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {post.title}
            </h3>
            <Badge variant="info" className="mt-2">
              {post.category}
            </Badge>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2">
            {post.excerpt}
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {post.author_name}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatters.date(post.created_at)}
            </span>
          </div>

          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <Button
              size="sm"
              variant="outline"
              icon={Eye}
              onClick={onView}
              fullWidth
            >
              View
            </Button>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              <span className="text-sm font-medium">Edit</span>
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default PostCard;