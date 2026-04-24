import { motion } from 'framer-motion';
import { MapPin, Edit2, Trash2, Eye } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

const CountryCard = ({ country, onEdit, onDelete }) => {
  return (
    <motion.div whileHover={{ y: -4 }}>
      <Card hoverable>
        {/* Image */}
        <div className="relative h-48 -m-6 mb-4 rounded-t-xl overflow-hidden bg-gray-200">
          {country.cover_image_url ? (
            <img
              src={country.cover_image_url}
              alt={country.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-300 to-primary-600">
              <span className="text-4xl">{country.flag}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span>{country.flag}</span>
              {country.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{country.capital}</p>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2">
            {country.description}
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

export default CountryCard;