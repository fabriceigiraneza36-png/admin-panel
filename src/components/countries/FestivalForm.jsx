import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Plus, Trash2 } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Card from '../common/Card';
import toast from 'react-hot-toast';

const FestivalForm = ({ countryId, onSuccess }) => {
  const [festivals, setFestivals] = useState([
    { name: '', period: '', month: '', description: '', is_major_event: false }
  ]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const addFestival = () => {
    setFestivals([
      ...festivals,
      { name: '', period: '', month: '', description: '', is_major_event: false }
    ]);
  };

  const removeFestival = (index) => {
    if (festivals.length > 1) {
      setFestivals(festivals.filter((_, i) => i !== index));
      toast.success('Festival removed');
    }
  };

  const updateFestival = (index, field, value) => {
    const updated = [...festivals];
    updated[index][field] = value;
    setFestivals(updated);
  };

  const handleSave = () => {
    const validFestivals = festivals.filter(f => f.name && f.month);
    if (validFestivals.length === 0) {
      toast.error('Add at least one festival');
      return;
    }
    onSuccess(validFestivals);
    toast.success('Festivals saved!');
  };

  return (
    <Card title="Festivals" subtitle="Add festivals and cultural events">
      <div className="space-y-4">
        {festivals.map((festival, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gray-200 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-gray-400" />
                <h4 className="font-semibold text-gray-900">
                  Festival {index + 1}
                </h4>
              </div>
              <button
                onClick={() => removeFestival(index)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            <Input
              label="Festival Name"
              placeholder="e.g., Kwita Izina Gorilla Naming"
              value={festival.name}
              onChange={(e) => updateFestival(index, 'name', e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Period"
                placeholder="e.g., 3 days"
                value={festival.period}
                onChange={(e) => updateFestival(index, 'period', e.target.value)}
              />

              <Select
                label="Month"
                options={months.map((m, i) => ({ label: m, value: m }))}
                value={festival.month}
                onChange={(e) => updateFestival(index, 'month', e.target.value)}
              />
            </div>

            <Textarea
              label="Description"
              placeholder="Describe the festival"
              rows={3}
              value={festival.description}
              onChange={(e) => updateFestival(index, 'description', e.target.value)}
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={festival.is_major_event}
                onChange={(e) => updateFestival(index, 'is_major_event', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600"
              />
              <label className="text-sm font-medium text-gray-700">
                Major Event
              </label>
            </div>
          </motion.div>
        ))}

        <Button
          type="button"
          variant="outline"
          icon={Plus}
          onClick={addFestival}
          fullWidth
        >
          Add Festival
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          fullWidth
        >
          Save Festivals
        </Button>
      </div>
    </Card>
  );
};

export default FestivalForm;