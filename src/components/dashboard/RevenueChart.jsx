import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';
import axiosInstance from '@/api/axios';

const RevenueChart = () => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: async () => {
      // TODO: Replace with actual API call
      return {
        data: [
          { month: 'Jan', revenue: 4000 },
          { month: 'Feb', revenue: 3000 },
          { month: 'Mar', revenue: 2000 },
          { month: 'Apr', revenue: 2780 },
          { month: 'May', revenue: 1890 },
          { month: 'Jun', revenue: 2390 },
        ],
      };
    },
  });

  return (
    <Card title="Revenue Overview" subtitle="Last 6 months">
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData?.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#22c55e"
              dot={{ fill: '#22c55e', r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default RevenueChart;