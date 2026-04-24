import { motion } from 'framer-motion';
import { Edit2, Trash2, Eye, MapPin } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

const CountryList = ({ countries, onEdit, onDelete }) => {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Country</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Capital</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Continent</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Destinations</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((country, index) => (
              <motion.tr
                key={country.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{country.flag}</span>
                    <div>
                      <p className="font-medium text-gray-900">{country.name}</p>
                      <p className="text-xs text-gray-500">{country.region}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <p className="text-gray-700">{country.capital}</p>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="info">{country.continent}</Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{country.destinations_count || 0}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(country.id)}
                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                      title="View"
                    >
                      <Eye className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => onEdit(country.id)}
                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => onDelete(country.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
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

export default CountryList;