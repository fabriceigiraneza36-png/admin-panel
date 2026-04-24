import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import CountryForm from '@/components/countries/CountryForm';

const CreateCountry = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Countries', path: '/countries' },
        { label: 'Create', path: '/countries/create' },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Create Country</h1>
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => navigate('/countries')}
        >
          Back
        </Button>
      </div>

      <CountryForm onSuccess={() => navigate('/countries')} />
    </div>
  );
};

export default CreateCountry;