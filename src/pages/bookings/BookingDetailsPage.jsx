import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useBooking } from '@/hooks/useBookings';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import BookingDetails from '@/components/bookings/BookingDetails';

const BookingDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useBooking(id);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Bookings', path: '/bookings' },
        { label: `#${booking?.data?.booking_number}`, path: `/bookings/${id}` },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Booking Details
        </h1>
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => navigate('/bookings')}
        >
          Back
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : (
        <BookingDetails
          booking={booking?.data}
          onStatusChange={() => {}}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      )}
    </div>
  );
};

export default BookingDetailsPage;