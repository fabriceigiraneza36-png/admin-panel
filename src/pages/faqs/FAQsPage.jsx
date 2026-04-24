import { useState } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

const FAQsPage = () => {
  const [faqs, setFaqs] = useState([
    {
      id: 1,
      question: 'What is the best time to visit Rwanda?',
      answer: 'The best times to visit Rwanda are during the dry seasons: June to September (long dry season) and January to February (short dry season). These months offer the clearest skies and best conditions for gorilla trekking.',
      category: 'Travel Planning',
      is_active: true,
      sort_order: 1,
    },
    {
      id: 2,
      question: 'Do I need a visa to visit Rwanda?',
      answer: 'Most international visitors can obtain a visa on arrival at Kigali International Airport or apply for an e-visa online before traveling. Citizens of specific countries enjoy visa-free entry. Check the Rwanda Immigration Services website for your country.',
      category: 'Visas & Documents',
      is_active: true,
      sort_order: 2,
    },
    {
      id: 3,
      question: 'How much does gorilla trekking cost?',
      answer: 'Gorilla permits cost $1,500 per person in Rwanda (as of 2024). This fee grants access to one gorilla family for up to one hour. Additional costs include accommodation, transportation, and guide fees.',
      category: 'Activities',
      is_active: true,
      sort_order: 3,
    },
  ]);

  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
  });

  const categories = ['Travel Planning', 'Visas & Documents', 'Activities', 'Accommodation', 'Safety', 'Health', 'Transportation'];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(search.toLowerCase()) ||
    faq.answer.toLowerCase().includes(search.toLowerCase()) ||
    faq.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id) => {
    setFaqs(faqs.filter(faq => faq.id !== id));
    setDeleteId(null);
    toast.success('FAQ deleted successfully');
  };

  const handleAddEdit = () => {
    if (!formData.question || !formData.answer || !formData.category) {
      toast.error('Please fill in all fields');
      return;
    }

    if (editingId) {
      setFaqs(faqs.map(faq =>
        faq.id === editingId
          ? { ...faq, ...formData }
          : faq
      ));
      toast.success('FAQ updated successfully');
    } else {
      const newFaq = {
        id: Date.now(),
        ...formData,
        is_active: true,
        sort_order: faqs.length + 1,
      };
      setFaqs([...faqs, newFaq]);
      toast.success('FAQ added successfully');
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ question: '', answer: '', category: '' });
  };

  const openModal = (faq = null) => {
    if (faq) {
      setEditingId(faq.id);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
      });
    } else {
      setEditingId(null);
      setFormData({ question: '', answer: '', category: '' });
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
      <Breadcrumb items={[{ label: 'FAQs', path: '/faqs' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
          <p className="text-gray-500 mt-1">Manage your FAQ database ({faqs.length} items)</p>
        </div>
        <Button icon={Plus} onClick={() => openModal()}>
          Add FAQ
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <SearchBar
          placeholder="Search FAQs by question, answer, or category..."
          onSearch={setSearch}
        />
      </Card>

      {/* FAQs List */}
      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : filteredFaqs.length === 0 ? (
        <EmptyState
          title="No FAQs found"
          description="Add frequently asked questions to help your customers"
          action={() => openModal()}
          actionLabel="Create FAQ"
        />
      ) : (
        <Card>
          <div className="space-y-3">
            {filteredFaqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Question Bar */}
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 text-left">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {faq.question}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="info" size="sm">
                          {faq.category}
                        </Badge>
                        {faq.is_active && (
                          <Badge variant="success" size="sm">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedId === faq.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {/* Expanded Answer */}
                <AnimatePresence>
                  {expandedId === faq.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-200 bg-gray-50"
                    >
                      <div className="p-4 space-y-4">
                        <p className="text-gray-700 leading-relaxed">
                          {faq.answer}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t border-gray-200">
                          <Button
                            size="sm"
                            variant="outline"
                            icon={Edit2}
                            onClick={() => openModal(faq)}
                            fullWidth
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            icon={Trash2}
                            onClick={() => setDeleteId(faq.id)}
                            fullWidth
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
          setFormData({ question: '', answer: '', category: '' });
        }}
        title={editingId ? 'Edit FAQ' : 'Add New FAQ'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Question"
            placeholder="What should customers ask?"
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            required
          />

          <Textarea
            label="Answer"
            placeholder="Provide a detailed answer..."
            rows={6}
            value={formData.answer}
            onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
            required
          />

          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          >
            <option value="">Select Category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex gap-2 justify-end border-t border-gray-200 pt-4">
          <Button
            variant="secondary"
            onClick={() => {
              setIsModalOpen(false);
              setEditingId(null);
              setFormData({ question: '', answer: '', category: '' });
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleAddEdit}>
            {editingId ? 'Update FAQ' : 'Add FAQ'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </motion.div>
  );
};

export default FAQsPage;