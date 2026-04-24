import { useState } from 'react';
import { motion } from 'framer-motion';
import Select from '../common/Select';
import Input from '../common/Input';
import Button from '../common/Button';
import { CONTINENTS } from '@/utils/constants';

const CountryFilters = ({ onFilterChange, onClear }) => {
  const [filters, setFilters] = useState({
    continent: '',
    region: '',
    status: '',
  });

  const handleChange = (name, value) => {
    const updated = { ...filters, [name]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleClear = () => {
    setFilters({ continent: '', region: '', status: '' });
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
          label="Continent"
          options={CONTINENTS.map(c => ({ label: c, value: c }))}
          placeholder="All continents"
          value={filters.continent}
          onChange={(e) => handleChange('continent', e.target.value)}
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

export default CountryFilters;