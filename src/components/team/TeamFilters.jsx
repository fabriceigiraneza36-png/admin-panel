import { useState } from 'react';
import { motion } from 'framer-motion';
import Select from '../common/Select';
import Input from '../common/Input';
import Button from '../common/Button';
import { TEAM_DEPARTMENTS } from '@/utils/constants';

const TeamFilters = ({ onFilterChange, onClear }) => {
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    search: '',
  });

  const handleChange = (name, value) => {
    const updated = { ...filters, [name]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleClear = () => {
    setFilters({ department: '', status: '', search: '' });
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
        <Input
          label="Search Members"
          placeholder="Name or role..."
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
        />

        <Select
          label="Department"
          options={TEAM_DEPARTMENTS.map(d => ({ label: d, value: d }))}
          placeholder="All departments"
          value={filters.department}
          onChange={(e) => handleChange('department', e.target.value)}
        />

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

export default TeamFilters;