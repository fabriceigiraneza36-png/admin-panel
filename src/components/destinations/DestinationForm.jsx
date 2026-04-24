import { useForm, useFieldArray } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Select from '../common/Select';
import RichTextEditor from '../common/RichTextEditor';
import ImageUpload from '../common/ImageUpload';
import Card from '../common/Card';
import Tabs from '../common/Tabs';
import toast from 'react-hot-toast';
import { DESTINATION_CATEGORIES, DESTINATION_DIFFICULTIES } from '@/utils/constants';

const DestinationForm = ({ destination = null, onSuccess }) => {
  const { register, handleSubmit, formState: { errors }, setValue, watch, control } =
    useForm({
      defaultValues: destination || {
        name: '',
        country_id: '',
        category: '',
        difficulty: '',
        duration_days: 1,
        highlights: [],
        activities: [],
        status: 'draft',
        is_featured: false,
      },
    });

  const { fields: highlightFields, append: appendHighlight, remove: removeHighlight } =
    useFieldArray({ control, name: 'highlights' });

  const { fields: activityFields, append: appendActivity, remove: removeActivity } =
    useFieldArray({ control, name: 'activities' });

  const onSubmit = (data) => {
    try {
      console.log('Form Data:', data);
      toast.success(destination ? 'Destination updated!' : 'Destination created!');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to save destination');
    }
  };

  const tabs = [
    {
      label: 'Basic Info',
      content: (
        <div className="space-y-4">
          <Input
            label="Destination Name"
            placeholder="e.g., Volcanoes National Park"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              options={DESTINATION_CATEGORIES.map(c => ({ label: c, value: c }))}
              error={errors.category?.message}
              {...register('category', { required: 'Category is required' })}
            />

            <Select
              label="Difficulty"
              options={DESTINATION_DIFFICULTIES.map(d => ({ label: d, value: d }))}
              error={errors.difficulty?.message}
              {...register('difficulty')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Duration (Days)"
              type="number"
              min="1"
              error={errors.duration_days?.message}
              {...register('duration_days', { 
                required: 'Duration is required',
                min: { value: 1, message: 'Minimum 1 day' }
              })}
            />
          </div>

          <Textarea
            label="Short Description"
            placeholder="Brief description of the destination"
            rows={3}
            error={errors.short_description?.message}
            {...register('short_description')}
          />
        </div>
      ),
    },
    {
      label: 'Details',
      content: (
        <div className="space-y-4">
          <RichTextEditor
            label="Full Description"
            value={watch('description')}
            onChange={(value) => setValue('description', value)}
          />

          <Textarea
            label="What to Expect"
            placeholder="Describe what visitors should expect"
            rows={4}
            {...register('what_to_expect')}
          />

          <Textarea
            label="Getting There"
            placeholder="Travel directions and transportation info"
            rows={3}
            {...register('getting_there')}
          />
        </div>
      ),
    },
    {
      label: 'Highlights & Activities',
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Highlights
            </label>
            <div className="space-y-2">
              {highlightFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="e.g., Mountain Gorillas"
                    {...register(`highlights.${index}.value`)}
                  />
                  <button
                    type="button"
                    onClick={() => removeHighlight(index)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => appendHighlight({ value: '' })}
              className="mt-2"
            >
              Add Highlight
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activities
            </label>
            <div className="space-y-2">
              {activityFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="e.g., Hiking"
                    {...register(`activities.${index}.value`)}
                  />
                  <button
                    type="button"
                    onClick={() => removeActivity(index)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => appendActivity({ value: '' })}
              className="mt-2"
            >
              Add Activity
            </Button>
          </div>
        </div>
      ),
    },
    {
      label: 'Images',
      content: (
        <div className="space-y-4">
          <ImageUpload
            label="Main Image"
            multiple={false}
            onChange={(file) => setValue('image_url', file)}
          />
        </div>
      ),
    },
  ];

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <Card>
        <Tabs tabs={tabs} />
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary">Cancel</Button>
        <Button type="submit">
          {destination ? 'Update Destination' : 'Create Destination'}
        </Button>
      </div>
    </motion.form>
  );
};

export default DestinationForm;