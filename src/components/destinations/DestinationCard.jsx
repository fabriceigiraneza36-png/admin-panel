import { motion } from 'framer-motion';
import { MapPin, Edit2, Trash2, Eye, Star } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

const DestinationCard = ({ destination, onEdit, onDelete }) => {
  return (
    <motion.div whileHover={{ y: -4 }}>
      <Card hoverable>
        {/* Image */}
        <div className="relative h-48 -m-6 mb-4 rounded-t-xl overflow-hidden bg-gray-200">
          {destination.image_url ? (
            <img
              src={destination.image_url}
              alt={destination.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-300 to-primary-600">
              <MapPin className="h-12 w-12 text-white opacity-50" />
            </div>
          )}
          {destination.is_featured && (
            <div className="absolute top-2 right-2 bg-yellow-500 text-white p-2 rounded-lg">
              <Star className="h-4 w-4 fill-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {destination.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {destination.country_name} • {destination.region}
            </p>
          </div>

          <div className="flex gap-2">
            <Badge variant="info">{destination.category}</Badge>
            <Badge variant={destination.status === 'published' ? 'success' : 'warning'}>
              {destination.status}
            </Badge>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2">
            {destination.short_description}
          </p>

          <div className="flex gap-2 pt-4 border-t border-gray-100">
            <Button
              size="sm"
              variant="outline"
              icon={Eye}
              onClick={onEdit}
              fullWidth
            >
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={Edit2}
              onClick={onEdit}
              fullWidth
            >
              Edit
            </Button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default DestinationCard;