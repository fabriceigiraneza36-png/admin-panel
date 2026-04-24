import { useState } from 'react';
import { motion } from 'framer-motion';
import { useContact } from '@/hooks/useContact';
import Breadcrumb from '@/components/layout/Breadcrumb';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const ContactPage = () => {
  const [page, setPage] = useState(1);
  const { messages, isLoading } = useContact({ page, limit: 20 });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Breadcrumb items={[{ label: 'Messages', path: '/contact' }]} />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Contact Messages</h1>
        <p className="text-gray-500 mt-1">Manage customer inquiries and messages</p>
      </div>

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : messages.length === 0 ? (
        <EmptyState
          title="No messages"
          description="Contact messages from your website will appear here"
        />
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-gray-900">{msg.full_name}</h3>
              <p className="text-sm text-gray-500 mt-1">{msg.email}</p>
              <p className="text-gray-700 mt-3">{msg.message}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-500">
                  {new Date(msg.created_at).toLocaleDateString()}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${msg.is_read ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                  {msg.is_read ? 'Read' : 'Unread'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ContactPage;