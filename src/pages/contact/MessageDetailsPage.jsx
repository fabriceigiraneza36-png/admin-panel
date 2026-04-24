import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useContact } from '@/hooks/useContact';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import MessageDetails from '@/components/contact/MessageDetails';

const MessageDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // TODO: Fetch message data
    setIsLoading(false);
  }, [id]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Messages', path: '/contact' },
        { label: message?.full_name || 'Loading...', path: `/contact/${id}` },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Message</h1>
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => navigate('/contact')}
        >
          Back
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : (
        <MessageDetails
          message={message}
          onReply={() => {}}
          onDelete={() => navigate('/contact')}
          onMarkRead={() => {}}
        />
      )}
    </div>
  );
};

export default MessageDetailsPage;