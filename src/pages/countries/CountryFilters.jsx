import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import Select from '@/components/common/Select';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { CONTINENTS } from '@/utils/constants';

const CountryFilters = ({ onFilterChange, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    continent: '',
    region: '',
    status: '',
    searchTerm: '',
  });

  const handleChange = (field, value) => {
    const updated = { ...filters, [field]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleClearAll = () => {
    setFilters({
      continent: '',
      region: '',
      status: '',
      searchTerm: '',
    });
    onClear();
  };

  const activeFiltersCount = Object.values(filters).filter(v => v).length;

  return (
    <motion.div className="relative">
      {/* Filter Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors relative group"
      >
        <Filter className="h-5 w-5 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </span>

        {/* Badge for active filters */}
        {activeFiltersCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
          >
            {activeFiltersCount}
          </motion.div>
        )}
      </motion.button>

      {/* Filter Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-30"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-6 z-40"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Filter Countries
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Filters */}
              <div className="space-y-4 mb-4">
                {/* Search */}
                <Input
                  label="Search Countries"
                  placeholder="Name or capital..."
                  value={filters.searchTerm}
                  onChange={(e) => handleChange('searchTerm', e.target.value)}
                />

                {/* Continent */}
                <Select
                  label="Continent"
                  options={CONTINENTS.map(c => ({ label: c, value: c }))}
                  placeholder="All continents"
                  value={filters.continent}
                  onChange={(e) => handleChange('continent', e.target.value)}
                />

                {/* Status */}
                <Select
                  label="Status"
                  options={[
                    { label: 'Active', value: 'active' },
                    { label: 'Inactive', value: 'inactive' },
                  ]}
                  placeholder="All statuses"
                  value={filters.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                />

                {/* Region */}
                <Input
                  label="Region"
                  placeholder="e.g., East Africa"
                  value={filters.region}
                  onChange={(e) => handleChange('region', e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleClearAll}
                  fullWidth
                >
                  Clear All
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  fullWidth
                >
                  Apply
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CountryFilters;