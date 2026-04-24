import { motion } from 'framer-motion';
import { MapPin, Edit2, Trash2, Eye, Star, Globe } from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { formatters } from '@/utils/formatters';

const CountryCard = ({ country, onEdit, onDelete, onView }) => {
  return (
    <motion.div whileHover={{ y: -4 }} className="h-full">
      <Card hoverable className="h-full flex flex-col">
        {/* Image Section */}
        <div className="relative h-48 -m-6 mb-4 rounded-t-xl overflow-hidden bg-gradient-to-br from-primary-300 to-primary-600">
          {country.cover_image_url ? (
            <img
              src={country.cover_image_url}
              alt={country.name}
              className="w-full h-full object-cover"
            />
          ) : country.image_url ? (
            <img
              src={country.image_url}
              alt={country.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600">
              <div className="text-center">
                <Globe className="h-16 w-16 text-white opacity-30 mx-auto mb-2" />
                <span className="text-5xl">{country.flag || '🌍'}</span>
              </div>
            </div>
          )}

          {/* Featured Badge */}
          {country.is_featured && (
            <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 p-2 rounded-lg shadow-lg">
              <Star className="h-5 w-5 fill-current" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col space-y-3">
          {/* Title and Flag */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              {country.flag && <span className="text-2xl">{country.flag}</span>}
              <h3 className="text-lg font-bold text-gray-900 line-clamp-1">
                {country.name}
              </h3>
            </div>
            {country.capital && (
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Capital: {country.capital}
              </p>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {country.continent && (
              <Badge variant="info" size="sm">
                {country.continent}
              </Badge>
            )}
            {country.region && (
              <Badge variant="default" size="sm">
                {country.region}
              </Badge>
            )}
            {country.is_active ? (
              <Badge variant="success" size="sm">
                Active
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                Inactive
              </Badge>
            )}
          </div>

          {/* Description */}
          {country.description && (
            <p className="text-sm text-gray-600 line-clamp-2 flex-grow">
              {country.description}
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 py-3 border-t border-gray-100 text-center">
            <div>
              <p className="text-xs text-gray-500">Population</p>
              <p className="text-sm font-semibold text-gray-900">
                {country.population ? formatters.number(Math.floor(country.population / 1000000)) + 'M' : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Area</p>
              <p className="text-sm font-semibold text-gray-900">
                {country.area ? formatters.number(Math.floor(country.area / 1000)) + 'K km²' : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Languages</p>
              <p className="text-sm font-semibold text-gray-900">
                {country.languages?.length || 0}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <Button
              size="sm"
              variant="outline"
              icon={Eye}
              onClick={() => onView(country.id)}
              fullWidth
              className="flex-1"
            >
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={Edit2}
              onClick={() => onEdit(country.id)}
              fullWidth
              className="flex-1"
            >
              Edit
            </Button>
            <button
              onClick={() => onDelete(country.id)}
              className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors border border-red-200"
              title="Delete Country"
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