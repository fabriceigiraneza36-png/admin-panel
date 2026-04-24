import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCountry } from '@/hooks/useCountries';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CountryForm from '@/components/countries/CountryForm';

const CountryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { country, isLoading } = useCountry(id);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Countries', path: '/countries' },
        { label: country?.name || 'Loading...', path: `/countries/${id}` },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <span>{country?.flag}</span>
            {country?.name}
          </h1>
        </div>
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => navigate('/countries')}
        >
          Back
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : (
        <CountryForm
          countryId={id}
          onSuccess={() => navigate('/countries')}
        />
      )}
    </div>
  );
};

export default CountryDetails;