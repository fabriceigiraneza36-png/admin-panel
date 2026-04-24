import { useState } from 'react';
import { motion } from 'framer-motion';
import Select from '../common/Select';
import Button from '../common/Button';
import { MESSAGE_STATUSES, MESSAGE_PRIORITIES } from '@/utils/constants';

const MessageFilters = ({ onFilterChange, onClear }) => {
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    dateRange: '',
  });

  const handleChange = (name, value) => {
    const updated = { ...filters, [name]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleClear = () => {
    setFilters({ status: '', priority: '', dateRange: '' });
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
          label="Status"
          options={[
            { label: 'New', value: 'new' },
            { label: 'Read', value: 'read' },
            { label: 'Replied', value: 'replied' },
            { label: 'Archived', value: 'archived' },
          ]}
          placeholder="All statuses"
          value={filters.status}
          onChange={(e) => handleChange('status', e.target.value)}
        />

        <Select
          label="Priority"
          options={[
            { label: 'Low', value: 'low' },
            { label: 'Normal', value: 'normal' },
            { label: 'High', value: 'high' },
            { label: 'Urgent', value: 'urgent' },
          ]}
          placeholder="All priorities"
          value={filters.priority}
          onChange={(e) => handleChange('priority', e.target.value)}
        />

        <Select
          label="Date Range"
          options={[
            { label: 'Last 7 days', value: '7days' },
            { label: 'Last 30 days', value: '30days' },
            { label: 'This month', value: 'thismonth' },
          ]}
          placeholder="Any time"
          value={filters.dateRange}
          onChange={(e) => handleChange('dateRange', e.target.value)}
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

export default MessageFilters;