import { useState } from 'react';
import { motion } from 'framer-motion';
import Select from '../common/Select';
import Button from '../common/Button';
import { DESTINATION_CATEGORIES, DESTINATION_DIFFICULTIES } from '@/utils/constants';

const DestinationFilters = ({ onFilterChange, onClear }) => {
  const [filters, setFilters] = useState({
    category: '',
    difficulty: '',
    status: '',
  });

  const handleChange = (name, value) => {
    const updated = { ...filters, [name]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleClear = () => {
    setFilters({ category: '', difficulty: '', status: '' });
    onClear();
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-4 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Category"
          options={DESTINATION_CATEGORIES.map(c => ({ label: c, value: c }))}
          placeholder="All categories"
          value={filters.category}
          onChange={(e) => handleChange('category', e.target.value)}
        />

        <Select
          label="Difficulty"
          options={DESTINATION_DIFFICULTIES.map(d => ({ label: d, value: d }))}
          placeholder="All difficulties"
          value={filters.difficulty}
          onChange={(e) => handleChange('difficulty', e.target.value)}
        />

        <Select
          label="Status"
          options={[
            { label: 'Published', value: 'published' },
            { label: 'Draft', value: 'draft' },
          ]}
          placeholder="All statuses"
          value={filters.status}
          onChange={(e) => handleChange('status', e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClear}
          fullWidth
        >
          Clear Filters
        </Button>
      </div>
    </motion.div>
  );
};

export default DestinationFilters;