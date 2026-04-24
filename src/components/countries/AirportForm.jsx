import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plane, Plus, Trash2 } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Select from '../common/Select';
import Card from '../common/Card';
import toast from 'react-hot-toast';

const AirportForm = ({ countryId, onSuccess }) => {
  const [airports, setAirports] = useState([
    { name: '', code: '', location: '', airport_type: 'commercial', is_main_international: false }
  ]);

  const addAirport = () => {
    setAirports([
      ...airports,
      { name: '', code: '', location: '', airport_type: 'commercial', is_main_international: false }
    ]);
  };

  const removeAirport = (index) => {
    if (airports.length > 1) {
      setAirports(airports.filter((_, i) => i !== index));
      toast.success('Airport removed');
    }
  };

  const updateAirport = (index, field, value) => {
    const updated = [...airports];
    updated[index][field] = value;
    setAirports(updated);
  };

  const handleSave = () => {
    const validAirports = airports.filter(a => a.name && a.code);
    if (validAirports.length === 0) {
      toast.error('Add at least one airport');
      return;
    }
    onSuccess(validAirports);
    toast.success('Airports saved!');
  };

  return (
    <Card title="Airports" subtitle="Add airports in this country">
      <div className="space-y-4">
        {airports.map((airport, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gray-200 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-gray-400" />
                <h4 className="font-semibold text-gray-900">
                  Airport {index + 1}
                </h4>
              </div>
              <button
                onClick={() => removeAirport(index)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Airport Name"
                placeholder="e.g., Kigali International"
                value={airport.name}
                onChange={(e) => updateAirport(index, 'name', e.target.value)}
              />

              <Input
                label="Airport Code"
                placeholder="e.g., KGL"
                value={airport.code}
                onChange={(e) => updateAirport(index, 'code', e.target.value)}
              />
            </div>

            <Input
              label="Location"
              placeholder="e.g., Kigali"
              value={airport.location}
              onChange={(e) => updateAirport(index, 'location', e.target.value)}
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={airport.is_main_international}
                onChange={(e) => updateAirport(index, 'is_main_international', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600"
              />
              <label className="text-sm font-medium text-gray-700">
                Main International Airport
              </label>
            </div>
          </motion.div>
        ))}

        <Button
          type="button"
          variant="outline"
          icon={Plus}
          onClick={addAirport}
          fullWidth
        >
          Add Airport
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          fullWidth
        >
          Save Airports
        </Button>
      </div>
    </Card>
  );
};

export default AirportForm;