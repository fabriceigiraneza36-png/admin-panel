import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCountries } from '@/hooks/useCountries';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import SearchBar from '@/components/common/SearchBar';
import FilterBar from '@/components/common/FilterBar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import Pagination from '@/components/common/Pagination';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Card from '@/components/common/Card';
import CountryCard from '@/components/countries/CountryCard';
import CountryList from '@/components/countries/CountryList';
import { useUIStore } from '@/store/uiStore';
import { CONTINENTS } from '@/utils/constants';

const CountriesPage = () => {
  const navigate = useNavigate();
  const { viewMode } = useUIStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ continent: '' });
  const [deleteId, setDeleteId] = useState(null);

  const { countries, pagination, isLoading, deleteCountry, isDeleting } = useCountries({
    page,
    limit: 12,
    search,
    ...filters,
  });

  const handleDelete = (id) => {
    deleteCountry(id, {
      onSuccess: () => setDeleteId(null),
    });
  };

  const filterOptions = [
    {
      name: 'continent',
      label: 'Continent',
      options: CONTINENTS.map(c => ({ label: c, value: c })),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Countries', path: '/countries' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Countries</h1>
          <p className="text-gray-500 mt-1">Manage destinations and country information</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => navigate('/countries/create')}
        >
          Add Country
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              placeholder="Search countries..."
              onSearch={setSearch}
            />
          </div>
          <FilterBar
            filters={filterOptions}
            onFilterChange={(name, value) => {
              setFilters(prev => ({ ...prev, [name]: value }));
              setPage(1);
            }}
            onClearFilters={() => {
              setFilters({ continent: '' });
              setPage(1);
            }}
          />
        </div>
      </Card>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : countries.length === 0 ? (
        <EmptyState
          title="No countries found"
          description="Start by creating a new country"
          action={() => navigate('/countries/create')}
          actionLabel="Create Country"
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {countries.map((country, index) => (
            <motion.div
              key={country.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <CountryCard
                country={country}
                onEdit={() => navigate(`/countries/${country.id}`)}
                onDelete={() => setDeleteId(country.id)}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <CountryList
          countries={countries}
          onEdit={(id) => navigate(`/countries/${id}`)}
          onDelete={(id) => setDeleteId(id)}
        />
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Delete Country"
        message="Are you sure you want to delete this country? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </motion.div>
  );
};

export default CountriesPage;