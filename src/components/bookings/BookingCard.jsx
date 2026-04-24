import { motion } from 'framer-motion';
import { Calendar, Users, MapPin, Mail, Phone } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { BOOKING_STATUS_COLORS } from '@/utils/constants';
import { formatters } from '@/utils/formatters';

const BookingCard = ({ booking, onAction }) => {
  return (
    <motion.div whileHover={{ y: -4 }}>
      <Card hoverable>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Booking #</p>
              <p className="font-bold text-gray-900">{booking.booking_number}</p>
            </div>
            <Badge variant={BOOKING_STATUS_COLORS[booking.status]}>
              {booking.status}
            </Badge>
          </div>

          {/* Guest Info */}
          <div className="space-y-2 border-t border-b border-gray-100 py-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <p className="text-sm text-gray-600">{booking.full_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <p className="text-sm text-gray-600">{booking.email}</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Destination</p>
              <p className="font-medium text-gray-900">{booking.destination_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Travelers</p>
              <p className="font-medium text-gray-900">{booking.number_of_travelers}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Travel Date</p>
              <p className="font-medium text-gray-900">
                {formatters.date(booking.travel_date)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(booking.id, 'view')}
              fullWidth
            >
              View Details
            </Button>
            <Button
              size="sm"
              onClick={() => onAction(booking.id, 'confirm')}
              fullWidth
            >
              Confirm
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default BookingCard;