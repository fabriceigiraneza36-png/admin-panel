import { useState } from 'react';
import { motion } from 'framer-motion';
import Select from '../common/Select';
import Button from '../common/Button';
import { POST_CATEGORIES } from '@/utils/constants';

const PostFilters = ({ onFilterChange, onClear }) => {
  const [filters, setFilters] = useState({
    category: '',
    status: '',
  });

  const handleChange = (name, value) => {
    const updated = { ...filters, [name]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleClear = () => {
    setFilters({ category: '', status: '' });
    onClear();
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-4 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Category"
          options={POST_CATEGORIES.map(c => ({ label: c, value: c }))}
          placeholder="All categories"
          value={filters.category}
          onChange={(e) => handleChange('category', e.target.value)}
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

export default PostFilters;