import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Plus, Trash2 } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Card from '../common/Card';
import toast from 'react-hot-toast';

const UNESCOForm = ({ countryId, onSuccess }) => {
  const [sites, setSites] = useState([
    { name: '', year_inscribed: new Date().getFullYear(), site_type: 'cultural', description: '' }
  ]);

  const siteTypes = ['cultural', 'natural', 'mixed'];

  const addSite = () => {
    setSites([
      ...sites,
      { name: '', year_inscribed: new Date().getFullYear(), site_type: 'cultural', description: '' }
    ]);
  };

  const removeSite = (index) => {
    if (sites.length > 1) {
      setSites(sites.filter((_, i) => i !== index));
      toast.success('UNESCO site removed');
    }
  };

  const updateSite = (index, field, value) => {
    const updated = [...sites];
    updated[index][field] = value;
    setSites(updated);
  };

  const handleSave = () => {
    const validSites = sites.filter(s => s.name && s.year_inscribed);
    if (validSites.length === 0) {
      toast.error('Add at least one UNESCO site');
      return;
    }
    onSuccess(validSites);
    toast.success('UNESCO sites saved!');
  };

  return (
    <Card title="UNESCO World Heritage Sites" subtitle="Add UNESCO protected sites">
      <div className="space-y-4">
        {sites.map((site, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gray-200 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-400" />
                <h4 className="font-semibold text-gray-900">
                  Site {index + 1}
                </h4>
              </div>
              <button
                onClick={() => removeSite(index)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            <Input
              label="Site Name"
              placeholder="e.g., Volcanoes National Park"
              value={site.name}
              onChange={(e) => updateSite(index, 'name', e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Year Inscribed"
                type="number"
                min="1972"
                max={new Date().getFullYear()}
                value={site.year_inscribed}
                onChange={(e) => updateSite(index, 'year_inscribed', parseInt(e.target.value))}
              />

              <select
                value={site.site_type}
                onChange={(e) => updateSite(index, 'site_type', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {siteTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <Textarea
              label="Description"
              placeholder="Describe the UNESCO site"
              rows={3}
              value={site.description}
              onChange={(e) => updateSite(index, 'description', e.target.value)}
            />
          </motion.div>
        ))}

        <Button
          type="button"
          variant="outline"
          icon={Plus}
          onClick={addSite}
          fullWidth
        >
          Add UNESCO Site
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          fullWidth
        >
          Save UNESCO Sites
        </Button>
      </div>
    </Card>
  );
};

export default UNESCOForm;