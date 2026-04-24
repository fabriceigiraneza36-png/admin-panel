import { motion } from 'framer-motion';
import { Edit2, Trash2, Eye, MapPin } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

const DestinationList = ({ destinations, onEdit, onDelete }) => {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Destination</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Country</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Category</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {destinations.map((destination, index) => (
              <motion.tr
                key={destination.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {destination.image_url && (
                      <img
                        src={destination.image_url}
                        alt={destination.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{destination.name}</p>
                      <p className="text-xs text-gray-500">{destination.region}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-700">{destination.country_name}</td>
                <td className="py-3 px-4">
                  <Badge variant="info">{destination.category}</Badge>
                </td>
                <td className="py-3 px-4">
                  <Badge
                    variant={destination.status === 'published' ? 'success' : 'warning'}
                  >
                    {destination.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(destination.id)}
                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => onEdit(destination.id)}
                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Edit2 className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => onDelete(destination.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default DestinationList;