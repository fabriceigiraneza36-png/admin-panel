import { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Clock, Tag, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import SearchBar from '@/components/common/SearchBar';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';
import toast from 'react-hot-toast';
import { TIP_CATEGORIES } from '@/utils/constants';

const TipsPage = () => {
  const [tips, setTips] = useState([
    {
      id: 1,
      summary: 'Pack light for gorilla trekking',
      body: 'When preparing for gorilla trekking in Volcanoes National Park, pack light and comfortable clothing. Avoid bright colors and scents that might disturb the gorillas.',
      category: 'Packing',
      trip_phase: 'pre-trip',
      read_time_minutes: 5,
      is_featured: true,
      is_active: true,
      priority_level: 1,
    },
    {
      id: 2,
      summary: 'Book permits well in advance',
      body: 'Gorilla permits are limited and sell out quickly, especially during peak seasons. Book your permits at least 3-6 months in advance.',
      category: 'Travel Planning',
      trip_phase: 'pre-trip',
      read_time_minutes: 3,
      is_featured: true,
      is_active: true,
      priority_level: 1,
    },
    {
      id: 3,
      summary: 'Stay hydrated and bring insect repellent',
      body: 'The humid climate means you\'ll sweat more. Bring plenty of water and quality insect repellent to protect against mosquitoes.',
      category: 'Health & Safety',
      trip_phase: 'on-trip',
      read_time_minutes: 4,
      is_featured: false,
      is_active: true,
      priority_level: 2,
    },
  ]);

  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    summary: '',
    body: '',
    category: '',
    trip_phase: 'pre-trip',
    read_time_minutes: 5,
    is_featured: false,
    priority_level: 2,
  });

  const tripPhases = ['pre-trip', 'on-trip', 'post-trip'];

  const filteredTips = tips.filter(tip =>
    tip.summary.toLowerCase().includes(search.toLowerCase()) ||
    tip.body.toLowerCase().includes(search.toLowerCase()) ||
    tip.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id) => {
    setTips(tips.filter(t => t.id !== id));
    setDeleteId(null);
    toast.success('Tip deleted successfully');
  };

  const handleAddEdit = () => {
    if (!formData.summary || !formData.body || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingId) {
      setTips(tips.map(tip =>
        tip.id === editingId
          ? { ...tip, ...formData }
          : tip
      ));
      toast.success('Tip updated successfully');
    } else {
      const newTip = {
        id: Date.now(),
        ...formData,
        is_active: true,
      };
      setTips([...tips, newTip]);
      toast.success('Tip added successfully');
    }

    setIsModalOpen(false);
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      summary: '',
      body: '',
      category: '',
      trip_phase: 'pre-trip',
      read_time_minutes: 5,
      is_featured: false,
      priority_level: 2,
    });
  };

  const openModal = (tip = null) => {
    if (tip) {
      setEditingId(tip.id);
      setFormData(tip);
    } else {
      setEditingId(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Travel Tips', path: '/tips' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Travel Tips & Guides</h1>
          <p className="text-gray-500 mt-1">Helpful advice for travelers ({tips.length} tips)</p>
        </div>
        <Button icon={Plus} onClick={() => openModal()}>
          Add Tip
        </Button>
      </div>

      {/* Search */}
      <Card>
        <SearchBar
          placeholder="Search tips by summary, content, or category..."
          onSearch={setSearch}
        />
      </Card>

      {/* Tips List */}
      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : filteredTips.length === 0 ? (
        <EmptyState
          title="No tips found"
          description="Create helpful travel tips for your users"
          action={() => openModal()}
          actionLabel="Add Tip"
        />
      ) : (
        <div className="space-y-4">
          {filteredTips.map((tip, index) => (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card hoverable>
                <div className="flex items-start justify-between gap-4">
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {tip.summary}
                      </h3>
                      {tip.is_featured && (
                        <Star className="h-5 w-5 text-yellow-400 fill-current flex-shrink-0" />
                      )}
                    </div>

                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {tip.body}
                    </p>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="info" size="sm">
                        <Tag className="h-3 w-3 mr-1" />
                        {tip.category}
                      </Badge>
                      <Badge variant="default" size="sm">
                        {tip.trip_phase}
                      </Badge>
                      <Badge variant="default" size="sm">
                        <Clock className="h-3 w-3 mr-1" />
                        {tip.read_time_minutes} min
                      </Badge>
                      {tip.priority_level === 1 && (
                        <Badge variant="error" size="sm">
                          High Priority
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Edit2}
                      onClick={() => openModal(tip)}
                    >
                      Edit
                    </Button>
                    <button
                      onClick={() => setDeleteId(tip.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors border border-red-200"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
          resetForm();
        }}
        title={editingId ? 'Edit Travel Tip' : 'Add New Travel Tip'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Tip Summary"
            placeholder="e.g., Pack light for gorilla trekking"
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            required
          />

          <Textarea
            label="Tip Details"
            placeholder="Provide detailed advice..."
            rows={6}
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select Category</option>
              {TIP_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={formData.trip_phase}
              onChange={(e) => setFormData({ ...formData, trip_phase: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {tripPhases.map(phase => (
                <option key={phase} value={phase}>
                  {phase.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Reading Time (minutes)"
            type="number"
            min="1"
            max="60"
            value={formData.read_time_minutes}
            onChange={(e) => setFormData({ ...formData, read_time_minutes: parseInt(e.target.value) })}
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.is_featured}
              onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-primary-600"
            />
            <label className="text-sm font-medium text-gray-700">
              Feature this tip
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex gap-2 justify-end border-t border-gray-200 pt-4">
          <Button
            variant="secondary"
            onClick={() => {
              setIsModalOpen(false);
              setEditingId(null);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleAddEdit}>
            {editingId ? 'Update Tip' : 'Add Tip'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Delete Travel Tip"
        message="Are you sure you want to delete this travel tip? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </motion.div>
  );
};

export default TipsPage;