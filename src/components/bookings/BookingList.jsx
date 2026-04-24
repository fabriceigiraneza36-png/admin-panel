import { motion } from 'framer-motion';
import { Edit2, Trash2, Eye } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { BOOKING_STATUS_COLORS } from '@/utils/constants';
import { formatters } from '@/utils/formatters';

const BookingList = ({ bookings, onView, onDelete }) => {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Booking#</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Guest</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Destination</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking, index) => (
              <motion.tr
                key={booking.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4">
                  <p className="font-medium text-gray-900">{booking.booking_number}</p>
                </td>
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-gray-900">{booking.full_name}</p>
                    <p className="text-xs text-gray-500">{booking.email}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {booking.destination_name}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {formatters.date(booking.travel_date)}
                </td>
                <td className="py-3 px-4">
                  <Badge variant={BOOKING_STATUS_COLORS[booking.status]}>
                    {booking.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onView(booking.id)}
                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => onDelete(booking.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default BookingList;