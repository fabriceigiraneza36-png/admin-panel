import { useForm, useFieldArray } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { useCountries, useCountry } from '@/hooks/useCountries';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Select from '../common/Select';
import ImageUpload from '../common/ImageUpload';
import Card from '../common/Card';
import Tabs from '../common/Tabs';
import toast from 'react-hot-toast';
import { CONTINENTS, DESTINATION_CATEGORIES } from '@/utils/constants';

const CountryForm = ({ countryId = null, onSuccess }) => {
  const { country, isLoading: isLoadingCountry } = useCountry(countryId);
  const { createCountry, updateCountry, isCreating, isUpdating } = useCountries();

  const { register, handleSubmit, formState: { errors }, setValue, watch, control } =
    useForm({
      defaultValues: country || {
        name: '',
        official_name: '',
        capital: '',
        continent: '',
        flag: '',
        description: '',
        full_description: '',
        languages: [],
        religions: [],
        is_featured: false,
        is_active: true,
      },
    });

  const { fields: languageFields, append: appendLanguage, remove: removeLanguage } =
    useFieldArray({ control, name: 'languages' });

  const { fields: religionFields, append: appendReligion, remove: removeReligion } =
    useFieldArray({ control, name: 'religions' });

  const onSubmit = async (data) => {
    try {
      if (countryId) {
        updateCountry({ id: countryId, data }, {
          onSuccess: () => {
            toast.success('Country updated successfully!');
            onSuccess?.();
          },
        });
      } else {
        createCountry(data, {
          onSuccess: () => {
            toast.success('Country created successfully!');
            onSuccess?.();
          },
        });
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const tabs = [
    {
      label: 'Basic Info',
      content: (
        <div className="space-y-4">
          <Input
            label="Country Name"
            placeholder="e.g., Rwanda"
            error={errors.name?.message}
            {...register('name', { required: 'Country name is required' })}
          />

          <Input
            label="Official Name"
            placeholder="e.g., Republic of Rwanda"
            error={errors.official_name?.message}
            {...register('official_name')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Capital"
              placeholder="e.g., Kigali"
              error={errors.capital?.message}
              {...register('capital')}
            />

            <Input
              label="Flag Emoji"
              placeholder="e.g., 🇷🇼"
              error={errors.flag?.message}
              {...register('flag')}
            />
          </div>

          <Select
            label="Continent"
            options={CONTINENTS.map(c => ({ label: c, value: c }))}
            error={errors.continent?.message}
            {...register('continent', { required: 'Please select a continent' })}
          />
        </div>
      ),
    },
    {
      label: 'Description',
      content: (
        <div className="space-y-4">
          <Textarea
            label="Short Description"
            placeholder="Brief description of the country"
            rows={3}
            error={errors.description?.message}
            {...register('description')}
          />

          <Textarea
            label="Full Description"
            placeholder="Detailed description with HTML/Markdown"
            rows={6}
            error={errors.full_description?.message}
            {...register('full_description')}
          />
        </div>
      ),
    },
    {
      label: 'Languages & Cultures',
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Languages
            </label>
            <div className="space-y-2">
              {languageFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="e.g., English"
                    {...register(`languages.${index}.value`)}
                  />
                  <button
                    type="button"
                    onClick={() => removeLanguage(index)}
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
              onClick={() => appendLanguage({ value: '' })}
              className="mt-2"
            >
              Add Language
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Religions
            </label>
            <div className="space-y-2">
              {religionFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="e.g., Christianity"
                    {...register(`religions.${index}.value`)}
                  />
                  <button
                    type="button"
                    onClick={() => removeReligion(index)}
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
              onClick={() => appendReligion({ value: '' })}
              className="mt-2"
            >
              Add Religion
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
            label="Cover Image"
            multiple={false}
            onChange={(file) => setValue('cover_image_url', file)}
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
        <Button
          type="submit"
          loading={isCreating || isUpdating}
        >
          {countryId ? 'Update Country' : 'Create Country'}
        </Button>
      </div>
    </motion.form>
  );
};

export default CountryForm;