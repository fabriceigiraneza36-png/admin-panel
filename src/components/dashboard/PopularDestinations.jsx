import { useQuery } from '@tanstack/react-query';
import { MapPin, Eye } from 'lucide-react';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';
import axiosInstance from '@/api/axios';

const PopularDestinations = () => {
  const { data: destinations, isLoading } = useQuery({
    queryKey: ['popular-destinations'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/destinations', {
        params: { limit: 5, sort: 'views', order: 'DESC' },
      });
      return response.data;
    },
  });

  return (
    <Card title="Popular Destinations" subtitle="Most viewed locations">
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-3">
          {destinations?.data?.map((destination, index) => (
            <div
              key={destination.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {destination.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {destination.category}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {destination.views?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default PopularDestinations;