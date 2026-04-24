import { motion } from 'framer-motion';
import { Edit2, Trash2, Eye, Users, TrendingUp } from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { formatters } from '@/utils/formatters';

const CountryList = ({ countries, onEdit, onDelete, onView, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table Header */}
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="text-left py-4 px-6 font-semibold text-gray-900">Country</th>
              <th className="text-left py-4 px-6 font-semibold text-gray-900">Capital</th>
              <th className="text-left py-4 px-6 font-semibold text-gray-900">Continent</th>
              <th className="text-left py-4 px-6 font-semibold text-gray-900">Region</th>
              <th className="text-center py-4 px-6 font-semibold text-gray-900">Population</th>
              <th className="text-center py-4 px-6 font-semibold text-gray-900">Status</th>
              <th className="text-right py-4 px-6 font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-200">
            {countries.map((country, index) => (
              <motion.tr
                key={country.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-gray-50 transition-colors"
              >
                {/* Country Name */}
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    {country.flag && (
                      <span className="text-2xl" title={country.name}>
                        {country.flag}
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {country.name}
                      </p>
                      {country.official_name && (
                        <p className="text-xs text-gray-500">
                          {country.official_name}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Capital */}
                <td className="py-4 px-6">
                  <p className="text-gray-700">{country.capital || '-'}</p>
                </td>

                {/* Continent */}
                <td className="py-4 px-6">
                  <Badge variant="info">{country.continent}</Badge>
                </td>

                {/* Region */}
                <td className="py-4 px-6">
                  <p className="text-gray-700 text-sm">{country.region || '-'}</p>
                </td>

                {/* Population */}
                <td className="py-4 px-6 text-center">
                  <p className="text-gray-700">
                    {country.population ? formatters.number(Math.floor(country.population / 1000000)) + 'M' : '-'}
                  </p>
                </td>

                {/* Status */}
                <td className="py-4 px-6 text-center">
                  <Badge
                    variant={country.is_active ? 'success' : 'warning'}
                    size="sm"
                  >
                    {country.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>

                {/* Actions */}
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onView(country.id)}
                      className="p-2 rounded-lg hover:bg-blue-100 transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4 text-blue-600" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onEdit(country.id)}
                      className="p-2 rounded-lg hover:bg-yellow-100 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4 text-yellow-600" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onDelete(country.id)}
                      className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {countries.length === 0 && (
        <div className="py-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No countries found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try adjusting your filters or search terms
          </p>
        </div>
      )}
    </Card>
  );
};

export default CountryList;