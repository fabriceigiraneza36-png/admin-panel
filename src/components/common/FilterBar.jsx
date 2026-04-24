import { Filter, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Select from './Select';

const FilterBar = ({ filters, onFilterChange, onClearFilters }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        icon={Filter}
        onClick={() => setIsOpen(!isOpen)}
      >
        Filters
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80 z-10"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {filters.map((filter) => (
                <Select
                  key={filter.name}
                  label={filter.label}
                  options={filter.options}
                  value={filter.value}
                  onChange={(e) => onFilterChange(filter.name, e.target.value)}
                />
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onClearFilters}
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
        )}
      </AnimatePresence>
    </div>
  );
};

export default FilterBar;