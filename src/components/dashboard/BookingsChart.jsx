import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';

const BookingsChart = () => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['bookings-chart'],
    queryFn: async () => {
      return {
        data: [
          { status: 'Pending', count: 10 },
          { status: 'Confirmed', count: 24 },
          { status: 'Completed', count: 18 },
        ],
      };
    },
  });

  return (
    <Card title="Bookings by Status" subtitle="Current distribution">
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData?.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default BookingsChart;