import Badge from '../common/Badge';
import { BOOKING_STATUS_COLORS } from '@/utils/constants';

const StatusBadge = ({ status, size = 'md' }) => {
  return (
    <Badge variant={BOOKING_STATUS_COLORS[status] || 'default'} size={size}>
      {status}
    </Badge>
  );
};

export default StatusBadge;