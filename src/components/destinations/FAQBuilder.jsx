import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Card from '../common/Card';
import toast from 'react-hot-toast';

const FAQBuilder = ({ onSave }) => {
  const [faqs, setFaqs] = useState([
    { question: '', answer: '', category: '' }
  ]);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const addFAQ = () => {
    setFaqs([
      ...faqs,
      { question: '', answer: '', category: '' }
    ]);
  };

  const removeFAQ = (index) => {
    setFaqs(faqs.filter((_, i) => i !== index));
    toast.success('FAQ removed');
  };

  const updateFAQ = (index, field, value) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  const handleSave = () => {
    const validFaqs = faqs.filter(f => f.question && f.answer);
    if (validFaqs.length === 0) {
      toast.error('Add at least one FAQ');
      return;
    }
    onSave(validFaqs);
    toast.success('FAQs saved!');
  };

  return (
    <Card title="Frequently Asked Questions" subtitle="Add common questions and answers">
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium text-gray-900 text-left">
                {faq.question || `FAQ ${index + 1}`}
              </span>
              {expandedIndex === index ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {expandedIndex === index && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-200 p-4 space-y-3 bg-gray-50"
              >
                <Input
                  label="Question"
                  placeholder="What is the best time to visit?"
                  value={faq.question}
                  onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                />

                <Textarea
                  label="Answer"
                  placeholder="Detailed answer..."
                  rows={4}
                  value={faq.answer}
                  onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                />

                <button
                  onClick={() => removeFAQ(index)}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </motion.div>
            )}
          </motion.div>
        ))}

        <Button
          type="button"
          variant="outline"
          icon={Plus}
          onClick={addFAQ}
          fullWidth
        >
          Add FAQ
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          fullWidth
        >
          Save FAQs
        </Button>
      </div>
    </Card>
  );
};

export default FAQBuilder;