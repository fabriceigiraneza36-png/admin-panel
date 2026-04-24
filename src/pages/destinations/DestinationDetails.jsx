import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDestination } from '@/hooks/useDestinations';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import DestinationForm from '@/components/destinations/DestinationForm';

const DestinationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: destination, isLoading } = useDestination(id);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Destinations', path: '/destinations' },
        { label: destination?.data?.name || 'Loading...', path: `/destinations/${id}` },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {destination?.data?.name}
        </h1>
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => navigate('/destinations')}
        >
          Back
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : (
        <DestinationForm
          destination={destination?.data}
          onSuccess={() => navigate('/destinations')}
        />
      )}
    </div>
  );
};

export default DestinationDetails;