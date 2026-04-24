import { useState, useEffect } from 'react';
import { Download, Trash2, Mail, Filter, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import SearchBar from '@/components/common/SearchBar';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Pagination from '@/components/common/Pagination';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Modal from '@/components/common/Modal';
import Textarea from '@/components/common/Textarea';
import { formatters } from '@/utils/formatters';
import toast from 'react-hot-toast';

const SubscribersPage = () => {
  const [subscribers, setSubscribers] = useState([
    {
      id: 1,
      email: 'john@example.com',
      subscribed_at: '2024-01-10T10:30:00Z',
      is_active: true,
      unsubscribed_at: null,
    },
    {
      id: 2,
      email: 'jane@example.com',
      subscribed_at: '2024-01-12T14:20:00Z',
      is_active: true,
      unsubscribed_at: null,
    },
    {
      id: 3,
      email: 'admin@example.com',
      subscribed_at: '2024-01-15T09:15:00Z',
      is_active: false,
      unsubscribed_at: '2024-01-18T11:00:00Z',
    },
  ]);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const itemsPerPage = 10;

  const filteredSubscribers = subscribers.filter(sub =>
    sub.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage);
  const paginatedSubscribers = filteredSubscribers.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const handleDelete = (id) => {
    setSubscribers(subscribers.filter(s => s.id !== id));
    setDeleteId(null);
    toast.success('Subscriber removed');
  };

  const handleBulkDelete = () => {
    setSubscribers(subscribers.filter(s => !selectedIds.includes(s.id)));
    setSelectedIds([]);
    toast.success(`${selectedIds.length} subscribers removed`);
  };

  const handleBulkEmail = () => {
    if (!bulkMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    // TODO: Implement bulk email
    toast.success(`Email sent to ${selectedIds.length} subscribers`);
    setIsModalOpen(false);
    setBulkMessage('');
    setSelectedIds([]);
  };

  const handleExport = () => {
    const csv = ['Email,Subscribed Date,Status'].concat(
      subscribers.map(s =>
        `"${s.email}","${formatters.date(s.subscribed_at)}","${s.is_active ? 'Active' : 'Unsubscribed'}"`
      )
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `subscribers-${formatters.date(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Subscribers exported successfully');
  };

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedSubscribers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedSubscribers.map(s => s.id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const activeCount = subscribers.filter(s => s.is_active).length;
  const inactiveCount = subscribers.filter(s => !s.is_active).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Subscribers', path: '/subscribers' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Subscribers</h1>
          <p className="text-gray-500 mt-1">
            Manage newsletter subscribers ({subscribers.length} total)
          </p>
        </div>
        <Button icon={Download} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">Total Subscribers</p>
            <p className="text-3xl font-bold text-gray-900">{subscribers.length}</p>
          </div>
        </Card>
        <Card>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">Active</p>
            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
          </div>
        </Card>
        <Card>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">Unsubscribed</p>
            <p className="text-3xl font-bold text-red-600">{inactiveCount}</p>
          </div>
        </Card>
      </div>

      {/* Search & Actions */}
      <Card>
        <div className="space-y-4">
          <SearchBar
            placeholder="Search by email address..."
            onSearch={setSearch}
          />

          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                {selectedIds.length} subscriber(s) selected
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={Mail}
                  onClick={() => setIsModalOpen(true)}
                >
                  Send Email
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleBulkDelete}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Subscribers Table */}
      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : filteredSubscribers.length === 0 ? (
        <EmptyState title="No subscribers found" />
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="py-3 px-6 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === paginatedSubscribers.length && paginatedSubscribers.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600"
                      />
                    </th>
                    <th className="text-left py-3 px-6 font-semibold text-gray-900">Email</th>
                    <th className="text-left py-3 px-6 font-semibold text-gray-900">Subscribed Date</th>
                    <th className="text-center py-3 px-6 font-semibold text-gray-900">Status</th>
                    <th className="text-right py-3 px-6 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedSubscribers.map((subscriber, index) => (
                    <motion.tr
                      key={subscriber.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-6">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(subscriber.id)}
                          onChange={() => toggleSelect(subscriber.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600"
                        />
                      </td>
                      <td className="py-3 px-6">
                        <p className="font-medium text-gray-900">{subscriber.email}</p>
                      </td>
                      <td className="py-3 px-6">
                        <p className="text-gray-600">
                          {formatters.date(subscriber.subscribed_at)}
                        </p>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <Badge
                          variant={subscriber.is_active ? 'success' : 'warning'}
                          size="sm"
                        >
                          {subscriber.is_active ? 'Active' : 'Unsubscribed'}
                        </Badge>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`mailto:${subscriber.email}`}
                            className="p-2 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Send Email"
                          >
                            <Mail className="h-4 w-4 text-blue-600" />
                          </a>
                          <button
                            onClick={() => setDeleteId(subscriber.id)}
                            className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                            title="Delete"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Bulk Email Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setBulkMessage('');
        }}
        title="Send Email to Subscribers"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              This email will be sent to {selectedIds.length} selected subscriber(s)
            </p>
          </div>

          <Textarea
            label="Email Message"
            placeholder="Write your message here..."
            rows={6}
            value={bulkMessage}
            onChange={(e) => setBulkMessage(e.target.value)}
          />
        </div>

        <div className="mt-6 flex gap-2 justify-end border-t border-gray-200 pt-4">
          <Button
            variant="secondary"
            onClick={() => {
              setIsModalOpen(false);
              setBulkMessage('');
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleBulkEmail}>
            Send Email
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Remove Subscriber"
        message="Are you sure you want to remove this subscriber from the list?"
        confirmText="Remove"
        variant="danger"
      />
    </motion.div>
  );
};

export default SubscribersPage;