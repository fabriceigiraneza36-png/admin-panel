import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDestinations } from '@/hooks/useDestinations';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import Pagination from '@/components/common/Pagination';

const DestinationsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { destinations, pagination, isLoading } = useDestinations({
    page,
    limit: 12,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Breadcrumb items={[{ label: 'Destinations', path: '/destinations' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Destinations</h1>
          <p className="text-gray-500 mt-1">Manage travel destinations and locations</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => navigate('/destinations/create')}
        >
          Add Destination
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : destinations.length === 0 ? (
        <EmptyState
          title="No destinations yet"
          description="Create your first destination to get started"
          action={() => navigate('/destinations/create')}
          actionLabel="Create Destination"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((dest) => (
            <motion.div
              key={dest.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/destinations/${dest.id}`)}>
                {dest.image_url && (
                  <img
                    src={dest.image_url}
                    alt={dest.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">{dest.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{dest.category}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </motion.div>
  );
};

export default DestinationsPage;