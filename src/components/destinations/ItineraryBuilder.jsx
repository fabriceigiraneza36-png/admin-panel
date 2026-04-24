import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Card from '../common/Card';
import toast from 'react-hot-toast';

const ItineraryBuilder = ({ onSave }) => {
  const [days, setDays] = useState([
    { day_number: 1, title: '', description: '', activities: [] }
  ]);

  const addDay = () => {
    setDays([
      ...days,
      { day_number: days.length + 1, title: '', description: '', activities: [] }
    ]);
  };

  const removeDay = (index) => {
    if (days.length > 1) {
      setDays(days.filter((_, i) => i !== index));
      toast.success('Day removed');
    } else {
      toast.error('Must have at least one day');
    }
  };

  const updateDay = (index, field, value) => {
    const updated = [...days];
    updated[index][field] = value;
    setDays(updated);
  };

  const handleSave = () => {
    onSave(days);
    toast.success('Itinerary saved!');
  };

  return (
    <Card title="Itinerary" subtitle="Create day-by-day itinerary">
      <div className="space-y-4">
        {days.map((day, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gray-200 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GripVertical className="h-5 w-5 text-gray-400" />
                <h4 className="font-semibold text-gray-900">
                  Day {day.day_number}
                </h4>
              </div>
              <button
                onClick={() => removeDay(index)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            <Input
              placeholder="Day title"
              value={day.title}
              onChange={(e) => updateDay(index, 'title', e.target.value)}
            />

            <Textarea
              placeholder="Day description"
              rows={3}
              value={day.description}
              onChange={(e) => updateDay(index, 'description', e.target.value)}
            />
          </motion.div>
        ))}

        <Button
          type="button"
          variant="outline"
          icon={Plus}
          onClick={addDay}
          fullWidth
        >
          Add Day
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          fullWidth
        >
          Save Itinerary
        </Button>
      </div>
    </Card>
  );
};

export default ItineraryBuilder;