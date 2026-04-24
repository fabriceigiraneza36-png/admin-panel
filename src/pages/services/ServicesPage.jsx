import { useState } from 'react';
import { Plus, Edit2, Trash2, Zap, Grid2X2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';
import ImageUpload from '@/components/common/ImageUpload';
import toast from 'react-hot-toast';

const ServicesPage = () => {
  const [services, setServices] = useState([
    {
      id: 1,
      title: 'Guided Tours',
      description: 'Professional guided tours led by experienced local guides',
      short_description: 'Expert-led tours of African destinations',
      image_url: null,
      icon: '🗺️',
      is_featured: true,
      sort_order: 1,
    },
    {
      id: 2,
      title: 'Accommodation Booking',
      description: 'Handpicked selection of hotels, lodges, and unique stays',
      short_description: 'Curated accommodation options',
      image_url: null,
      icon: '🏨',
      is_featured: true,
      sort_order: 2,
    },
    {
      id: 3,
      title: 'Transportation',
      description: 'Safe and reliable transportation throughout your journey',
      short_description: 'Comfortable travel arrangements',
      image_url: null,
      icon: '🚗',
      is_featured: false,
      sort_order: 3,
    },
  ]);

  const [deleteId, setDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    image_url: null,
    icon: '',
    is_featured: false,
  });

  const handleDelete = (id) => {
    setServices(services.filter(s => s.id !== id));
    setDeleteId(null);
    toast.success('Service deleted successfully');
  };

  const handleAddEdit = () => {
    if (!formData.title || !formData.description) {
      toast.error('Please fill in required fields');
      return;
    }

    if (editingId) {
      setServices(services.map(service =>
        service.id === editingId
          ? { ...service, ...formData }
          : service
      ));
      toast.success('Service updated successfully');
    } else {
      const newService = {
        id: Date.now(),
        ...formData,
        sort_order: services.length + 1,
      };
      setServices([...services, newService]);
      toast.success('Service added successfully');
    }

    setIsModalOpen(false);
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      short_description: '',
      image_url: null,
      icon: '',
      is_featured: false,
    });
  };

  const openModal = (service = null) => {
    if (service) {
      setEditingId(service.id);
      setFormData(service);
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
      <Breadcrumb items={[{ label: 'Services', path: '/services' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 mt-1">Manage your travel services ({services.length} items)</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Grid2X2}
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? 'List' : 'Grid'}
          </Button>
          <Button icon={Plus} onClick={() => openModal()}>
            Add Service
          </Button>
        </div>
      </div>

      {/* Services Grid/List */}
      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : services.length === 0 ? (
        <EmptyState
          title="No services yet"
          description="Create your first travel service"
          action={() => openModal()}
          actionLabel="Add Service"
        />
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card hoverable className="h-full flex flex-col">
                {/* Icon/Image */}
                <div className="h-32 -m-6 mb-4 rounded-t-xl overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                  {service.image_url ? (
                    <img
                      src={service.image_url}
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">{service.icon || '✨'}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col">
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {service.title}
                    </h3>
                    {service.is_featured && (
                      <Badge variant="success" size="sm" className="mb-2">
                        Featured
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-4 flex-grow">
                    {service.short_description || service.description}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Edit2}
                      onClick={() => openModal(service)}
                      fullWidth
                    >
                      Edit
                    </Button>
                    <button
                      onClick={() => setDeleteId(service.id)}
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
      ) : (
        /* List View */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Service</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Description</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">Featured</th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{service.icon || '✨'}</span>
                        <p className="font-medium text-gray-900">{service.title}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {service.short_description || service.description}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {service.is_featured && (
                        <Badge variant="success" size="sm">Yes</Badge>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(service)}
                          className="p-2 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => setDeleteId(service.id)}
                          className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
          resetForm();
        }}
        title={editingId ? 'Edit Service' : 'Add New Service'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Service Title"
            placeholder="e.g., Guided Tours"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <Input
            label="Icon/Emoji"
            placeholder="e.g., 🗺️"
            maxLength="2"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          />

          <Input
            label="Short Description"
            placeholder="Brief description"
            value={formData.short_description}
            onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
          />

          <Textarea
            label="Full Description"
            placeholder="Detailed service description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />

          <ImageUpload
            label="Service Image"
            multiple={false}
            onChange={(file) => setFormData({ ...formData, image_url: file })}
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.is_featured}
              onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-primary-600"
            />
            <label className="text-sm font-medium text-gray-700">
              Feature this service
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
            {editingId ? 'Update Service' : 'Add Service'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Delete Service"
        message="Are you sure you want to delete this service?"
        confirmText="Delete"
        variant="danger"
      />
    </motion.div>
  );
};

export default ServicesPage;