import { motion } from 'framer-motion';
import { Calendar, Users, MapPin, Mail, Phone, Home, Utensils } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import BookingTimeline from './BookingTimeline';
import { BOOKING_STATUS_COLORS, BOOKING_STATUSES } from '@/utils/constants';
import { formatters } from '@/utils/formatters';

const BookingDetails = ({ booking, onStatusChange, onConfirm, onCancel }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Main Details */}
      <Card title={`Booking #${booking.booking_number}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Guest Information */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Guest Information</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{booking.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{booking.email}</span>
                </div>
                {booking.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{booking.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Travel Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Destination:</span>
                  <span className="font-medium text-gray-900">{booking.destination_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Travel Date:</span>
                  <span className="font-medium text-gray-900">
                    {formatters.date(booking.travel_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Return Date:</span>
                  <span className="font-medium text-gray-900">
                    {formatters.date(booking.return_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Travelers:</span>
                  <span className="font-medium text-gray-900">
                    {booking.number_of_travelers}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Status</h4>
              <Badge variant={BOOKING_STATUS_COLORS[booking.status]} className="mb-4">
                {booking.status}
              </Badge>
              <div className="space-y-2">
                {booking.status !== BOOKING_STATUSES.CONFIRMED && (
                  <Button
                    onClick={() => onConfirm(booking.id)}
                    variant="success"
                    fullWidth
                    size="sm"
                  >
                    Confirm Booking
                  </Button>
                )}
                {booking.status !== BOOKING_STATUSES.CANCELLED && (
                  <Button
                    onClick={() => onCancel(booking.id)}
                    variant="danger"
                    fullWidth
                    size="sm"
                  >
                    Cancel Booking
                  </Button>
                )}
              </div>
            </div>

            {booking.special_requests && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Special Requests</h4>
                <p className="text-sm text-gray-600">{booking.special_requests}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <BookingTimeline booking={booking} />
    </motion.div>
  );
};

export default BookingDetails;