import { useForm, useFieldArray } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Select from '../common/Select';
import ImageUpload from '../common/ImageUpload';
import Card from '../common/Card';
import Tabs from '../common/Tabs';
import toast from 'react-hot-toast';
import { TEAM_DEPARTMENTS } from '@/utils/constants';

const TeamForm = ({ member = null, onSuccess }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, control } = useForm({
    defaultValues: member || {
      name: '',
      role: '',
      department: '',
      email: '',
      phone: '',
      whatsapp: '',
      bio: '',
      years_experience: 0,
      expertise: [],
      languages: [],
      certifications: [],
      linkedin_url: '',
      twitter_url: '',
      instagram_url: '',
      is_featured: false,
      is_active: true,
    },
  });

  const { fields: expertiseFields, append: appendExpertise, remove: removeExpertise } =
    useFieldArray({ control, name: 'expertise' });

  const { fields: languageFields, append: appendLanguage, remove: removeLanguage } =
    useFieldArray({ control, name: 'languages' });

  const { fields: certificationFields, append: appendCertification, remove: removeCertification } =
    useFieldArray({ control, name: 'certifications' });

  const onSubmit = (data) => {
    try {
      console.log('Team Member Data:', data);
      toast.success(member ? 'Team member updated!' : 'Team member added!');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to save team member');
    }
  };

  const tabs = [
    {
      label: 'Basic Info',
      content: (
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g., Jean Mutabazi"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Role"
              placeholder="e.g., Lead Safari Guide"
              error={errors.role?.message}
              {...register('role', { required: 'Role is required' })}
            />

            <Select
              label="Department"
              options={TEAM_DEPARTMENTS.map(d => ({ label: d, value: d }))}
              error={errors.department?.message}
              {...register('department')}
            />
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="jean@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone"
              placeholder="+250788123456"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="WhatsApp"
              placeholder="+250788123456"
              error={errors.whatsapp?.message}
              {...register('whatsapp')}
            />
          </div>

          <Textarea
            label="Bio"
            placeholder="Professional biography"
            rows={4}
            error={errors.bio?.message}
            {...register('bio')}
          />

          <Input
            label="Years of Experience"
            type="number"
            min="0"
            error={errors.years_experience?.message}
            {...register('years_experience', { 
              valueAsNumber: true,
              min: { value: 0, message: 'Must be 0 or greater' }
            })}
          />
        </div>
      ),
    },
    {
      label: 'Skills & Languages',
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expertise Areas
            </label>
            <div className="space-y-2">
              {expertiseFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="e.g., Wildlife Tracking"
                    {...register(`expertise.${index}.value`)}
                  />
                  <button
                    type="button"
                    onClick={() => removeExpertise(index)}
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
              onClick={() => appendExpertise({ value: '' })}
              className="mt-2"
            >
              Add Expertise
            </Button>
          </div>

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
              Certifications
            </label>
            <div className="space-y-2">
              {certificationFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="e.g., First Aid Certificate"
                    {...register(`certifications.${index}.value`)}
                  />
                  <button
                    type="button"
                    onClick={() => removeCertification(index)}
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
              onClick={() => appendCertification({ value: '' })}
              className="mt-2"
            >
              Add Certification
            </Button>
          </div>
        </div>
      ),
    },
    {
      label: 'Social & Links',
      content: (
        <div className="space-y-4">
          <Input
            label="LinkedIn URL"
            type="url"
            placeholder="https://linkedin.com/in/username"
            {...register('linkedin_url')}
          />

          <Input
            label="Twitter URL"
            type="url"
            placeholder="https://twitter.com/username"
            {...register('twitter_url')}
          />

          <Input
            label="Instagram URL"
            type="url"
            placeholder="https://instagram.com/username"
            {...register('instagram_url')}
          />
        </div>
      ),
    },
    {
      label: 'Photo',
      content: (
        <ImageUpload
          label="Profile Photo"
          multiple={false}
          onChange={(file) => setValue('image_url', file)}
        />
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
        <Button type="submit" loading={isSubmitting}>
          {member ? 'Update Member' : 'Add Member'}
        </Button>
      </div>
    </motion.form>
  );
};

export default TeamForm;