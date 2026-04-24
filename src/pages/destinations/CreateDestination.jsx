import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import DestinationForm from '@/components/destinations/DestinationForm';

const CreateDestination = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Destinations', path: '/destinations' },
        { label: 'Create', path: '/destinations/create' },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Create Destination</h1>
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => navigate('/destinations')}
        >
          Back
        </Button>
      </div>

      <DestinationForm onSuccess={() => navigate('/destinations')} />
    </div>
  );
};

export default CreateDestination;